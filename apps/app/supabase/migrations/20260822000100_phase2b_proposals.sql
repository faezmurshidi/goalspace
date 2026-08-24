--
-- Phase 2b: the proposal is the only way an agent changes anything.
--
-- Every write tool inserts here and nowhere else. Acceptance is what produces
-- a real row, and it is always a human action.

-- agent_runs needs a composite uniqueness contract before proposals can point
-- at (run, project) as a pair. agents already carries one from phase 2a.
alter table agent_runs add constraint agent_runs_id_project_key unique (id, project_id);

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid not null,
  run_id      uuid not null,

  kind        text not null check (kind in ('entry','work_item','document_edit')),

  -- The document being edited, for kind = 'document_edit'. Null otherwise.
  target_id   uuid,

  payload     jsonb not null,
  rationale   text not null,

  -- [{ "type": "entry" | "work_item" | "document", "id": uuid }, ...]
  -- Validated against the project before the row is stored (§6.3), so a
  -- citation in here is known to have resolved at least once.
  citations   jsonb not null default '[]',

  status      text not null default 'pending'
              check (status in ('pending','accepted','rejected','superseded')),

  -- True when the owner changed the payload before accepting. Worth recording:
  -- an accepted-as-written proposal and an accepted-after-rewrite proposal say
  -- very different things about the agent.
  edited      boolean not null default false,

  -- The row created or updated on acceptance. Deliberately carries no foreign
  -- key: its target table varies by kind.
  applied_id  uuid,

  created_at  timestamptz not null default now(),
  decided_at  timestamptz,

  -- Composite, not simple, foreign keys.
  --
  -- Pointing agent_id at agents(id) alone proves only that the agent exists.
  -- The owner of two projects could then file a proposal in one and attribute
  -- it to an agent or run belonging to the other — RLS would allow it, because
  -- both rows are theirs. Matching on (id, project_id) makes provenance and
  -- scope agree at the database, which is the only place it cannot be
  -- forgotten.
  foreign key (agent_id, project_id) references agents(id, project_id) on delete cascade,
  foreign key (run_id, project_id) references agent_runs(id, project_id) on delete cascade
);

-- The inbox reads pending proposals for one project, newest first.
create index proposals_project_status_idx on proposals (project_id, status, created_at desc);
-- The run trace reads every proposal a run produced.
create index proposals_run_idx on proposals (run_id, created_at);
-- Every policy below filters on owner_id, so every read pays for this index.
-- Without it RLS degrades to a scan as the table grows.
create index proposals_owner_idx on proposals (owner_id);

alter table proposals enable row level security;

-- Owner-only, with no public branch — the same regime as the rest of the
-- agent layer and for the same reason. A published project publishes entries
-- and documents; it must not publish the suggestions that were rejected, nor
-- the rationale behind the ones that were not.
--
-- Insert and update additionally require the row's project to belong to the
-- caller, so ownership cannot be forged by relocating a row into someone
-- else's project. Written out longhand: you cannot grep for a policy that
-- exists only as a format string.

create policy proposals_select on proposals for select
  using (owner_id = auth.uid());
create policy proposals_insert on proposals for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = proposals.project_id and p.owner_id = auth.uid()));
create policy proposals_update on proposals for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = proposals.project_id and p.owner_id = auth.uid()));
create policy proposals_delete on proposals for delete
  using (owner_id = auth.uid());

/**
 * Apply a document edit: check the version, keep the old body, write the new
 * one — as one transaction.
 *
 * Doing this as three round trips from the application cannot be made correct,
 * only differently wrong. Writing the revision first can leave a revision for
 * an edit that then lost the version check; writing it second can lose the
 * previous body entirely if the insert fails. Under a row lock both problems
 * disappear: the loser blocks, wakes to a version that no longer matches, and
 * returns without having written anything.
 *
 * SECURITY INVOKER, as everywhere else in this schema, so RLS applies to both
 * tables the function touches.
 *
 * p_expected_updated_at may be null, which skips the version check. That is
 * the shape a first-party edit takes when nothing was read beforehand.
 *
 * Returns the document id, or null when the document is gone or has moved.
 */
create function apply_document_edit(
  p_document_id         uuid,
  p_project_id          uuid,
  p_owner_id            uuid,
  p_agent_id            uuid,
  p_expected_updated_at timestamptz,
  p_title               text,
  p_body                text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.documents%rowtype;
begin
  -- The lock is the whole mechanism. A concurrent edit waits here rather than
  -- racing ahead to insert a revision it will not earn.
  select * into v_current
    from public.documents
   where id = p_document_id and project_id = p_project_id
     for update;

  if not found then return null; end if;

  if p_expected_updated_at is not null and v_current.updated_at <> p_expected_updated_at then
    return null;
  end if;

  insert into public.document_revisions (document_id, project_id, owner_id, title, body)
  values (v_current.id, p_project_id, p_owner_id, v_current.title, v_current.body);

  update public.documents
     set title      = coalesce(p_title, title),
         body       = coalesce(p_body, body),
         agent_id   = p_agent_id,
         updated_at = now()
   where id = p_document_id;

  return p_document_id;
end;
$$;

comment on function apply_document_edit(uuid, uuid, uuid, uuid, timestamptz, text, text) is
  'Version-checked document update that records the replaced body as a revision, under a row lock so concurrent edits cannot both write.';

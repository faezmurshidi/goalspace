--
-- Phase 2b: the proposal is the only way an agent changes anything.
--
-- Every write tool inserts here and nowhere else. Acceptance is what produces
-- a real row, and it is always a human action.

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid not null references agents(id) on delete cascade,
  run_id      uuid not null references agent_runs(id) on delete cascade,
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
  decided_at  timestamptz
);

-- The inbox reads pending proposals for one project, newest first.
create index proposals_project_status_idx on proposals (project_id, status, created_at desc);
-- The run trace reads every proposal a run produced.
create index proposals_run_idx on proposals (run_id, created_at);

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

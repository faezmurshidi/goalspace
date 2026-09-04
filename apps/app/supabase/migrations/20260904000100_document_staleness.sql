-- How far through the log a document has read.
--
-- A generated document that silently falls behind is worse than no document,
-- because it still looks like an answer — the failure PRODUCT.md names as the
-- reason this product exists. The mark is what lets the page say so.
--
-- Nullable, and null means hand-written. A document the owner typed never
-- claimed to synthesise the record, so it has nothing to be behind and must
-- never nag. That is why there is no default and no backfill: a mark invented
-- for an existing document would be a claim nobody made.
alter table documents add column synthesised_through timestamptz;

comment on column documents.synthesised_through is
  'occurred_at of the newest log entry this document was written from. Null '
  'means hand-written: it never claimed to synthesise anything.';

-- Replaces apply_proposal whole, per the precedent 20260827000100 set: a
-- `create or replace` of a plpgsql body is all-or-nothing, and so is reading
-- one. Everything below is the body from 20260903000800_apply_proposal_hardening.sql,
-- unchanged, plus the v_synth declaration and the block that stamps the mark.
create or replace function apply_proposal(
  p_proposal_id uuid,
  p_payload     jsonb,
  p_edited      boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_proposal public.proposals%rowtype;
  v_document public.documents%rowtype;
  v_base     timestamptz;
  v_applied  uuid;
  v_edited   boolean;
  v_synth    timestamptz;
begin
  -- The lock is what replaces the conditional claim. A second tab accepting
  -- the same proposal waits here, then reads status = 'accepted' and leaves.
  select * into v_proposal
    from public.proposals
   where id = p_proposal_id
     for update;

  -- Invisible under RLS and already decided are the same answer to the caller:
  -- there is nothing here to accept. Distinguishing them would tell someone
  -- whether a proposal they cannot read exists.
  if not found or v_proposal.status <> 'pending' then
    return jsonb_build_object('status', 'gone');
  end if;

  -- Trusted only to say "yes, I changed it". The comparison is what makes the
  -- absence of that claim mean anything.
  v_edited := coalesce(p_edited, false)
              or p_payload is distinct from v_proposal.payload;

  if v_proposal.kind = 'entry' then
    insert into public.entries
      (project_id, owner_id, agent_id, kind, title, body, work_item_id, occurred_at)
    values (
      v_proposal.project_id,
      v_proposal.owner_id,
      -- Provenance comes from the proposal, never from the payload: the owner
      -- edits content in the inbox, not authorship.
      v_proposal.agent_id,
      p_payload->>'kind',
      p_payload->>'title',
      p_payload->>'body',
      (p_payload->>'work_item_id')::uuid,
      -- Absent means now, on the database clock — the column default, spelled
      -- out because a value must be supplied positionally here.
      coalesce((p_payload->>'occurred_at')::timestamptz, now())
    )
    returning id into v_applied;

  elsif v_proposal.kind = 'work_item' then
    -- Serialises every accept in this project against every other, which is
    -- what the max() below needs and what locking the proposal row does not
    -- give: two accepts hold two different proposal locks.
    perform pg_advisory_xact_lock(hashtext(v_proposal.project_id::text));

    insert into public.work_items
      (project_id, owner_id, agent_id, title, body, kind, parent_id, wake_at, order_index)
    values (
      v_proposal.project_id,
      v_proposal.owner_id,
      v_proposal.agent_id,
      p_payload->>'title',
      coalesce(p_payload->>'body', ''),
      p_payload->>'kind',
      (p_payload->>'parent_id')::uuid,
      (p_payload->>'wake_at')::timestamptz,
      -- New siblings go last. Safe under the advisory lock above, and only
      -- under it.
      (select coalesce(max(order_index), -1) + 1
         from public.work_items
        where project_id = v_proposal.project_id)
    )
    returning id into v_applied;

  elsif v_proposal.kind = 'document' then
    -- A create cannot be superseded: there is no prior version to be stale
    -- against. No read, no version check, no null return.
    insert into public.documents (project_id, owner_id, agent_id, title, body)
    values (
      v_proposal.project_id,
      v_proposal.owner_id,
      v_proposal.agent_id,
      p_payload->>'title',
      coalesce(p_payload->>'body', '')
    )
    returning id into v_applied;

  else
    -- document_edit. Two checks, both of which used to live in TypeScript.
    select * into v_document
      from public.documents
     where id = (p_payload->>'id')::uuid
       and project_id = v_proposal.project_id
       for update;

    if not found then
      update public.proposals
         set status = 'superseded', decided_at = now()
       where id = v_proposal.id;
      return jsonb_build_object('status', 'superseded');
    end if;

    v_base := (p_payload->>'base_updated_at')::timestamptz;

    -- Compared as instants, not as text. Postgres renders timestamptz as
    -- `2026-08-21 00:00:00+00` while the payload carries an ISO string with a
    -- `Z`; comparing those as strings marks every edit stale.
    if v_document.updated_at > v_base then
      update public.proposals
         set status = 'superseded', decided_at = now()
       where id = v_proposal.id;
      return jsonb_build_object('status', 'superseded');
    end if;

    -- The row is already locked above, so the version cannot move underneath
    -- this call. apply_document_edit writes the revision before the update,
    -- which is where an agent's edit gets its undo path.
    v_applied := public.apply_document_edit(
      v_document.id,
      v_proposal.project_id,
      v_proposal.owner_id,
      v_proposal.agent_id,
      v_document.updated_at,
      p_payload->>'title',
      p_payload->>'body'
    );

    if v_applied is null then
      update public.proposals
         set status = 'superseded', decided_at = now()
       where id = v_proposal.id;
      return jsonb_build_object('status', 'superseded');
    end if;
  end if;

  if v_proposal.kind in ('document', 'document_edit') then
    -- Only entry citations count. A citation may name a work item or another
    -- document and neither has an occurred_at; the mark means "how far through
    -- the log", so only the log can move it.
    --
    -- Scoped to this project as well as to the id. That scoping is a real
    -- check, not a formality: nothing below the application enforces the
    -- shape of a citation. `proposals.citations` is jsonb with no CHECK
    -- constraint, and the insert policy verifies ownership, not content, so a
    -- direct PostgREST insert can store a citation naming any id at all,
    -- including one from another project.
    --
    -- Compared as text rather than cast to uuid, because a cast raises on a
    -- non-uuid string, and that raise would abort the whole accept inside
    -- this transaction — a proposal stored with a malformed id would become
    -- permanently unacceptable rather than simply uncited. lower() matters
    -- because Postgres renders uuid as lowercase canonical text while the
    -- application's schema accepts uppercase hex; without it, a citation
    -- stored in uppercase would silently fail to match and the mark would
    -- come back null instead of stamped.
    select max(e.occurred_at) into v_synth
      from jsonb_array_elements(v_proposal.citations) as c
      join public.entries e
        on e.id::text = lower(c->>'id')
       and e.project_id = v_proposal.project_id
     where c->>'type' = 'entry';

    -- greatest() ignores nulls in Postgres, which is the behaviour wanted
    -- twice over: a regeneration citing nothing keeps the mark it had, and one
    -- citing only older entries does not drag it backwards. A document has not
    -- un-read what a previous version of it already read.
    update public.documents
       set synthesised_through = greatest(synthesised_through, v_synth)
     where id = v_applied;
  end if;

  update public.proposals
     set status     = 'accepted',
         applied_id = v_applied,
         edited     = v_edited,
         decided_at = now()
   where id = v_proposal.id;

  return jsonb_build_object('status', 'applied', 'applied_id', v_applied);
end;
$$;

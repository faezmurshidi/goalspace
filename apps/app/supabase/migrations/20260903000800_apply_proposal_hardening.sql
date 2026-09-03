-- Two corrections to apply_proposal, both raised in review on #28.
--
-- Replaced whole rather than patched: `create or replace` of a plpgsql body is
-- all-or-nothing, and the same is true of reading one. The signature is
-- unchanged, so nothing calling it has to move.
--
-- 1. order_index allocation is now serialised per project.
--
-- The previous version computed `max(order_index) + 1` inside the transaction
-- and its comment claimed that closed the lost update the TypeScript version
-- had. It did not, and the comment was the worse half of the mistake. Two
-- accepts lock two *different* proposal rows, so they never contend: both read
-- the same maximum and both insert it. There is no unique constraint on
-- (project_id, order_index) to catch it either, so the result is two work items
-- claiming one position and a tree that orders them arbitrarily.
--
-- An advisory lock keyed on the project is what actually serialises them. It is
-- transaction-scoped, so it releases on commit or rollback with no unlock path
-- to forget. Keyed by hashtext, so two projects can collide and serialise
-- against each other unnecessarily — that costs a little concurrency on an
-- operation a human performs by hand, and never costs correctness.
--
-- A unique constraint plus retry was the alternative. Rejected: it would need
-- backfilling over rows that already collide, and it turns a routine accept
-- into a loop that can fail.
--
-- 2. `edited` can no longer under-report.
--
-- It was taken from the caller. The application derives it honestly, but the
-- grant is to `authenticated`, so a client can call this directly with an
-- altered payload and edited = false — storing its own words in the record
-- marked as the agent's. Whether an owner would deceive their own record is
-- beside the point: `edited` exists so the record can say who wrote what, and a
-- field that can be made to lie does not say anything.
--
-- Or-ed rather than replaced, so the flag is monotonic: a caller can still
-- volunteer that it edited, and the comparison catches it when it does not.
-- The payload stored at propose time is already the output of the same zod
-- schema the caller parses through, so an untouched payload compares equal and
-- this cannot fire spuriously — and if it ever did, it would over-report the
-- owner's involvement, which is the harmless direction.
--
-- Deliberately not added: validation of p_payload's shape inside this function.
-- A direct RPC call bypasses zod, but it grants nothing — RLS confines the
-- caller to their own project, where they can already insert any row they like
-- through PostgREST, and the column constraints (NOT NULL, the kind CHECKs)
-- still reject anything the schema would have. Provenance is the part that
-- would matter, and it is not taken from the payload: agent_id, owner_id and
-- project_id all come from the locked proposal row.
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

  update public.proposals
     set status     = 'accepted',
         applied_id = v_applied,
         edited     = v_edited,
         decided_at = now()
   where id = v_proposal.id;

  return jsonb_build_object('status', 'applied', 'applied_id', v_applied);
end;
$$;

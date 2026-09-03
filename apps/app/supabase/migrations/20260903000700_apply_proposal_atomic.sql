-- Accepting a proposal becomes one statement.
--
-- It was four round trips: claim the proposal, insert the row, settle the
-- proposal, and release the claim if anything threw. Between the second and the
-- third there is a window with no transaction around it. A connection lost
-- there leaves the created row in place while the release puts the proposal
-- back in the inbox as pending, and the owner — who sees a suggestion that
-- looks undecided — accepts it again and gets a second entry. Nothing in the
-- schema links applied_id to the row it names, so nothing detects the
-- duplicate afterwards either.
--
-- The window is small and the damage is recoverable, which is why it survived
-- three phases. It is closed now because a fourth proposal kind was about to
-- inherit it, and because the fix removes code rather than adding it: the claim
-- guard, the release path, and the TypeScript staleness comparison all collapse
-- into the lock this function takes.
--
-- security invoker, like apply_document_edit: every statement here runs as the
-- caller and is checked by the same RLS policies their direct writes are. A
-- definer function would have to re-implement ownership checks that already
-- exist, which is the way that mistake usually gets made.
--
-- The payload arrives already validated — the caller parses it through the same
-- zod schema the human form posts through, including the owner's inbox edits.
-- This function maps validated JSON onto columns and does not second-guess it.
create function apply_proposal(
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
      -- New siblings go last.
      --
      -- NOTE: this claimed to close the lost update the TypeScript version had.
      -- It does not — two accepts lock two different proposal rows, so they
      -- never contend and both read the same maximum. Corrected in
      -- 20260903000800, which serialises this per project. Left standing rather
      -- than edited: the migration has run, and a comment rewritten after the
      -- fact would hide that the reasoning was wrong at the time.
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
    -- `Z`; comparing those as strings marks every edit stale. Casting to
    -- timestamptz is what makes the two comparable, and is the reason this
    -- check is safe to move out of TypeScript.
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
         edited     = p_edited,
         decided_at = now()
   where id = v_proposal.id;

  return jsonb_build_object('status', 'applied', 'applied_id', v_applied);
end;
$$;

comment on function apply_proposal(uuid, jsonb, boolean) is
  'Accept a proposal and produce the real row, in one transaction. Returns '
  '{status: applied|superseded|gone} with applied_id when applied. The row it '
  'creates and the proposal it settles can no longer disagree.';

-- anon is revoked explicitly, not just via PUBLIC. Supabase grants EXECUTE on
-- a newly created public function to anon and authenticated directly, and a
-- revoke from PUBLIC does not remove a direct grant — so the obvious two lines
-- leave anon still able to call it, which is what checking rather than assuming
-- turned up here.
--
-- Nothing was exposed either way: the function is security invoker, so an anon
-- caller runs under RLS with no visible proposal and gets 'gone'. The revoke is
-- for the reason every layer of this is: the boundary should be true, not
-- merely unreachable.
--
-- The project's other functions still carry the default anon grant. Same
-- reasoning applies to them and it is worth a sweep, but not inside a migration
-- named for one function.
revoke all on function apply_proposal(uuid, jsonb, boolean) from public, anon;
grant execute on function apply_proposal(uuid, jsonb, boolean) to authenticated;

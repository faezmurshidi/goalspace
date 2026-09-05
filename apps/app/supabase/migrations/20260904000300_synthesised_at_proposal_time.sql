-- synthesised_at was stamped with now() at accept time, but the reading it
-- records happened during the agent run, and the proposal then sits in the
-- owner's inbox — possibly for days — before it is accepted. An entry created
-- in that window is invisible to the created_at half of stale_entry_counts'
-- predicate: propose Sunday 10:00 citing entries through Saturday 18:00; the
-- owner writes up Saturday morning at Sunday 14:00 (occurred_at Sat 09:00,
-- created_at Sun 14:00); accept Monday 09:00. Neither condition fires, and a
-- document that never read that entry reports as current — the same failure
-- 20260904000200 exists to close, in a new costume.
--
-- The proposal's own created_at is the conservative choice: it is strictly
-- earlier than the accept that used to stand in for it, so this can only ever
-- count more entries, never fewer. And it cannot count an entry the document
-- genuinely read, because the reading finished before the proposal row
-- existed — proposals.created_at is not null default now(), stamped at
-- propose time, always before the accept that reads it here.
--
-- Replaces apply_proposal whole, per the precedent 20260827000100 set: a
-- `create or replace` of a plpgsql body is all-or-nothing, and so is reading
-- one. Everything below is the body from 20260904000200_synthesised_at.sql,
-- unchanged, except the stamping block at the end, which now uses the
-- proposal's created_at instead of now().
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
    --
    -- The same totality applies one level up: jsonb_array_elements raises on
    -- anything that is not a JSON array, including '[]'::jsonb's neighbours
    -- 'null'::jsonb and a bare object. citations is jsonb not null with no
    -- CHECK constraint, so a malformed container is exactly as reachable as a
    -- malformed element, and would abort the accept the same way a cast
    -- would — the failure mode the guard on the element already exists to
    -- prevent.
    select max(e.occurred_at) into v_synth
      from jsonb_array_elements(
             case when jsonb_typeof(v_proposal.citations) = 'array'
                  then v_proposal.citations else '[]'::jsonb end) as c
      join public.entries e
        on e.id::text = lower(c->>'id')
       and e.project_id = v_proposal.project_id
     where c->>'type' = 'entry';

    -- Both marks move, or neither does. A proposal citing nothing did not
    -- synthesise, and advancing synthesised_at for it would claim the document
    -- had read everything up to now — hiding every entry written before this
    -- moment, which is the same bug this migration exists to fix.
    --
    -- greatest() on both, so neither retreats: a regeneration citing only
    -- older entries does not shorten the reach, and cannot move the reading
    -- time backwards either.
    if v_synth is not null then
      update public.documents
         set synthesised_through = greatest(synthesised_through, v_synth),
             synthesised_at      = greatest(synthesised_at, v_proposal.created_at)
       where id = v_applied;
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

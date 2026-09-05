-- When the document did its reading, beside how far the reading reached.
--
-- One timestamp could not answer both questions, and treating it as though it
-- could is the gap spec 8.1 records. An entry written up on Monday and dated
-- Saturday, against a document generated Sunday whose reach ends Saturday
-- evening, is invisible to a comparison on occurred_at alone. The document has
-- never read it. The page said the document was current.
--
-- Nullable, like its sibling, and for the same reason: a document that never
-- claimed to synthesise has nothing to record. Rows stamped by 20260904000100
-- carry a reach and no reading time — genuinely unknown, not worth inventing —
-- and the count degrades for them to what it was before this migration, which
-- is the honest answer. They heal on the next regeneration.
alter table documents add column synthesised_at timestamptz;

comment on column documents.synthesised_at is
  'When this document was last synthesised from the log. Null means hand-'
  'written, or stamped before the column existed.';

-- The count, where the marks are.
--
-- It was a fetch of the project's entry timestamps and a pure function over
-- them. Two things made that wrong at once: PostgREST caps a response at 1000
-- rows, so a project further than 1000 entries past a mark reported 1000 as
-- though it were exact; and the predicate now needs two timestamps per entry,
-- doubling a payload that already had a ceiling. Counting here has no ceiling
-- and no payload.
--
-- security invoker, so the caller's RLS decides which documents and which
-- entries are theirs. A definer function would have to re-derive ownership
-- that the policies already express.
--
-- Only marked documents appear. A hand-written one is absent rather than zero:
-- absent means it never claimed to synthesise, zero means it claimed and is
-- current, and the pages render them alike for different reasons.
create function stale_entry_counts(p_project_id uuid)
returns table (document_id uuid, entries_since bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id,
         count(e.id)
    from public.documents d
    left join public.entries e
      on e.project_id = d.project_id
     -- Past either mark: it happened after the document's reach, or it was
     -- written down after the document did its reading. An entry past both is
     -- one row and counts once — the OR is inside the join, not two joins.
     and (e.occurred_at > d.synthesised_through
          or (d.synthesised_at is not null and e.created_at > d.synthesised_at))
   where d.project_id = p_project_id
     and d.synthesised_through is not null
   group by d.id;
$$;

comment on function stale_entry_counts(uuid) is
  'Per marked document, how many log entries it has not read. Counts an entry '
  'past either mark. Hand-written documents are absent, not zero.';

revoke all on function stale_entry_counts(uuid) from public, anon;
grant execute on function stale_entry_counts(uuid) to authenticated;

-- Replaces apply_proposal whole, per the precedent 20260827000100 set: a
-- `create or replace` of a plpgsql body is all-or-nothing, and so is reading
-- one. Everything below is the body from 20260904000100_document_staleness.sql,
-- unchanged, except the stamping block at the end, which now writes both marks.
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
             synthesised_at      = greatest(synthesised_at, now())
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

-- A document is a thing an agent can propose, not only a thing it can edit.
--
-- proposals.kind was constrained to entry, work_item and document_edit, which
-- is why phase 2b's agents could rewrite a document that exists and could not
-- bring one into being. The type widened in the same slice; without this the
-- database refuses the row and the tool fails at its last step.
--
-- Dropped and recreated rather than widened in place: Postgres has no ALTER
-- CONSTRAINT for a CHECK. The name is the one Postgres generated for the
-- inline check in 20260822000100_phase2b_proposals.sql.
alter table proposals drop constraint proposals_kind_check;

alter table proposals add constraint proposals_kind_check
  check (kind in ('entry', 'work_item', 'document', 'document_edit'));

-- Grant propose_document to Tutors seeded before the tool existed.
--
-- Same reasoning as 20260902000200: a live agent's allowlist is a stored
-- array, so an agent created before this migration would keep the tools it was
-- seeded with and be unable to do what its role description now claims.
--
-- Scoped to agents already holding propose_document_edit, which is the marker
-- of an agent seeded as a Tutor rather than one an owner has narrowed. An owner
-- who stripped a Tutor back to reading keeps their choice, and no other seeded
-- agent matches: the Critic proposes nothing, the Planner holds
-- propose_work_item only, the Partner records rather than proposes, and the
-- Interviewer's allowlist is empty.
--
-- propose_document writes to proposals and nowhere else, so this widens what
-- an agent may ask for, never what it may change.
update public.agents
set tools = array_append(tools, 'propose_document')
where 'propose_document_edit' = any (tools)
  and not ('propose_document' = any (tools));

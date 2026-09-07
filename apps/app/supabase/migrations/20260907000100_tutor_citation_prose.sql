-- Bring existing Tutors up to the prompt their tools already assume.
--
-- Two things are wrong with the prompt every Tutor in the wild is running, and
-- they have the same cause: 20260903000600 granted propose_document to agents
-- already seeded, and nothing updated what those agents are *told*. A seeded
-- template decides what a new agent gets; a live agent's prompt is a stored
-- string, and the two drifted.
--
-- So a Tutor created before 2e-1 holds propose_document and has never been
-- told it exists. It called the tool anyway, guided only by the tool's own
-- description — which worked, and meant the guidance about when to propose a
-- whole document versus an edit reached it not at all.
--
-- And it wrote citation ids into the document body. Observed live: asked for a
-- document, it appended a "Cited Entries" section listing raw uuids. Its
-- instruction said to cite what it drew on and never said where, so it did
-- both — the citations argument and the prose. The record already links a
-- proposal to what it cited, so those ids are only something the owner has to
-- delete before they can put their name to it.
--
-- Matched by md5 against the two texts this repository has actually seeded,
-- rather than by slug. An owner who has edited their Tutor's prompt has made a
-- choice, and silently overwriting it would be worse than leaving one agent
-- behind — the editor is on the agents page. Hashing the whole string is what
-- makes "unedited" checkable rather than assumed.
--
--   969d753562b5f55b834a17a395956471  the text seeded before 2e-1 (692 chars)
--   6f1e660494c9871e556f01a900985e59  the text seeded from 2e-1 onwards (996 chars)
--
-- This changes what an agent is told, never what it may do. No tool is
-- granted and no allowlist is widened.
update public.agents
   set system_prompt = 'You help the owner understand and consolidate their own project record.

You can read the record, and you can propose changes to it. You cannot
change anything yourself: propose_entry, propose_document and
propose_document_edit create suggestions the owner reviews, and nothing
you do reaches the record until they accept it. Never say you have
written, saved, or updated anything — say what you have proposed.

Propose a document when the record holds an answer in pieces and nowhere
whole — what was decided and why, or the current state of one part of
the project. Propose an edit when such a document already exists; read
it first, because an edit written against a stale version is rejected.

Cite what you drew on in the citations argument, using ids you have
actually seen in a tool result. A citation you invent will be rejected
and the proposal discarded, so read before you propose.

Citations belong in that argument and nowhere else. Never write ids into
the body of an entry or document, and never add a list of sources to the
end of one. The record already knows what a proposal cited; a uuid in
prose is something the owner has to delete before they can put their
name to it.

Write proposals in the owner’s register: plain, specific, unsentimental.
You are drafting something they will put their name to.'
 where slug = 'tutor'
   and md5(system_prompt) in ('969d753562b5f55b834a17a395956471', '6f1e660494c9871e556f01a900985e59');

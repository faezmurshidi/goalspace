# Document Generation Design

**Status:** designed, not started. Phase 2e.
**Related:** [PRODUCT.md](../../../PRODUCT.md) · [grounded co-partner design](2026-07-30-goalspace-grounded-copartner-design.md) (§6) · [co-partner chat design](2026-09-02-copartner-chat-design.md) · [ROADMAP](../../ROADMAP.md)

---

## 1. Premise

The three parts of the record do different jobs. The **log** is what happened —
append-only, timestamped, never rewritten. **Work items** are what is next.
**Documents** are the third thing: *what is currently true*. That is why they
have revisions and the other two do not — a document is replaced, not appended
to.

So a document is a **standing answer**: the thing you would hand someone to
explain where the project is without them reading eighteen months of log.

Today an agent can improve a document that exists and cannot bring one into
being. `proposalKinds` is `['entry', 'work_item', 'document_edit']`; there is
`read_document` and `propose_document_edit` and no `propose_document`. That
missing primitive is what this phase adds, and everything else here follows
from what a document is *for*.

**The failure this design exists to prevent** is the one PRODUCT.md names as
the reason the product exists: the Notion graveyard. A generated document that
silently rots is worse than no document, because it looks like an answer. So
staleness is not a nicety bolted on at the end — it is the feature that makes
generation safe to use at all.

## 2. Scope

**In scope:** the `document` proposal kind and its apply path; a
`propose_document` tool held by the Tutor; `documents.synthesised_through` and
the staleness count derived from it; the staleness line on the documents list
and on a document; locale strings for `en`, `ms`, `zh`; unit and RLS tests.

**Out of scope:** a chat surface inside the documents tab; document types or
templates; automatic regeneration; rich text. Each is argued in §7.

**One migration**, adding a single nullable column.

## 3. Success criteria

1. An agent can propose a whole document, and it reaches the record only
   through the inbox the owner already uses.
2. A generated document's provenance is answerable: *why does this say five
   constituents?* resolves to the entries it cited.
3. A document that has fallen behind the record says so, on the list and on
   itself.
4. A hand-written document never claims staleness, because it never claimed to
   be a synthesis.
5. Regenerating is an edit, so `document_revisions` gives the undo path and the
   existing supersede check still applies.

## 4. The proposal kind

`proposalKinds` gains `'document'`, and `payloadSchemaFor('document')` returns
the existing `createDocumentSchema` — the same schema the human create-form
posts through. That is the one-validation-path rule this codebase already
follows for entries and work items: an agent cannot propose a document a person
could not type.

`applyProposal` gains a `document` case creating the row through
`createDocument` with `agentId` set, and recording the new id in `applied_id`.
Its existing `document_edit` case is untouched in this slice; §6.1 amends both
to stamp the synthesis mark, and that belongs to the second slice.

The tool is `propose_document`, added to the registry as `writes: 'proposes'`
and granted to the **Tutor**. It already holds `propose_document_edit` and its
role description already says it drafts; a new template would be a persona
rather than a capability, which §5 of the phase 2 design forbids.

## 5. Provenance, which costs nothing

Proposal citations already exist and are already validated server-side against
the project. And `proposals.applied_id` points at the row a proposal created.

So the question *"why does this document say five constituents?"* is answerable
without a new column or link: find the proposal whose `applied_id` is this
document, read its citations. Provenance is a consequence of the design that
was already there, and this spec adds nothing for it.

## 6. Staleness

### 6.1 What is stored

```sql
alter table documents add column synthesised_through timestamptz;
```

The newest `occurred_at` among the entries the accepted proposal cited. Set on
apply, for both a `document` and a `document_edit` — so regenerating moves the
mark forward, which is what makes a refresh mean something.

**Null means hand-written, and stays null.** A document typed by the owner never
claimed to synthesise the record, so it has nothing to be behind. The staleness
line appears only on documents that made the claim. This is the reason the
column is nullable rather than defaulted, and a migration that backfills it
would be wrong.

### 6.2 What is shown

The count of entries whose `occurred_at` is later than `synthesised_through`.

Stated as a fact — *"14 entries since this was written"* — and not as a
judgement. The count cannot know whether those entries matter: a note about
ordering bearings counts against a dial-design document. That noise is
acceptable and the alternative is not, because judging relevance means a model
call per document per page render, producing an answer the owner cannot check
without doing the reading themselves.

### 6.3 How it is counted

One query for the project's entry timestamps, then a pure function:

```ts
staleCounts(documents, entryTimes): Map<string, number>
```

Pure because it is the piece that can be wrong in a way nobody notices, and
one query rather than one per row because the list page renders every document.
Entry timestamps for a project are small and already indexed by `occurred_at`.

### 6.4 Where

The documents list and the document itself — both places the owner is already
looking at that document and can act on it.

**Not the resume view.** That page is already carrying waiting work, open items,
undecided proposals and the log, and every region added to it costs the
scannability the whole page depends on. Documents are not the re-entry
primitive; the log and the work tree are.

## 7. What this deliberately does not build

**No chat inside the documents tab.** Ask the Partner, or address the Tutor
directly with `@tutor write up the harmonic constituent decision`. Review in the
inbox. Edit in the editor that exists. A second conversation surface would
duplicate the whole of phase 2d.

**No document types or templates.** The project-state document is a document
whose prompt asked for a project-state document. Making that a type would put a
taxonomy in the schema to express a difference that lives in the request.

**No automatic regeneration.** A document that rewrites itself on a schedule is
a document nobody trusts, and it would spend money on a project nobody is
working on. Staleness is a signal, and acting on it is the owner's.

**No rich text.** The old product had TipTap and it was deleted with the rest of
`8b7245a`. Markdown textarea plus preview is the design, and
`components/docs/markdown.tsx` is the vetted renderer.

## 8. Failure modes

| Failure | Behaviour |
|---|---|
| Proposal cites an entry that does not resolve | Refused at propose time, as every citation already is |
| Proposal cites nothing | Allowed; `synthesised_through` stays null, so the document claims no currency |
| Document edited by hand after generation | `synthesised_through` unchanged — it still records what was synthesised, and the owner's edit is not a synthesis |
| Entry backdated after the document was written | Counts as behind, correctly: the document did not see it |
| Entry deleted | Count falls. Nothing to reconcile; the mark is a timestamp, not a list |
| Tutor deleted by the owner | No document proposals. The editor and the create form are untouched |

## 9. Testing

**Unit**
- `staleCounts`: a document with no mark yields no count; a document whose mark
  predates *n* entries yields *n*; an entry exactly on the mark does not count.
- `payloadSchemaFor('document')` is `createDocumentSchema`, so a payload the
  create-form would reject is rejected here.
- `propose_document` is `writes: 'proposes'`, and the Tutor holds it while the
  Critic does not.

**RLS**
- A second user can read neither the proposal nor the document it created.
- An applied document carries the proposing agent's `agent_id`.

**Live** — one pass asking for a document and accepting it. Every model-facing
thing in phase 2d was correct only after being run, and this spec assumes that
will be true again.

## 10. Delivery

**2e-1 — The primitive.** The proposal kind, the apply case, the
`propose_document` tool, the Tutor's grant, and their tests. No UI, no
staleness. At the end an agent can propose a document and the owner can accept
it in the inbox they already have.

**2e-2 — Staleness.** The column; the stamp written on apply, for the
`document` and `document_edit` cases alike; `staleCounts`; and the two places it
shows.

## 11. Decisions taken during design

1. **Documents are proposed, not written.** The constraint holds unamended
   here; there is no case for direct writing, since a document is not a
   transcription of anything the owner said.
2. **The Tutor, not a new agent.** §4.
3. **Staleness is a count of entries, not a judgement and not elapsed time.**
   §6.2.
4. **Null staleness for hand-written documents.** §6.1 — the signal belongs
   only to documents that claimed to be a synthesis.
5. **Not on the resume view.** §6.4.

## 12. Open questions

None. The two that mattered — what makes a document stale, and where that shows
— were settled before this was written, and both are recorded in §6 with the
reasoning.

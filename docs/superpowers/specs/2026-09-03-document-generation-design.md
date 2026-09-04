# Document Generation Design

**Status:** 2e-1 shipped 2026-09-03 (#28). 2e-2 shipped 2026-09-04 (#29). 2e-3 closes §8.1 and the count's 1000-row ceiling.
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

**Two migrations**, one per slice. 2e-1 widens the `proposals.kind` check
constraint — it is `check (kind in ('entry','work_item','document_edit'))`, so
the new kind is refused by the database until the constraint says otherwise.
2e-2 adds a single nullable column.

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
`target_id` stays null: it names the document being edited, and a proposal to
create one has no document yet.
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

**Amended by 2e-3: there are two marks, not one.** `synthesised_through` is how
far through the log the document read; `synthesised_at` is when it did the
reading. One timestamp could not answer both, and §8.1 is the failure that came
of conflating them. Both are written together and only when the proposal cited
at least one entry — a proposal citing nothing did not synthesise, so it moves
neither. A row stamped before 2e-3 has a `synthesised_through` and no
`synthesised_at`; that is honest, since when it read is genuinely unknown, and
it heals on the next regeneration.

**Null means hand-written, and stays null.** A document typed by the owner never
claimed to synthesise the record, so it has nothing to be behind. The staleness
line appears only on documents that made the claim. This is the reason the
column is nullable rather than defaulted, and a migration that backfills it
would be wrong.

### 6.2 What is shown

The count of entries the document has not read.

**Amended by 2e-3.** An entry counts when `occurred_at > synthesised_through`
**or** `created_at > synthesised_at` — it happened after the document's reach,
or it was written down after the document did its reading. The first condition
alone was the original definition and it is the one §8.1 records as wrong.

Stated as a fact — *"14 entries since this was written"* — and not as a
judgement. The count cannot know whether those entries matter: a note about
ordering bearings counts against a dial-design document. That noise is
acceptable and the alternative is not, because judging relevance means a model
call per document per page render, producing an answer the owner cannot check
without doing the reading themselves.

### 6.3 How it is counted

**Amended by 2e-3: in the database, not in a pure function.**

It was one query for the project's entry timestamps and a pure `staleCounts`
over them. That was right while the count was a single comparison over a small
array, and it stopped being right for two reasons at once.

Fetching rows in order to count them has a ceiling: PostgREST caps a response
at 1000 rows, so a project further than 1000 entries past a mark rendered 1000
as though it were exact. A count that reads low is the one failure this feature
exists to prevent, and stating a truncated number as a precise one is a worse
version of it than saying nothing.

And the two-condition predicate needs both timestamps per entry, doubling a
payload that was already the wrong shape.

So the count is a `security invoker` function, `stale_entry_counts(project_id)`,
returning one row per marked document. No ceiling, one round trip for the whole
page, and the predicate sits beside the marks it reads. It is proven against a
real database by the RLS suite rather than against fabricated arrays — which for
a comparison whose whole difficulty is Postgres timestamp semantics is the
stronger evidence, and is why the pure function is deleted rather than kept
alongside.

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
| Entry backdated after the document was written | Counts as behind, correctly: the document did not see it. **Met from 2e-3** — see §8.1 |
| Entry deleted | Count falls. Nothing to reconcile; the mark is a timestamp, not a list |
| Tutor deleted by the owner | No document proposals. The editor and the create form are untouched |

### 8.1 The backdating gap, and how it was closed

Slice 2e-2 shipped the count as §6.2 defines it: entries whose `occurred_at` is
later than `synthesised_through`. That and the backdating row above cannot both
be true, and the row is the one that is right about what the feature is for.

An entry written up on Monday and dated Saturday morning, against a document
generated Sunday with a mark of Saturday 18:00, is invisible to the count. The
document never saw that entry. The page says it is current.

This is the direction that matters. A count that reads high is noise the owner
can dismiss; a count that reads low tells them a document is more current than
it is, which is precisely the rot §1 says this feature exists to reveal. And it
is reachable through the ordinary workflow — backdating is why `occurred_at` is
separate from `created_at` in the first place.

The mark conflates two things that only look the same: how far through the log
a document read, and when it did the reading. Closing the gap means storing both
— `synthesised_at` alongside `synthesised_through` — and counting an entry when
either `occurred_at > synthesised_through` or `created_at > synthesised_at`.

Left open at 2e-2 rather than patched, because it is a schema decision and
because amending the row down to match the implementation would have been
softening a promise to fit what was built. The row stood as written and this
section recorded that it was not yet kept.

**Closed in 2e-3.** Two independent reviews — the branch's own final review and
CodeRabbit on #29 — arrived at this gap separately and prescribed the same fix,
which is about as much agreement as a design question gets. `synthesised_at`
now records when the reading happened, and an entry counts when it is past
either mark. §6.1, §6.2 and §6.3 carry the amended design.

Kept here rather than rewritten away, because the useful part of this section is
not the resolution. It is that a spec can promise one thing in §8 and define
another in §6.2, that both halves were written in the same sitting by the same
author, and that neither review of 2e-1 nor three reviews of 2e-2's code caught
it — because every one of them was checking the code against §6.2, which the
code matched.

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

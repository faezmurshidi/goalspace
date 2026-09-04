# Document Generation, Slice 2e-2: staleness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generated document says how far the record has moved since it was written, so it cannot quietly rot into an answer nobody should trust.

**Architecture:** One nullable column, `documents.synthesised_through`, stamped inside `apply_proposal` from the `occurred_at` of the newest entry the accepted proposal cited. A pure function counts the entries past that mark, over one query of the project's entry timestamps. Two surfaces render the count. Nothing judges relevance.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Vitest 4, i18next.

**Spec:** [docs/superpowers/specs/2026-09-03-document-generation-design.md](../specs/2026-09-03-document-generation-design.md) — §6 is this slice; §10 names it 2e-2.

## Global Constraints

- **Node ≥22.** The shell defaults to v20, under which RLS tests fail with "native WebSocket not found" and `pnpm typecheck` fails. Prefix commands with `PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`.
- **The RLS suite targets the LOCAL Supabase stack** via `apps/app/.env.test`. Nothing remote is involved.
- **Null means hand-written, and stays null.** A document the owner typed never claimed to synthesise the record, so it has nothing to be behind. No backfill, no default.
- **The count is a fact, not a judgement.** "14 entries since this was written." It must not describe them as relevant, stale, or needing attention, and nothing may call a model to decide whether they matter.
- **Not on the resume view.** Only the documents list and the document itself.
- **Locale parity is enforced by test.** Every key added to `en.json` must exist in `ms.json` and `zh.json`.
- Work on a branch. A pre-commit hook rejects multi-line commit messages passed inline; write the message to a file and use `git commit -F <file>`.
- Run commands from `/Users/faez/Documents/goalspace` unless a step says otherwise.

---

## What the spec could not know

§6.1 says the mark is "set on apply". When the spec was written, `applyProposal` did that work in TypeScript. It no longer does: slice 2e-1's review moved the whole apply path into `apply_proposal`, a single transaction (`20260903000700`, hardened by `20260903000800`).

So the stamp is computed in SQL, from `proposals.citations`, inside that transaction. This is strictly better than the spec's assumption — the mark and the row it describes are written together or not at all — but it means Task 1 amends a function rather than adding TypeScript.

Two rules follow, neither of which §6 settles, both decided here:

1. **Only `entry` citations count.** A citation may name a work item or a document, and neither has an `occurred_at`. The mark is "how far through the log this document has read", so only log entries can move it.
2. **The mark only ever moves forward.** A regeneration citing nothing, or citing only older entries, must not retreat or erase it. Erasing would make an agent-authored document claim to be hand-written; retreating would report entries as unread that a previous version had already synthesised. `greatest(existing, new)` in Postgres ignores nulls, which gives both behaviours in one expression.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `apps/app/supabase/migrations/20260904000100_document_staleness.sql` | Create | The column, and `apply_proposal` amended to stamp it. |
| `apps/app/lib/db/documents.ts` | Modify | `DOCUMENT_COLUMNS` gains the column; a `listEntryTimes` query. |
| `apps/app/lib/documents/staleness.ts` | Create | `staleCounts` — pure, no I/O. |
| `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx` | Modify | The count on each list row. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx` | Modify | The count on the document. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | Modify | One plural key. |
| `apps/app/tests/unit/document-staleness.test.ts` | Create | The counter. |
| `apps/app/tests/rls/proposals-apply.test.ts` | Modify | The stamp, in the transaction that writes it. |

---

### Task 1: The column and the stamp

**Files:**
- Create: `apps/app/supabase/migrations/20260904000100_document_staleness.sql`
- Modify: `apps/app/lib/db/documents.ts` (`DOCUMENT_COLUMNS`, line 10)
- Modify: `apps/app/types/supabase.ts` (regenerated, not hand-edited)
- Test: `apps/app/tests/rls/proposals-apply.test.ts`

**Interfaces:**
- Produces: `documents.synthesised_through timestamptz` (nullable); `Document` gains `synthesised_through: string | null`.

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/rls/proposals-apply.test.ts`. It uses the file's existing `insert`, `proposalOf`, `client`, `alice`, `projectId` helpers. Note `proposalOf` spreads its argument over the row, so `citations` and `target_id` can be passed alongside `kind` and `payload`.

```ts
describe('the synthesis mark', () => {
  const OLDER = '2026-08-01T10:00:00.000Z';
  const NEWER = '2026-08-20T10:00:00.000Z';

  const entryAt = async (occurredAt: string, body: string) =>
    (
      await insert(alice!, 'entries', {
        project_id: projectId,
        owner_id: alice!.id,
        kind: 'note',
        body,
        occurred_at: occurredAt,
      })
    ).id;

  it('stamps the newest cited entry, not the newest entry', async () => {
    // The mark says how far through the log this document has read. An entry
    // it never cited has not been read, however recent it is.
    const older = await entryAt(OLDER, 'Cited.');
    await entryAt(NEWER, 'Not cited.');

    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Synthesis mark', body: 'Body.' },
      citations: [{ type: 'entry', id: older }],
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', outcome.appliedId)
      .single();

    expect(new Date(doc!.synthesised_through!).toISOString()).toBe(OLDER);
  });

  it('leaves the mark null when the proposal cited no entries', async () => {
    // Allowed, per spec section 8: the document simply claims no currency.
    // Null is also what a hand-written document carries, and both mean the
    // same thing — this did not claim to synthesise anything.
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Uncited', body: 'Body.' },
      citations: [],
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', outcome.appliedId)
      .single();
    expect(doc!.synthesised_through).toBeNull();
  });

  it('ignores citations that are not entries', async () => {
    // A work item has no occurred_at, so it cannot move a mark that means
    // "how far through the log". Citing one alone leaves the document
    // claiming no currency rather than claiming a false one.
    const workItem = (
      await insert(alice!, 'work_items', {
        project_id: projectId,
        owner_id: alice!.id,
        title: 'Cited work item',
      })
    ).id;

    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Work item only', body: 'Body.' },
      citations: [{ type: 'work_item', id: workItem }],
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', outcome.appliedId)
      .single();
    expect(doc!.synthesised_through).toBeNull();
  });

  it('moves the mark forward when a regeneration cites something newer', async () => {
    // This is what makes a refresh mean anything: the count resets because the
    // document has now read further.
    const older = await entryAt(OLDER, 'First pass.');
    const newer = await entryAt(NEWER, 'Second pass.');

    const created = await proposalOf({
      kind: 'document',
      payload: { title: 'Moves forward', body: 'First body.' },
      citations: [{ type: 'entry', id: older }],
    });
    const first = await applyProposal(client(), { proposalId: created, ownerId: alice!.id });
    expect(first.status).toBe('applied');
    if (first.status !== 'applied') return;

    const { data: before } = await alice!.client
      .from('documents')
      .select('updated_at')
      .eq('id', first.appliedId)
      .single();

    const edit = await proposalOf({
      kind: 'document_edit',
      target_id: first.appliedId,
      payload: {
        id: first.appliedId,
        body: 'Second body.',
        base_updated_at: before!.updated_at,
      },
      citations: [{ type: 'entry', id: newer }],
    });

    const second = await applyProposal(client(), { proposalId: edit, ownerId: alice!.id });
    expect(second.status).toBe('applied');

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', first.appliedId)
      .single();
    expect(new Date(doc!.synthesised_through!).toISOString()).toBe(NEWER);
  });

  it('never retreats the mark, and never erases it', async () => {
    // A regeneration that cites only older entries has not un-read what a
    // previous version already read. Erasing would make an agent-authored
    // document claim to be hand-written; retreating would report entries as
    // unread that were already synthesised.
    const older = await entryAt(OLDER, 'Old citation.');
    const newer = await entryAt(NEWER, 'New citation.');

    const created = await proposalOf({
      kind: 'document',
      payload: { title: 'Never retreats', body: 'First body.' },
      citations: [{ type: 'entry', id: newer }],
    });
    const first = await applyProposal(client(), { proposalId: created, ownerId: alice!.id });
    expect(first.status).toBe('applied');
    if (first.status !== 'applied') return;

    const { data: before } = await alice!.client
      .from('documents')
      .select('updated_at')
      .eq('id', first.appliedId)
      .single();

    const edit = await proposalOf({
      kind: 'document_edit',
      target_id: first.appliedId,
      payload: {
        id: first.appliedId,
        body: 'Second body.',
        base_updated_at: before!.updated_at,
      },
      citations: [{ type: 'entry', id: older }],
    });
    expect((await applyProposal(client(), { proposalId: edit, ownerId: alice!.id })).status).toBe(
      'applied'
    );

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', first.appliedId)
      .single();
    // Still the newer mark, not the older one it just cited.
    expect(new Date(doc!.synthesised_through!).toISOString()).toBe(NEWER);
  });

  it('leaves a hand-written document unmarked', async () => {
    // The reason the column is nullable rather than defaulted. This document
    // never claimed to synthesise anything, so it has nothing to be behind and
    // must never show a count.
    const { data: doc } = await alice!.client
      .from('documents')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        title: 'Typed by hand',
        body: 'Mine.',
      })
      .select('synthesised_through')
      .single();

    expect(doc!.synthesised_through).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-apply.test.ts
```

Expected: FAIL. `column documents.synthesised_through does not exist`.

- [ ] **Step 3: Write the migration**

Create `apps/app/supabase/migrations/20260904000100_document_staleness.sql`. It adds the column, then replaces `apply_proposal` whole — a `create or replace` of a plpgsql body is all-or-nothing, so copy the current body from `20260903000800_apply_proposal_hardening.sql` and make exactly the two changes shown after it here.

```sql
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
```

Then, in the copied function body, declare one more variable alongside `v_edited`:

```sql
  v_synth    timestamptz;
```

and insert this block after the `if / elsif / else` chain closes with `end if;` and **before** the final `update public.proposals` that sets status to accepted:

```sql
  if v_proposal.kind in ('document', 'document_edit') then
    -- Only entry citations count. A citation may name a work item or another
    -- document and neither has an occurred_at; the mark means "how far through
    -- the log", so only the log can move it.
    --
    -- Scoped to this project as well as to the id. RLS already confines the
    -- read and the citations were resolved against the project before the
    -- proposal was stored — this is the third layer, and it is the cheap one.
    select max(e.occurred_at) into v_synth
      from jsonb_array_elements(v_proposal.citations) as c
      join public.entries e
        on e.id = (c->>'id')::uuid
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
```

Everything else in the function is unchanged. Do not alter the entry, work item, document or document_edit branches, the advisory lock, or the `v_edited` derivation.

- [ ] **Step 4: Apply it and regenerate types**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm db:reset
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" npx supabase gen types typescript --local > types/supabase.ts
grep -n 'synthesised_through' types/supabase.ts | head -3
```

Expected: the grep prints matches in the `documents` Row, Insert and Update types.

- [ ] **Step 5: Add the column to the document reads**

In `apps/app/lib/db/documents.ts`, line 10:

```ts
const DOCUMENT_COLUMNS =
  'id, project_id, owner_id, agent_id, title, body, created_at, updated_at, synthesised_through';
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-apply.test.ts
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm typecheck
```

Expected: PASS, including every pre-existing case in that file — the ones about atomicity and superseding especially, since the function was replaced whole.

- [ ] **Step 7: Commit**

Write the message to a file and pass it with `-F`, per the Global Constraints.

```
feat(documents): record how far through the log a document has read

synthesised_through carries the occurred_at of the newest entry an
accepted proposal cited. Null means hand-written — a document the owner
typed never claimed to synthesise the record, so it has nothing to be
behind and must never nag. No default, no backfill.

Stamped inside apply_proposal rather than in the application, so the
mark and the row it describes are written in one transaction. Doing it
above the database would reintroduce the split 20260903000700 closed.

Only entry citations move it: a work item has no occurred_at, and the
mark means how far through the log this document has read.

greatest() rather than assignment, because it ignores nulls in Postgres
and that is the behaviour wanted twice — a regeneration citing nothing
keeps the mark it had, and one citing only older entries does not drag
it backwards. A document has not un-read what it already read.
```

Stage: the new migration, `lib/db/documents.ts`, `types/supabase.ts`, and `tests/rls/proposals-apply.test.ts`.

---

### Task 2: Counting what came after

**Files:**
- Create: `apps/app/lib/documents/staleness.ts`
- Modify: `apps/app/lib/db/documents.ts` (a new query, at the end of the file)
- Test: `apps/app/tests/unit/document-staleness.test.ts`

**Interfaces:**
- Consumes: `Document` from Task 1, which now carries `synthesised_through: string | null`.
- Produces:
  - `staleCounts(documents: readonly { id: string; synthesised_through: string | null }[], entryTimes: readonly string[]): Map<string, number>`
  - `listEntryTimes(supabase: Client, projectId: string): Promise<string[]>`

`staleCounts` is pure and takes plain data, because it is the piece that can be wrong in a way nobody notices. A document with a null mark is **absent** from the returned map — not present with zero — so a caller cannot render "0 entries since this was written" against a document that never made the claim.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/document-staleness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { staleCounts } from '@/lib/documents/staleness';

const doc = (id: string, mark: string | null) => ({ id, synthesised_through: mark });

describe('staleCounts', () => {
  it('counts the entries that happened after the mark', () => {
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z')],
      ['2026-08-09T00:00:00.000Z', '2026-08-11T00:00:00.000Z', '2026-08-12T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(2);
  });

  it('omits a document with no mark rather than counting zero', () => {
    // A hand-written document never claimed to synthesise anything. Present
    // with zero would let a caller render "0 entries since this was written"
    // against a document that was never written from the log at all.
    const counts = staleCounts([doc('a', null)], ['2026-08-11T00:00:00.000Z']);
    expect(counts.has('a')).toBe(false);
  });

  it('does not count an entry exactly on the mark', () => {
    // The mark IS that entry's occurred_at — the document was written from it,
    // so it is read, not outstanding.
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z')],
      ['2026-08-10T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(0);
  });

  it('gives a document caught up with the log a count of zero', () => {
    // Zero is a real answer and must be distinguishable from absent: this
    // document did claim to synthesise, and is current.
    const counts = staleCounts(
      [doc('a', '2026-08-20T00:00:00.000Z')],
      ['2026-08-10T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(0);
  });

  it('compares instants, not strings', () => {
    // Postgres renders timestamptz as `2026-08-10 00:00:00+00` while an ISO
    // string carries a `Z`. Compared as text, every mark looks older than
    // every entry and the count is always the whole log.
    const counts = staleCounts(
      [doc('a', '2026-08-10 00:00:00+00')],
      ['2026-08-09T23:00:00.000Z', '2026-08-10T01:00:00.000Z']
    );
    expect(counts.get('a')).toBe(1);
  });

  it('counts each document against the same log', () => {
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z'), doc('b', '2026-08-01T00:00:00.000Z'), doc('c', null)],
      ['2026-08-05T00:00:00.000Z', '2026-08-15T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(1);
    expect(counts.get('b')).toBe(2);
    expect(counts.has('c')).toBe(false);
  });

  it('handles an empty log and no documents', () => {
    expect(staleCounts([doc('a', '2026-08-10T00:00:00.000Z')], []).get('a')).toBe(0);
    expect(staleCounts([], ['2026-08-10T00:00:00.000Z']).size).toBe(0);
  });

  it('ignores an unparseable mark rather than counting the whole log against it', () => {
    // Failing closed: a bad mark is not evidence that everything is unread.
    // Rendering "412 entries since this was written" would be worse than
    // rendering nothing.
    expect(staleCounts([doc('a', 'not a date')], ['2026-08-10T00:00:00.000Z']).has('a')).toBe(
      false
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/unit/document-staleness.test.ts
```

Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the function**

Create `apps/app/lib/documents/staleness.ts`:

```ts
/**
 * How far the log has moved past each document.
 *
 * Pure, and over plain data, because this is the piece that can be wrong in a
 * way nobody notices: an off-by-one or a string comparison produces a number
 * that looks entirely plausible on the page.
 *
 * A document with no mark is absent from the result rather than present with
 * zero. Null means hand-written — it never claimed to synthesise the record —
 * and "0 entries since this was written" is a claim about a document that was
 * never written from the log. Absent and zero mean different things here, so
 * they are represented differently.
 *
 * The count is a fact and not a judgement. It cannot know whether those entries
 * matter to this document, and a note about ordering bearings counts against a
 * dial-design document. That noise is the accepted cost: the alternative is a
 * model call per document per render, producing an answer the owner cannot
 * check without doing the reading themselves.
 */
export function staleCounts(
  documents: readonly { id: string; synthesised_through: string | null }[],
  entryTimes: readonly string[]
): Map<string, number> {
  // Parsed once, not once per document. Compared as instants because Postgres
  // renders timestamptz as `2026-08-10 00:00:00+00` while an ISO string carries
  // a `Z`; compared as text every mark looks older than every entry.
  const times = entryTimes.map((time) => Date.parse(time)).filter((time) => !Number.isNaN(time));

  const counts = new Map<string, number>();

  for (const document of documents) {
    if (document.synthesised_through === null) continue;

    const mark = Date.parse(document.synthesised_through);
    // A mark that will not parse is not evidence that the whole log is unread.
    // Saying nothing beats saying "412 entries since this was written".
    if (Number.isNaN(mark)) continue;

    // Strictly after: an entry exactly on the mark is the entry the document
    // was written from, so it has been read.
    counts.set(document.id, times.filter((time) => time > mark).length);
  }

  return counts;
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/unit/document-staleness.test.ts
```

Expected: PASS, 8 cases.

- [ ] **Step 5: Add the one query the pages need**

Append to `apps/app/lib/db/documents.ts`:

```ts
/**
 * Every entry's occurred_at for a project, newest first.
 *
 * One query rather than one per document, because the list page renders all of
 * them and a count-per-row would be a query-per-row. Timestamps only: the
 * counter needs nothing else, and pulling bodies to count them would make the
 * page cost grow with the size of the log rather than its length.
 */
export async function listEntryTimes(supabase: Client, projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('occurred_at')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => row.occurred_at);
}
```

- [ ] **Step 6: Run the whole unit suite and typecheck**

```bash
cd /Users/faez/Documents/goalspace
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm test
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

Message, written to a file and passed with `-F`:

```
feat(documents): count what the log did after a document was written

staleCounts is pure and takes plain data, because it is the piece that
can be wrong in a way nobody notices — an off-by-one or a string
comparison produces a number that looks entirely plausible on the page.

A document with no mark is absent from the result rather than present
with zero. Null means hand-written, and "0 entries since this was
written" is a claim about a document never written from the log at all.
Absent and zero mean different things, so they are represented
differently.

Instants, not strings: Postgres renders timestamptz as
`2026-08-10 00:00:00+00` while an ISO string carries a Z, and compared
as text every mark looks older than every entry.

One query of entry timestamps rather than a count per row, because the
list page renders every document.
```

Stage: `lib/documents/staleness.ts`, `lib/db/documents.ts`, `tests/unit/document-staleness.test.ts`.

---

### Task 3: Saying it, in two places

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx`
- Modify: `packages/i18n/src/locales/en.json`, `ms.json`, `zh.json`
- Test: `packages/i18n/tests/server-t.test.ts`

**Interfaces:**
- Consumes: `staleCounts` and `listEntryTimes` from Task 2.

- [ ] **Step 1: Add the locale strings**

Inside the `app.documents` object in each file.

`packages/i18n/src/locales/en.json`:

```json
"since_one": "1 entry since this was written",
"since_other": "{{count}} entries since this was written"
```

`packages/i18n/src/locales/ms.json`:

```json
"since_one": "1 catatan sejak ini ditulis",
"since_other": "{{count}} catatan sejak ini ditulis"
```

`packages/i18n/src/locales/zh.json`:

```json
"since_one": "自撰写以来有 1 条日志",
"since_other": "自撰写以来有 {{count}} 条日志"
```

There is deliberately no `_zero` key. A count of zero renders nothing at all, and the suppression happens in the components — English has no zero plural category, so i18next would fall through to `_other` and render "0 entries since this was written" if one existed. That mistake was made and caught by test in the previous slice; do not repeat it.

- [ ] **Step 2: Pin the strings with a test**

Append to `packages/i18n/tests/server-t.test.ts`:

```ts
describe('the staleness line', () => {
  it('reads as a fact, not a judgement', () => {
    // The count cannot know whether those entries matter to this document.
    // Wording that implied they did — stale, outdated, needs attention —
    // would be a claim the product cannot support.
    expect(getFixedT('en')('app.documents.since', { count: 14 })).toBe(
      '14 entries since this was written'
    );
  });

  it('is singular for one', () => {
    expect(getFixedT('en')('app.documents.since', { count: 1 })).toBe(
      '1 entry since this was written'
    );
  });

  it('resolves in ms and zh rather than falling back to the key', () => {
    for (const locale of ['ms', 'zh'] as const) {
      for (const count of [1, 14]) {
        const line = getFixedT(locale)('app.documents.since', { count });
        expect(line).not.toContain('documents.since');
        expect(line).not.toContain('{{');
      }
    }
  });
});
```

- [ ] **Step 3: Run the i18n tests**

```bash
cd /Users/faez/Documents/goalspace/packages/i18n
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run
```

Expected: PASS, including the existing locale-parity test, which now covers the new keys.

- [ ] **Step 4: Show it on the documents list**

In `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`, widen the existing import and add one:

```ts
import { listDocuments, listEntryTimes } from '@/lib/db/documents';
import { staleCounts } from '@/lib/documents/staleness';
```

After `const documents = await listDocuments(supabase, project.id);`:

```ts
  // One query for the whole page. The counter is pure, so the per-row work is
  // arithmetic rather than a round trip each.
  const stale = staleCounts(documents, await listEntryTimes(supabase, project.id));
```

Inside the row, after the `byAgent` span and before the date span:

```tsx
                  {/* Only for documents that claimed to synthesise the record,
                      and only when the log has moved past them. A hand-written
                      document is absent from the map; a current one is present
                      with zero; neither has anything to say. */}
                  {(stale.get(document.id) ?? 0) > 0 ? (
                    <span className="label text-ink-soft shrink-0">
                      {t('app.documents.since', { count: stale.get(document.id) })}
                    </span>
                  ) : null}
```

- [ ] **Step 5: Show it on the document itself**

In `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx`, widen the import and add one:

```ts
import { getDocument, listEntryTimes, listRevisions } from '@/lib/db/documents';
import { staleCounts } from '@/lib/documents/staleness';
```

After `const revisions = await listRevisions(supabase, project.id, document.id);`:

```ts
  const since = staleCounts([document], await listEntryTimes(supabase, project.id)).get(
    document.id
  );
```

Between the `<DocumentEditor ... />` element and `<Attachments ... />`:

```tsx
        {/* Below the document rather than above it: the document is what the
            owner came for, and this is a note about it. */}
        {(since ?? 0) > 0 ? (
          <p className="label text-ink-soft pt-4">
            {t('app.documents.since', { count: since })}
          </p>
        ) : null}
```

- [ ] **Step 6: Run everything**

```bash
cd /Users/faez/Documents/goalspace
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm test
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm typecheck
cd apps/app && PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm test:rls
```

Expected: all green.

- [ ] **Step 7: Look at it**

```bash
cd /Users/faez/Documents/goalspace
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm dev
```

In a project holding an agent-written document and entries newer than it, on `/projects/<slug>/documents`:

1. The agent-written document shows a count; a hand-written one shows nothing.
2. The count matches the number of log entries dated after the document was generated.
3. Opening the document shows the same number.
4. The line reads as a fact. It does not say stale, outdated, or needs attention.

If the local database has no such document, create one: propose a document as the Tutor citing an older entry, accept it, then add an entry dated after it.

- [ ] **Step 8: Commit**

Message, written to a file and passed with `-F`:

```
feat(documents): say how far the log has moved past a document

On the documents list and on the document, which are the two places the
owner is already looking at that document and can act on it. Not on the
resume view: that page already carries waiting work, open items,
undecided proposals and the log, and documents are not the re-entry
primitive.

Stated as a fact — "14 entries since this was written" — because the
count cannot know whether those entries matter. Wording that implied
they did would be a claim the product cannot support.

Nothing renders at zero, and nothing renders for a hand-written
document. The first is current, the second never claimed to synthesise
anything, and neither has something to say.
```

Stage: the two page files and the three locale files, plus the i18n test.

---

## What this slice deliberately leaves undone

- **No judgement of relevance.** Spec §6.2. A model call per document per render would produce an answer the owner cannot check without doing the reading themselves.
- **No automatic regeneration.** Spec §7. A document that rewrites itself on a schedule is one nobody trusts, and it would spend money on a project nobody is working on.
- **No backfill.** Spec §6.1. Existing documents keep a null mark, because inventing one would be a claim nobody made.
- **Nothing on the resume view.** Spec §6.4.

# Document Generation, Slice 2e-3: an honest count

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The staleness count stops being able to read low. It counts an entry the document never saw even when that entry is dated before the mark, and it has no row ceiling.

**Architecture:** A second mark, `documents.synthesised_at` — when the reading happened, beside `synthesised_through`, how far it reached. The count moves into a `security invoker` Postgres function counting entries past either mark, which removes both the client-side ceiling and the fetch that caused it.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Vitest 4.

**Spec:** [docs/superpowers/specs/2026-09-03-document-generation-design.md](../specs/2026-09-03-document-generation-design.md) — §6.1, §6.2 and §6.3 as amended by this slice, and §8.1 for why.

## Global Constraints

- **Node ≥22.** The shell defaults to v20; RLS tests and typecheck fail under it. Prefix with `PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`.
- **The RLS suite targets the LOCAL Supabase stack** via `apps/app/.env.test`. Nothing remote.
- **The count may never read low.** That is the entire slice. A count that overstates is noise the owner dismisses; one that understates says a document is current when it is not, which is the rot §1 names as the reason this feature exists.
- **Null still means hand-written**, and hand-written documents still show nothing. No backfill of either mark.
- **The count is a fact, not a judgement.** No relevance ranking, no model call. Copy unchanged from 2e-2.
- Work on a branch. A pre-commit hook rejects multi-line commit messages passed on the command line; write the message to a file and pass it with the `-F` flag.

---

## Why both findings are one change

Two reviews landed the same week:

- **Backdating (spec §8.1).** An entry written up on Monday and dated Saturday, against a mark of Saturday evening, is invisible. The document never read it. The page says the document is current.
- **The 1000-row ceiling.** `listEntryTimes` fetches rows in order to count them, and PostgREST caps a response at 1000. A project further than 1000 entries past a mark rendered `1000` as an exact number.

Fixing backdating needs `created_at` as well as `occurred_at` for every entry, which doubles a payload that already had a ceiling. Counting in the database removes the fetch, and with it the ceiling — so one change closes both, and deleting the fetch is what makes the second finding impossible rather than merely signalled.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `apps/app/supabase/migrations/20260904000200_synthesised_at.sql` | Create | `synthesised_at`; `apply_proposal` stamping both marks; `stale_entry_counts`. |
| `apps/app/lib/db/documents.ts` | Modify | `DOCUMENT_COLUMNS` gains `synthesised_at`; add `staleCountsFor`. |
| `apps/app/lib/db/entries.ts` | Modify | Delete `listEntryTimes`. |
| `apps/app/lib/documents/staleness.ts` | Delete | The pure counter, superseded by the SQL function. |
| `apps/app/tests/unit/document-staleness.test.ts` | Delete | Its subject is gone; the RLS suite covers the behaviour against a real database. |
| `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx` | Modify | Read counts from the query. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx` | Modify | Same. |
| `apps/app/tests/rls/document-staleness.test.ts` | Create | The predicate, the two marks, and isolation. |

---

### Task 1: The second mark, and the count in the database

**Files:**
- Create: `apps/app/supabase/migrations/20260904000200_synthesised_at.sql`
- Create: `apps/app/tests/rls/document-staleness.test.ts`
- Modify: `apps/app/lib/db/documents.ts`, `apps/app/types/supabase.ts` (regenerated)

**Interfaces:**
- Produces: `documents.synthesised_at timestamptz` (nullable); `stale_entry_counts(p_project_id uuid) returns table(document_id uuid, entries_since bigint)`; `staleCountsFor(supabase, projectId): Promise<Map<string, number>>`.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/rls/document-staleness.test.ts`. Model the fixture setup on `tests/rls/proposals-apply.test.ts` — `createTestUser`, an `insert` helper, a project, an agent and a run — and add a second user for the isolation case.

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { staleCountsFor } from '@/lib/db/documents';
import { applyProposal } from '@/lib/proposals/apply';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

/**
 * The count, against a real database.
 *
 * It lives here rather than in tests/unit because every case that matters is a
 * database behaviour: the two marks written in one transaction, a predicate
 * over two timestamp columns, and RLS scoping the result. The pure function
 * this replaced could only ever be tested against arrays someone typed, which
 * is the wrong evidence for a comparison whose difficulty is Postgres
 * timestamp semantics.
 */

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let agentId: string;
let runId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as Record<string, unknown> & { id: string };
};

/** An entry that happened at `occurredAt`. `created_at` defaults to now. */
const entryAt = async (occurredAt: string) =>
  (
    await insert(alice!, 'entries', {
      project_id: projectId,
      owner_id: alice!.id,
      kind: 'note',
      body: `Entry occurring ${occurredAt}`,
      occurred_at: occurredAt,
    })
  ).id;

/** A generated document, marked by accepting a proposal that cites `citeIds`. */
const generatedDocument = async (title: string, citeIds: string[]) => {
  const proposalId = (
    await insert(alice!, 'proposals', {
      project_id: projectId,
      owner_id: alice!.id,
      agent_id: agentId,
      run_id: runId,
      kind: 'document',
      rationale: 'Because the log says so.',
      payload: { title, body: 'Body.' },
      citations: citeIds.map((id) => ({ type: 'entry', id })),
    })
  ).id;

  const outcome = await applyProposal(alice!.client as never, {
    proposalId,
    ownerId: alice!.id,
  });
  if (outcome.status !== 'applied') throw new Error(`expected applied, got ${outcome.status}`);
  return outcome.appliedId;
};

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`stale-alice-${stamp}@example.test`);
  bob = await createTestUser(`stale-bob-${stamp}@example.test`);

  projectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'tide-clock',
      title: 'Tide clock',
      kind: 'build',
    })
  ).id;

  agentId = (
    await insert(alice, 'agents', {
      project_id: projectId,
      owner_id: alice.id,
      slug: 'tutor',
      name: 'Tutor',
      system_prompt: 'Draft things.',
      tools: ['propose_document'],
    })
  ).id;

  runId = (
    await insert(alice, 'agent_runs', {
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      trigger: 'conversation',
      status: 'succeeded',
    })
  ).id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('both marks are written together', () => {
  it('stamps when the reading happened as well as how far it reached', async () => {
    const cited = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Two marks', [cited]);

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through, synthesised_at')
      .eq('id', id)
      .single();

    expect(new Date(doc!.synthesised_through!).toISOString()).toBe('2026-08-10T00:00:00.000Z');
    // Not the cited entry's date: this is when the synthesis ran, which is now.
    expect(doc!.synthesised_at).not.toBeNull();
    expect(Date.parse(doc!.synthesised_at!)).toBeGreaterThan(
      Date.parse('2026-08-10T00:00:00.000Z')
    );
  });

  it('moves neither mark when the proposal cited nothing', async () => {
    // A proposal citing nothing did not synthesise. Advancing synthesised_at
    // would claim it had read everything up to now, which would hide every
    // entry written before this moment — the backdating bug in a new costume.
    const id = await generatedDocument('Cited nothing', []);

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through, synthesised_at')
      .eq('id', id)
      .single();

    expect(doc!.synthesised_through).toBeNull();
    expect(doc!.synthesised_at).toBeNull();
  });
});

describe('the count', () => {
  it('counts an entry that happened after the mark', async () => {
    const cited = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Happened after', [cited]);
    await entryAt('2026-08-20T00:00:00.000Z');

    const counts = await staleCountsFor(alice!.client as never, projectId);
    expect(counts.get(id)).toBe(1);
  });

  it('counts an entry backdated before the mark but written afterwards', async () => {
    // The failure this slice exists to close. The entry is dated a month
    // before the document's reach, so the old occurred_at-only predicate could
    // not see it — but it was written down after the document did its reading,
    // so the document has never read it.
    const cited = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Backdated after', [cited]);
    await entryAt('2026-07-01T00:00:00.000Z');

    const counts = await staleCountsFor(alice!.client as never, projectId);
    expect(counts.get(id)).toBe(1);
  });

  it('does not count an entry twice when it is past both marks', async () => {
    // The predicate is an OR over two conditions on one row. A join written
    // carelessly would count such an entry once per condition.
    const cited = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Past both', [cited]);
    await entryAt('2026-08-20T00:00:00.000Z');

    const counts = await staleCountsFor(alice!.client as never, projectId);
    expect(counts.get(id)).toBe(1);
  });

  it('does not count the entries the document was written from', async () => {
    const first = await entryAt('2026-08-01T00:00:00.000Z');
    const second = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Read both', [first, second]);

    const counts = await staleCountsFor(alice!.client as never, projectId);
    expect(counts.get(id)).toBe(0);
  });

  it('omits a hand-written document rather than counting zero', async () => {
    // Null means it never claimed to synthesise. Absent and zero are different
    // claims and the pages render them the same way for different reasons.
    const handWritten = (
      await insert(alice!, 'documents', {
        project_id: projectId,
        owner_id: alice!.id,
        title: 'Typed by hand',
        body: 'Mine.',
      })
    ).id;
    await entryAt('2026-08-25T00:00:00.000Z');

    const counts = await staleCountsFor(alice!.client as never, projectId);
    expect(counts.has(handWritten)).toBe(false);
  });

  it('counts nothing from another project, and nothing for another user', async () => {
    const cited = await entryAt('2026-08-10T00:00:00.000Z');
    const id = await generatedDocument('Scoped', [cited]);

    const bobProject = (
      await insert(bob!, 'projects', {
        owner_id: bob!.id,
        slug: 'bob-thing',
        title: 'Bob thing',
        kind: 'research',
      })
    ).id;
    await insert(bob!, 'entries', {
      project_id: bobProject,
      owner_id: bob!.id,
      kind: 'note',
      body: 'Not hers.',
      occurred_at: '2026-09-01T00:00:00.000Z',
    });

    const mine = await staleCountsFor(alice!.client as never, projectId);
    expect(mine.has(id)).toBe(true);

    const theirs = await staleCountsFor(bob!.client as never, projectId);
    expect(theirs.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/rls/document-staleness.test.ts
```

Expected: FAIL — `staleCountsFor` does not exist, and neither does the column.

- [ ] **Step 3: Write the migration**

Create `apps/app/supabase/migrations/20260904000200_synthesised_at.sql`. It adds the column, adds the counting function, and replaces `apply_proposal` whole — copy the body from `20260904000100_document_staleness.sql` and change only the stamping block, exactly as shown below.

```sql
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
```

Then replace `apply_proposal`, copying its body verbatim from `20260904000100_document_staleness.sql` and changing **only** the stamping block so it writes both marks:

```sql
  if v_proposal.kind in ('document', 'document_edit') then
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
```

Everything else in the function is unchanged. Do not touch the entry, work_item, document or document_edit branches, the advisory lock, or the `v_edited` derivation. Do not re-add grants — `create or replace` preserves them.

Note this changes one existing behaviour deliberately: the previous version ran its `update` unconditionally, relying on `greatest()` to ignore a null `v_synth`. The guard is now explicit because `synthesised_at` must not advance when nothing was cited.

- [ ] **Step 4: Apply it and regenerate types**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm db:reset
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" npx supabase gen types typescript --local > types/supabase.ts
grep -n 'synthesised_at\|stale_entry_counts' types/supabase.ts | head -5
```

- [ ] **Step 5: Add the column and the query**

In `apps/app/lib/db/documents.ts`, extend `DOCUMENT_COLUMNS`:

```ts
const DOCUMENT_COLUMNS =
  'id, project_id, owner_id, agent_id, title, body, created_at, updated_at, synthesised_through, synthesised_at';
```

and append:

```ts
/**
 * How many entries each marked document has not read.
 *
 * One round trip for a whole page, with no row ceiling: the count is computed
 * in `stale_entry_counts` rather than by fetching entries and counting them
 * here. A document absent from the map never claimed to synthesise the record;
 * one present with zero claimed it and is current. The pages render both as
 * nothing, for different reasons.
 */
export async function staleCountsFor(
  supabase: Client,
  projectId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('stale_entry_counts', {
    p_project_id: projectId,
  });

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.document_id, Number(row.entries_since)]));
}
```

The `Number(...)` is deliberate: Postgres `count()` is `bigint`, which PostgREST renders as a string rather than a number.

- [ ] **Step 6: Run the tests**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm vitest run tests/rls/document-staleness.test.ts tests/rls/proposals-apply.test.ts
```

Expected: the new file passes, and `proposals-apply.test.ts` still passes in full — the function was replaced whole, and its existing synthesis-mark cases prove the reach half still behaves.

`pnpm typecheck` will fail on the two page files until Task 2. That is expected at this point; do not fix it here.

- [ ] **Step 7: Commit**

Message, written to a file and passed with the `-F` flag:

```
feat(documents): count what the document has not read, not what came after

Two marks, not one. synthesised_through is how far the reading reached;
synthesised_at is when it happened. Conflating them is the gap spec 8.1
records: an entry written up on Monday and dated Saturday, against a
document whose reach ends Saturday evening, was invisible. The document
had never read it and the page said it was current.

Both move together or neither does. A proposal citing nothing did not
synthesise, and advancing the reading time for it would claim the
document had read everything up to now, which is the same bug in a new
costume.

The count moves into the database. It was a fetch of entry timestamps
and a pure function, which had a ceiling: PostgREST caps a response at
1000 rows, so a project further than 1000 entries past a mark reported
1000 as though it were exact. Counting where the marks are has no
ceiling, and a predicate needing two timestamps per entry made the fetch
the wrong shape anyway.

Rows stamped before this migration keep a reach and no reading time.
That is genuinely unknown rather than worth inventing, and the count
degrades for them to what it was before. They heal on regeneration.
```

Stage: the migration, `lib/db/documents.ts`, `types/supabase.ts`, and the new RLS test.

---

### Task 2: The pages, and deleting what it replaced

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`, `.../[docId]/page.tsx`
- Delete: `apps/app/lib/documents/staleness.ts`, `apps/app/tests/unit/document-staleness.test.ts`
- Modify: `apps/app/lib/db/entries.ts` (delete `listEntryTimes`)

**Interfaces:**
- Consumes: `staleCountsFor(supabase, projectId)` from Task 1.

- [ ] **Step 1: Rewire the documents list**

In `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`, replace the two staleness-related imports with one:

```ts
import { listDocuments, staleCountsFor } from '@/lib/db/documents';
```

and replace the `staleCounts(...)` / `listEntryTimes(...)` lines with:

```ts
  // One round trip, no ceiling, and no fetch of rows in order to count them.
  const stale = await staleCountsFor(supabase, project.id);
```

The rendering is unchanged — the map has the same shape and the same absent-versus-zero meaning, so the existing guard still reads correctly.

- [ ] **Step 2: Rewire the document page**

In `.../[docId]/page.tsx`, replace the imports with:

```ts
import { getDocument, listRevisions, staleCountsFor } from '@/lib/db/documents';
```

and the `since` computation with:

```ts
  const since = (await staleCountsFor(supabase, project.id)).get(document.id);
```

The guard and the rendered line are unchanged.

- [ ] **Step 3: Delete what the SQL function replaced**

```bash
cd /Users/faez/Documents/goalspace
rm apps/app/lib/documents/staleness.ts apps/app/tests/unit/document-staleness.test.ts
```

Then remove `listEntryTimes` from `apps/app/lib/db/entries.ts`, including its doc comment. Confirm nothing still refers to any of the three:

```bash
grep -rn "staleCounts\b\|listEntryTimes\|documents/staleness" apps/app --include=*.ts --include=*.tsx
```

Expected: no matches. Only `staleCountsFor` should remain, which that pattern does not match.

- [ ] **Step 4: Run everything**

```bash
cd /Users/faez/Documents/goalspace
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm test
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm typecheck
cd apps/app && PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm test:rls
```

Expected: all green. The unit total drops by the eight cases deleted with the pure function; the RLS total rises by the seven added in Task 1.

- [ ] **Step 5: Commit**

Message, written to a file and passed with the `-F` flag:

```
refactor(documents): read the count from the database

The pages fetched every entry timestamp in the project in order to
count a subset of them client-side. Now they ask for the counts.

staleCounts and its eight unit tests are deleted rather than kept
alongside. Their subject is gone, and for a comparison whose whole
difficulty is Postgres timestamp semantics, arrays someone typed were
always the weaker evidence — the RLS suite exercises the same predicate
against a real database.

listEntryTimes goes with them. It existed only to feed the counter.
```

Stage: the two page files, the two deletions, and `lib/db/entries.ts`.

---

## What this slice deliberately leaves undone

- **No backfill of `synthesised_at`.** A document stamped before this migration has a genuinely unknown reading time, and inventing one would be the same class of mistake as backfilling `synthesised_through`. Those documents count as they did before, and heal on regeneration.
- **No relevance judgement.** Spec §6.2, unchanged.
- **Nothing on the resume view.** Spec §6.4, unchanged.

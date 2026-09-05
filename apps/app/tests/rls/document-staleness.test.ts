import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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
  // `stale_entry_counts` is project-wide by design: any uncited entry past a
  // document's mark counts against it, regardless of which test produced the
  // entry. These cases share alice's project (as `entryAt` and
  // `generatedDocument` are written to), so an uncited entry left behind by
  // one case would otherwise count against every later case's document too.
  // Clearing entries between cases isolates each assertion without touching
  // the function under test.
  afterEach(async () => {
    const { error } = await alice!.client.from('entries').delete().eq('project_id', projectId);
    if (error) throw error;
  });

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

  it('scores several documents against one log in a single call', async () => {
    // The shape the documents list actually uses, and the one every other case
    // here misses by scoring a single document. `group by d.id` makes a
    // cross-document mix-up unlikely by construction, which is an argument for
    // why this passes rather than for why it should go untested — a deleted
    // unit case covered it and nothing replaced it.
    //
    // Both entries are created before both documents, so neither document's
    // `synthesised_at` can catch one by the created_at half of the predicate.
    // What separates the two counts is purely how far each one reached.
    const early = await entryAt('2026-08-01T00:00:00.000Z');
    const late = await entryAt('2026-08-20T00:00:00.000Z');

    const behind = await generatedDocument('Read only the early one', [early]);
    const current = await generatedDocument('Read the later one', [late]);

    const counts = await staleCountsFor(alice!.client as never, projectId);

    // Reached 2026-08-01, so the later entry is unread.
    expect(counts.get(behind)).toBe(1);
    // Reached 2026-08-20: the later entry is exactly on its mark and the
    // earlier one precedes it, so both are read.
    expect(counts.get(current)).toBe(0);
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

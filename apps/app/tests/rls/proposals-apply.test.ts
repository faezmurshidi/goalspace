import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { settleProposal } from '@/lib/db/proposals';
import { applyProposal } from '@/lib/proposals/apply';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

/**
 * The apply path against a real database.
 *
 * It lives here rather than in tests/unit because every behaviour worth
 * asserting is a database behaviour: the conditional claim that settles a
 * double-accept, the revision written before a document update, and the
 * agent_id that carries provenance onto the applied row. A stubbed client
 * would only prove that the stub was written to agree with the code.
 */

let alice: TestUser | undefined;
let projectId: string;
let agentId: string;
let runId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as Record<string, unknown> & { id: string };
};

const proposalOf = async (values: Record<string, unknown>) =>
  (
    await insert(alice!, 'proposals', {
      project_id: projectId,
      owner_id: alice!.id,
      agent_id: agentId,
      run_id: runId,
      rationale: 'Because the record says so.',
      ...values,
    })
  ).id;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`apply-alice-${Date.now()}@example.test`);

  projectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
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
      tools: ['propose_entry', 'propose_document', 'propose_document_edit'],
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
});

describe('applying an entry proposal', () => {
  it('creates the entry with agent_id set to the proposing agent', async () => {
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'decision', body: 'Dropped the vector index.' },
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: entry } = await alice!.client
      .from('entries')
      .select('body, agent_id')
      .eq('id', outcome.appliedId)
      .single();

    // Provenance is the whole reason phase 1 shipped a nullable agent_id.
    expect(entry!.agent_id).toBe(agentId);
    expect(entry!.body).toBe('Dropped the vector index.');
  });

  it('applies the owner’s edit rather than the agent’s words, and records it', async () => {
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'The agent’s wording.' },
    });

    const outcome = await applyProposal(client(), {
      proposalId: id,
      ownerId: alice!.id,
      payloadOverride: { kind: 'note', body: 'What the owner actually meant.' },
    });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: entry } = await alice!.client
      .from('entries')
      .select('body')
      .eq('id', outcome.appliedId)
      .single();
    expect(entry!.body).toBe('What the owner actually meant.');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('edited, applied_id, status')
      .eq('id', id)
      .single();
    expect(proposal!.edited).toBe(true);
    expect(proposal!.applied_id).toBe(outcome.appliedId);
    expect(proposal!.status).toBe('accepted');
  });

  it('produces one entry when the same proposal is accepted twice', async () => {
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'Only once.' },
    });

    const [first, second] = await Promise.all([
      applyProposal(client(), { proposalId: id, ownerId: alice!.id }),
      applyProposal(client(), { proposalId: id, ownerId: alice!.id }),
    ]);

    // The conditional claim is what makes this true: exactly one update can
    // move the row out of 'pending', so the loser never reaches the insert.
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(['applied', 'gone']);

    const { data: entries } = await alice!.client
      .from('entries')
      .select('id')
      .eq('project_id', projectId)
      .eq('body', 'Only once.');
    expect(entries).toHaveLength(1);
  });

  it('returns the proposal to the inbox when the payload is invalid', async () => {
    const id = await proposalOf({ kind: 'entry', payload: { kind: 'rambling', body: 'x' } });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('invalid');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('pending');
  });
});

describe('applying a document edit', () => {
  it('writes a revision carrying the previous body, then updates', async () => {
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Build notes',
      body: 'The original body.',
    });

    const id = await proposalOf({
      kind: 'document_edit',
      target_id: document.id,
      payload: {
        id: document.id,
        body: 'The rewritten body.',
        base_updated_at: document.updated_at as string,
      },
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');

    const { data: after } = await alice!.client
      .from('documents')
      .select('body, agent_id')
      .eq('id', document.id)
      .single();
    expect(after!.body).toBe('The rewritten body.');
    expect(after!.agent_id).toBe(agentId);

    // Phase 1's revision table is what gives the owner a way back.
    const { data: revisions } = await alice!.client
      .from('document_revisions')
      .select('body')
      .eq('document_id', document.id);
    expect(revisions).toHaveLength(1);
    expect(revisions![0].body).toBe('The original body.');
  });

  it('supersedes rather than overwriting work done since the proposal', async () => {
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Moving target',
      body: 'Version one.',
    });

    const id = await proposalOf({
      kind: 'document_edit',
      target_id: document.id,
      payload: {
        id: document.id,
        body: 'Written against version one.',
        base_updated_at: document.updated_at as string,
      },
    });

    // The owner writes something after the agent read the document.
    await alice!.client
      .from('documents')
      .update({
        body: 'Version two, by the owner.',
        updated_at: new Date(Date.now() + 60_000).toISOString(),
      })
      .eq('id', document.id);

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('superseded');

    const { data: after } = await alice!.client
      .from('documents')
      .select('body')
      .eq('id', document.id)
      .single();
    expect(after!.body).toBe('Version two, by the owner.');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('superseded');
  });
});

describe('state transitions are guarded by current status', () => {
  it('refuses to reject a proposal that was already applied', async () => {
    // Without the guard this flipped an applied proposal to 'rejected',
    // leaving a real entry in the log whose proposal claimed it was refused.
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'Already accepted.' },
    });

    const applied = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(applied.status).toBe('applied');

    const rejected = await settleProposal(client(), id, 'rejected', { from: 'pending' });
    expect(rejected).toBe(false);

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status, applied_id')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('accepted');
    expect(proposal!.applied_id).not.toBeNull();
  });

  it('leaves nothing behind when the payload is refused', async () => {
    // What the release path used to be for. There is no claim to put back now:
    // validation happens before apply_proposal is called at all, so a bad
    // payload never reaches the transaction and the proposal was never moved
    // off 'pending' in the first place.
    const id = await proposalOf({ kind: 'entry', payload: { kind: 'note', body: '' } });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('invalid');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status, decided_at, applied_id')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('pending');
    // Untouched, not restored — the difference the transaction makes.
    expect(proposal!.decided_at).toBeNull();
    expect(proposal!.applied_id).toBeNull();
  });

  it('never settles a proposal without the row it claims to have produced', async () => {
    // The invariant the transaction buys, stated directly: across every
    // proposal in the project, an accepted one has an applied_id and that id
    // resolves to a real row. Before, a failure between the insert and the
    // settle could leave an accepted proposal with a null applied_id, or a
    // pending one whose row already existed.
    const entryId = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'Settled with its row.' },
    });
    const docId = await proposalOf({
      kind: 'document',
      payload: { title: 'Settled with its row', body: 'Body.' },
    });

    for (const id of [entryId, docId]) {
      const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
      expect(outcome.status).toBe('applied');
    }

    const { data: accepted } = await alice!.client
      .from('proposals')
      .select('id, kind, applied_id')
      .eq('project_id', projectId)
      .eq('status', 'accepted');

    for (const proposal of accepted ?? []) {
      expect(proposal.applied_id).not.toBeNull();

      const table =
        proposal.kind === 'entry'
          ? 'entries'
          : proposal.kind === 'work_item'
            ? 'work_items'
            : 'documents';

      const { data: row } = await alice!.client
        .from(table)
        .select('id')
        .eq('id', proposal.applied_id!)
        .maybeSingle();
      expect(row).not.toBeNull();
    }
  });
});

describe('guarantees that only hold inside the transaction', () => {
  it('gives two work items accepted at once distinct positions', () => {
    // The lost update: two accepts lock two *different* proposal rows, so they
    // never contend, and both read the same max(order_index). Nothing in the
    // schema catches the collision — there is no unique constraint on
    // (project_id, order_index) — so the tree quietly orders them arbitrarily.
    //
    // The advisory lock keyed on the project is what serialises them. Without
    // it this test can still pass by luck; with it, it cannot fail.
    return (async () => {
      const first = await proposalOf({
        kind: 'work_item',
        payload: { title: 'Order me first', kind: 'task' },
      });
      const second = await proposalOf({
        kind: 'work_item',
        payload: { title: 'Order me second', kind: 'task' },
      });

      const outcomes = await Promise.all([
        applyProposal(client(), { proposalId: first, ownerId: alice!.id }),
        applyProposal(client(), { proposalId: second, ownerId: alice!.id }),
      ]);
      expect(outcomes.every((o) => o.status === 'applied')).toBe(true);

      const ids = outcomes.flatMap((o) => (o.status === 'applied' ? [o.appliedId] : []));
      const { data: items } = await alice!.client
        .from('work_items')
        .select('id, order_index')
        .in('id', ids);

      const positions = (items ?? []).map((i) => i.order_index);
      expect(new Set(positions).size).toBe(positions.length);
    })();
  });

  it('records an edit even when the caller says there was none', async () => {
    // `edited` is what lets the record say whose words landed. The RPC is
    // granted to `authenticated`, so a client can call it directly with altered
    // content and edited = false — marking its own writing as the agent's. The
    // flag is derived by comparison as well as taken on trust, so the claim
    // cannot be made falsely.
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'What the agent proposed.' },
    });

    const { error } = await alice!.client.rpc('apply_proposal', {
      p_proposal_id: id,
      p_payload: { kind: 'note', body: 'What the caller substituted.' },
      p_edited: false,
    });
    expect(error).toBeNull();

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('edited, applied_id, status')
      .eq('id', id)
      .single();

    expect(proposal!.status).toBe('accepted');
    expect(proposal!.edited).toBe(true);

    const { data: entry } = await alice!.client
      .from('entries')
      .select('body')
      .eq('id', proposal!.applied_id!)
      .single();
    expect(entry!.body).toBe('What the caller substituted.');
  });

  it('leaves edited false when the payload is untouched', async () => {
    // The comparison must not fire on a proposal accepted as written, or the
    // flag would mark everything edited and mean nothing. The payload stored at
    // propose time is already the output of the same schema the caller parses
    // through, so an unedited accept compares equal.
    const id = await proposalOf({
      kind: 'entry',
      payload: { kind: 'note', body: 'Accepted exactly as proposed.' },
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('edited')
      .eq('id', id)
      .single();
    expect(proposal!.edited).toBe(false);
  });
});

describe('concurrent document edits based on one version', () => {
  it('applies the first and supersedes the second', async () => {
    // Both proposals were written against the same body. Whichever lands
    // second must not overwrite the first, and the first body must survive in
    // the revision history that makes the edit reversible.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Contended',
      body: 'Base version.',
    });

    const base = document.updated_at as string;
    const first = await proposalOf({
      kind: 'document_edit',
      target_id: document.id,
      payload: { id: document.id, body: 'First edit.', base_updated_at: base },
    });
    const second = await proposalOf({
      kind: 'document_edit',
      target_id: document.id,
      payload: { id: document.id, body: 'Second edit.', base_updated_at: base },
    });

    const outcomes = await Promise.all([
      applyProposal(client(), { proposalId: first, ownerId: alice!.id }),
      applyProposal(client(), { proposalId: second, ownerId: alice!.id }),
    ]);

    const statuses = outcomes.map((o) => o.status).sort();
    expect(statuses).toEqual(['applied', 'superseded']);

    // Exactly one. The loser must not leave a revision behind for an edit it
    // never applied — that is what the row lock inside apply_document_edit
    // buys over a compare-and-set from the application.
    const { data: revisions } = await alice!.client
      .from('document_revisions')
      .select('body')
      .eq('document_id', document.id);
    expect(revisions).toHaveLength(1);
    expect(revisions![0].body).toBe('Base version.');
  });
});

describe('applying a document proposal', () => {
  it('creates the document with agent_id set to the proposing agent', async () => {
    const id = await proposalOf({
      kind: 'document',
      payload: {
        title: 'Harmonic constituents',
        body: 'Five constituents, chosen for the Solent.',
      },
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('title, body, agent_id')
      .eq('id', outcome.appliedId)
      .single();

    expect(doc!.title).toBe('Harmonic constituents');
    expect(doc!.body).toBe('Five constituents, chosen for the Solent.');
    // Provenance. Null would mean the owner typed it.
    expect(doc!.agent_id).toBe(agentId);

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status, applied_id, target_id')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('accepted');
    expect(proposal!.applied_id).toBe(outcome.appliedId);
    // target_id names the document being edited. A proposal to create one has
    // no document yet, so it stays null.
    expect(proposal!.target_id).toBeNull();
  });

  it('produces one document when the same proposal is accepted twice', async () => {
    // The claim is a conditional update from 'pending'. Two tabs racing must
    // yield one document, not two — the same guarantee entries already have.
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Bearing selection', body: 'Ceramic, for the salt.' },
    });

    const first = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    const second = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });

    expect(first.status).toBe('applied');
    expect(second.status).toBe('gone');

    const { data: docs } = await alice!.client
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('title', 'Bearing selection');
    expect(docs).toHaveLength(1);
  });

  it('applies the owner’s edit rather than the agent’s title', async () => {
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'The agent’s title', body: 'Body as drafted.' },
    });

    const outcome = await applyProposal(client(), {
      proposalId: id,
      ownerId: alice!.id,
      payloadOverride: { title: 'What the owner called it', body: 'Body as drafted.' },
    });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('title')
      .eq('id', outcome.appliedId)
      .single();
    expect(doc!.title).toBe('What the owner called it');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('edited')
      .eq('id', id)
      .single();
    expect(proposal!.edited).toBe(true);
  });

  it('returns the proposal to the inbox when the title is empty', async () => {
    const id = await proposalOf({ kind: 'document', payload: { title: '', body: 'x' } });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('invalid');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('pending');
  });
});

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

  it('keeps the mark when a regeneration cites nothing', async () => {
    // This is the case that actually needs greatest() rather than a plain
    // assignment: v_synth is null here, and plain assignment would null out a
    // mark a previous version had already earned. A regeneration that read
    // nothing new has not un-read what it already read.
    const older = await entryAt(OLDER, 'First pass.');

    const created = await proposalOf({
      kind: 'document',
      payload: { title: 'Keeps its mark', body: 'First body.' },
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
      citations: [],
    });
    expect((await applyProposal(client(), { proposalId: edit, ownerId: alice!.id })).status).toBe(
      'applied'
    );

    const { data: doc } = await alice!.client
      .from('documents')
      .select('synthesised_through')
      .eq('id', first.appliedId)
      .single();
    expect(new Date(doc!.synthesised_through!).toISOString()).toBe(OLDER);
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

  it('leaves the mark null when a citation names an id that is not a uuid', async () => {
    // The join compares as text rather than casting to uuid precisely so this
    // cannot raise. Reverting to a cast would abort the whole accept inside
    // the transaction, bricking the proposal permanently — this pins the
    // accept succeeding and the malformed citation simply not matching.
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Malformed citation', body: 'Body.' },
      citations: [{ type: 'entry', id: 'not-a-uuid' }],
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

  it('leaves the mark null when citations is a JSON object rather than an array', async () => {
    // jsonb_array_elements raises on anything that is not an array, including
    // an object — and nothing stops a direct PostgREST insert from storing
    // one, since citations is jsonb not null with no CHECK constraint. The
    // guard on the container needs the same totality as the guard on each
    // element already has.
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Object citations', body: 'Body.' },
      citations: {},
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
});

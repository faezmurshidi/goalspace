import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { applyProposal } from '@/lib/proposals/apply';
import { releaseProposal, settleProposal } from '@/lib/db/proposals';

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
      tools: ['propose_entry', 'propose_document_edit'],
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
      .update({ body: 'Version two, by the owner.', updated_at: new Date(Date.now() + 60_000).toISOString() })
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

  it('refuses to release a proposal that is not currently claimed', async () => {
    const id = await proposalOf({ kind: 'entry', payload: { kind: 'note', body: 'Pending.' } });

    // Nothing claimed it, so there is nothing to put back.
    expect(await releaseProposal(client(), id)).toBe(false);

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('pending');
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

    const { data: revisions } = await alice!.client
      .from('document_revisions')
      .select('body')
      .eq('document_id', document.id);
    expect(revisions!.some((r) => r.body === 'Base version.')).toBe(true);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProjectId: string;
let aliceProposalId: string;
let alicePublicProposalId: string;
let bobProjectId: string;
let bobAgentId: string;
let bobRunId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as { id: string };
};

const seedAgentAndRun = async (user: TestUser, projectId: string) => {
  const agentId = (
    await insert(user, 'agents', {
      project_id: projectId,
      owner_id: user.id,
      slug: `tutor-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Tutor',
      system_prompt: 'Draft things.',
      tools: ['propose_entry'],
    })
  ).id;

  const runId = (
    await insert(user, 'agent_runs', {
      project_id: projectId,
      owner_id: user.id,
      agent_id: agentId,
      trigger: 'conversation',
      status: 'running',
    })
  ).id;

  return { agentId, runId };
};

const seedProposal = async (user: TestUser, projectId: string, rationale: string) => {
  const { agentId, runId } = await seedAgentAndRun(user, projectId);
  return (
    await insert(user, 'proposals', {
      project_id: projectId,
      owner_id: user.id,
      agent_id: agentId,
      run_id: runId,
      kind: 'entry',
      payload: { kind: 'note', body: 'Drafted body' },
      rationale,
    })
  ).id;
};

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`prop-alice-${stamp}@example.test`);
  bob = await createTestUser(`prop-bob-${stamp}@example.test`);

  aliceProjectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
      kind: 'build',
    })
  ).id;

  const alicePublicProjectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'open-notes',
      title: 'Open notes',
      kind: 'learn',
      visibility: 'public',
    })
  ).id;

  bobProjectId = (
    await insert(bob, 'projects', {
      owner_id: bob.id,
      slug: 'bob-thing',
      title: 'Bob thing',
      kind: 'research',
    })
  ).id;

  const bobOwn = await seedAgentAndRun(bob, bobProjectId);
  bobAgentId = bobOwn.agentId;
  bobRunId = bobOwn.runId;

  aliceProposalId = await seedProposal(alice, aliceProjectId, 'Because the log says so.');
  alicePublicProposalId = await seedProposal(alice, alicePublicProjectId, 'Secret rationale.');
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('proposals RLS', () => {
  it('lets the owner read their own proposal', async () => {
    const { data } = await alice!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data?.length).toBe(1);
  });

  it('hides a proposal from another user', async () => {
    const { data } = await bob!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides proposals even on a PUBLIC project', async () => {
    // This is the assertion that matters. Phase 1's child tables carry a
    // public-read branch; copying it here would publish the rationale, the
    // payload, and the fact that a suggestion was rejected.
    const { data } = await bob!.client
      .from('proposals')
      .select('id, rationale')
      .eq('id', alicePublicProposalId);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses an insert that forges ownership', async () => {
    // Bob's own agent and run, so the row is referentially valid and the
    // insert can only fail on the policy. Using Alice's ids here would fail on
    // a foreign key first and hide an RLS regression behind a passing test.
    const { error } = await bob!.client.from('proposals').insert({
      project_id: bobProjectId,
      owner_id: alice!.id,
      agent_id: bobAgentId,
      run_id: bobRunId,
      kind: 'entry',
      payload: { kind: 'note', body: 'forged' },
      rationale: 'forged',
    });
    expect(error).toBeTruthy();
  });

  it('refuses to relocate a proposal into another user’s project', async () => {
    // Attempted by Alice, who *can* see the row. Bob cannot select it, so an
    // update by Bob matches nothing and the WITH CHECK clause never runs —
    // the assertion would pass without the policy existing at all.
    const { data, error } = await alice!.client
      .from('proposals')
      .update({ project_id: bobProjectId })
      .eq('id', aliceProposalId)
      .select();

    expect(error ?? (data ?? []).length === 0).toBeTruthy();

    const { data: unmoved } = await alice!.client
      .from('proposals')
      .select('project_id')
      .eq('id', aliceProposalId)
      .single();
    expect(unmoved!.project_id).toBe(aliceProjectId);
  });

  it('refuses a delete by another user', async () => {
    await bob!.client.from('proposals').delete().eq('id', aliceProposalId);
    const { data } = await alice!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data?.length).toBe(1);
  });
});

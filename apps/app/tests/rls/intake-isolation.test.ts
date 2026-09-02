import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProject: string;
let aliceAgent: string;
let aliceRun: string;
let bobProject: string;

beforeAll(async () => {
  alice = await createTestUser(`intake-a-${Date.now()}@example.test`);
  bob = await createTestUser(`intake-b-${Date.now()}@example.test`);

  const mk = async (user: TestUser, slug: string) => {
    const { data } = await user.client
      .from('projects')
      .insert({ owner_id: user.id, title: 'Intake', slug, kind: 'build' })
      .select()
      .single();
    return data!.id as string;
  };

  aliceProject = await mk(alice, `intake-a-${Date.now()}`);
  bobProject = await mk(bob, `intake-b-${Date.now()}`);

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      slug: 'planner',
      name: 'Planner',
      system_prompt: 'Propose.',
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();
  aliceAgent = agent!.id;

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      agent_id: aliceAgent,
      trigger: 'intake',
      status: 'succeeded',
    })
    .select()
    .single();
  aliceRun = run!.id;

  // The intake note, written by the owner rather than the agent.
  await alice.client.from('entries').insert({
    project_id: aliceProject,
    owner_id: alice.id,
    agent_id: null,
    kind: 'note',
    title: 'Intake',
    body: 'What are you building?\nA lathe restoration.',
  });

  await alice.client.from('proposals').insert({
    project_id: aliceProject,
    owner_id: alice.id,
    agent_id: aliceAgent,
    run_id: aliceRun,
    kind: 'work_item',
    payload: { title: 'Strip the bed ways', kind: 'task' },
    rationale: 'From the answers.',
    citations: [],
  });
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('intake isolation', () => {
  it('hides the intake note from another user', async () => {
    const { data } = await bob!.client.from('entries').select('id').eq('project_id', aliceProject);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides the intake proposals from another user', async () => {
    const { data } = await bob!.client
      .from('proposals')
      .select('id')
      .eq('project_id', aliceProject);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses a proposal attributed to another project’s agent', async () => {
    // The guard spec §6.2 leans on. Bob owns his own project, so RLS alone
    // would allow this insert — it is the composite foreign key on
    // (agent_id, project_id) that refuses it. Without it, an owner of two
    // projects could file a proposal in one and attribute it to an agent in
    // the other, and provenance would be forgeable.
    const { error } = await bob!.client.from('proposals').insert({
      project_id: bobProject,
      owner_id: bob!.id,
      agent_id: aliceAgent,
      run_id: aliceRun,
      kind: 'work_item',
      payload: { title: 'Forged', kind: 'task' },
      rationale: 'Should not land.',
      citations: [],
    });

    expect(error).not.toBeNull();
  });

  it('refuses an intake run against a project the caller does not own', async () => {
    const { error } = await bob!.client.from('agent_runs').insert({
      project_id: aliceProject,
      owner_id: bob!.id,
      agent_id: aliceAgent,
      trigger: 'intake',
      status: 'running',
    });

    expect(error).not.toBeNull();
  });
});

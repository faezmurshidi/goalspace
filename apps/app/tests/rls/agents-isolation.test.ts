import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProjectId: string;
let aliceAgentId: string;
let aliceRunId: string;
let alicePublicProjectId: string;
let alicePublicAgentId: string;
let bobProjectId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as { id: string };
};

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`agent-alice-${stamp}@example.test`);
  bob = await createTestUser(`agent-bob-${stamp}@example.test`);

  aliceProjectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
      kind: 'build',
    })
  ).id;

  // A public project, to prove publishing does NOT expose the agent layer.
  alicePublicProjectId = (
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

  aliceAgentId = (
    await insert(alice, 'agents', {
      project_id: aliceProjectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Argue with me.',
      tools: ['search_repo'],
    })
  ).id;

  alicePublicAgentId = (
    await insert(alice, 'agents', {
      project_id: alicePublicProjectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Secret prompt.',
      tools: ['search_repo'],
    })
  ).id;

  aliceRunId = (
    await insert(alice, 'agent_runs', {
      project_id: aliceProjectId,
      owner_id: alice.id,
      agent_id: aliceAgentId,
      trigger: 'conversation',
      status: 'succeeded',
    })
  ).id;

  await insert(alice, 'agent_tool_calls', {
    run_id: aliceRunId,
    project_id: aliceProjectId,
    owner_id: alice.id,
    tool: 'search_repo',
    args: { query: 'battery' },
    ok: true,
  });

  await insert(alice, 'ai_usage', {
    project_id: aliceProjectId,
    owner_id: alice.id,
    agent_id: aliceAgentId,
    run_id: aliceRunId,
    model: 'anthropic/claude-sonnet-5',
    input_tokens: 100,
    output_tokens: 50,
    cost_usd: 0.001,
  });
}, 60_000);

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('agent-layer isolation', () => {
  it('hides another owner’s agents', async () => {
    const { data } = await bob!.client.from('agents').select('id').eq('id', aliceAgentId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s runs', async () => {
    const { data } = await bob!.client.from('agent_runs').select('id').eq('id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s tool calls, including the query strings', async () => {
    const { data } = await bob!.client
      .from('agent_tool_calls')
      .select('id')
      .eq('run_id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s spend', async () => {
    const { data } = await bob!.client.from('ai_usage').select('id').eq('run_id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('does NOT expose agents of a PUBLIC project', async () => {
    const { data } = await bob!.client.from('agents').select('id').eq('id', alicePublicAgentId);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses an agent planted in another owner’s project', async () => {
    const { error } = await bob!.client.from('agents').insert({
      project_id: aliceProjectId,
      owner_id: bob!.id,
      slug: 'sneak',
      name: 'Sneak',
      system_prompt: 'x',
      tools: [],
    });
    expect(error).not.toBeNull();
  });

  it('refuses an agent whose owner_id is forged', async () => {
    const { error } = await bob!.client.from('agents').insert({
      project_id: bobProjectId,
      owner_id: alice!.id,
      slug: 'forged',
      name: 'Forged',
      system_prompt: 'x',
      tools: [],
    });
    expect(error).not.toBeNull();
  });

  it('scopes search_repo to the caller’s own project', async () => {
    const { data } = await bob!.client.rpc('search_repo', {
      p_project_id: aliceProjectId,
      p_query: 'battery',
      p_limit: 20,
    });
    expect(data ?? []).toHaveLength(0);
  });
});

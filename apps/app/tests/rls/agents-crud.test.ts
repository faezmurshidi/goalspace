import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getAgent, listAgents, updateAgent } from '@/lib/db/agents';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let agentId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`agents-crud-${Date.now()}@example.test`);
  bob = await createTestUser(`agents-bob-${Date.now()}@example.test`);

  const { data: project, error: pErr } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `robot-${Date.now()}`, kind: 'build' })
    .select()
    .single();
  if (pErr) throw pErr;
  projectId = project.id;

  const { data: agent, error: aErr } = await alice.client
    .from('agents')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Review decisions.',
      tools: ['search_repo'],
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();
  if (aErr) throw aErr;
  agentId = agent.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('agent read paths', () => {
  it('lists the project’s agents', async () => {
    const agents = await listAgents(client(), projectId);
    expect(agents.map((a) => a.slug)).toContain('critic');
  });

  it('reads one agent', async () => {
    const agent = await getAgent(client(), projectId, agentId);
    expect(agent?.name).toBe('Critic');
  });

  it('returns null for an agent in another project', async () => {
    const { data: other } = await alice!.client
      .from('projects')
      .insert({ owner_id: alice!.id, title: 'Other', slug: `other-${Date.now()}`, kind: 'build' })
      .select()
      .single();
    expect(await getAgent(client(), other!.id, agentId)).toBeNull();
  });
});

describe('agent updates', () => {
  it('changes the granted tools', async () => {
    const updated = await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: ['search_repo', 'read_document'],
      },
    });
    expect(updated?.tools.sort()).toEqual(['read_document', 'search_repo']);
  });

  it('deactivates without deleting', async () => {
    const updated = await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: false,
        tools: ['search_repo'],
      },
    });
    expect(updated?.is_active).toBe(false);

    // Reactivate, so later assertions in this file are not order-dependent.
    await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: ['search_repo'],
      },
    });
  });

  it('refuses an update aimed at another project', async () => {
    const { data: other } = await alice!.client
      .from('projects')
      .insert({ owner_id: alice!.id, title: 'Third', slug: `third-${Date.now()}`, kind: 'build' })
      .select()
      .single();

    const updated = await updateAgent(client(), {
      projectId: other!.id,
      values: {
        id: agentId,
        name: 'Hijacked',
        role_description: '',
        system_prompt: 'x',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: [],
      },
    });
    expect(updated).toBeNull();

    const untouched = await getAgent(client(), projectId, agentId);
    expect(untouched?.name).toBe('Critic');
  });
});

describe('a second user is isolated from these agents', () => {
  it('cannot read them', async () => {
    const seen = await listAgents(bob!.client as never, projectId);
    expect(seen).toEqual([]);
  });

  it('cannot update them', async () => {
    const updated = await updateAgent(bob!.client as never, {
      projectId,
      values: {
        id: agentId,
        name: 'Bob was here',
        role_description: '',
        system_prompt: 'x',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: [],
      },
    });
    expect(updated).toBeNull();

    const untouched = await getAgent(client(), projectId, agentId);
    expect(untouched?.name).toBe('Critic');
  });
});

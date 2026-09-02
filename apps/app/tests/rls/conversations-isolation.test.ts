import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProject: string;
let bobProject: string;
let aliceConversation: string;

beforeAll(async () => {
  alice = await createTestUser(`conv-a-${Date.now()}@example.test`);
  bob = await createTestUser(`conv-b-${Date.now()}@example.test`);

  const mk = async (user: TestUser, slug: string) => {
    const { data } = await user.client
      .from('projects')
      .insert({ owner_id: user.id, title: 'Chat', slug, kind: 'build' })
      .select()
      .single();
    return data!.id as string;
  };
  aliceProject = await mk(alice, `conv-a-${Date.now()}`);
  bobProject = await mk(bob, `conv-b-${Date.now()}`);

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      slug: 'partner',
      name: 'Partner',
      system_prompt: 'Talk.',
      model: 'zai/glm-5.3-flash',
    })
    .select()
    .single();

  const { data: conv } = await alice.client
    .from('conversations')
    .insert({ project_id: aliceProject, owner_id: alice.id, agent_id: agent!.id })
    .select()
    .single();
  aliceConversation = conv!.id;

  await alice.client.from('messages').insert({
    conversation_id: aliceConversation,
    project_id: aliceProject,
    owner_id: alice.id,
    role: 'user',
    content: 'Why did I drop the belt drive?',
  });
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('conversation isolation', () => {
  it('hides conversations from another user', async () => {
    const { data } = await bob!.client.from('conversations').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('hides messages from another user', async () => {
    const { data } = await bob!.client.from('messages').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses a message written into another owner’s conversation', async () => {
    // RLS on messages checks owner_id = auth.uid(); the conversation check is
    // what stops Bob claiming the row as his own while pointing it at Alice's
    // conversation.
    const { error } = await bob!.client.from('messages').insert({
      conversation_id: aliceConversation,
      project_id: bobProject,
      owner_id: bob!.id,
      role: 'user',
      content: 'Injected.',
    });
    expect(error).not.toBeNull();
  });

  it('refuses a role it does not know', async () => {
    // 'system' and 'tool' are deliberately absent: this table stores the
    // conversation as the owner sees it, not the model's full context window.
    const { error } = await alice!.client.from('messages').insert({
      conversation_id: aliceConversation,
      project_id: aliceProject,
      owner_id: alice!.id,
      role: 'system',
      content: 'Not a turn.',
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('23514');
  });

  it('links a run to its conversation', async () => {
    const { data: agent } = await alice!.client
      .from('agents')
      .select('id')
      .eq('project_id', aliceProject)
      .single();

    const { error } = await alice!.client.from('agent_runs').insert({
      project_id: aliceProject,
      owner_id: alice!.id,
      agent_id: agent!.id,
      conversation_id: aliceConversation,
      trigger: 'conversation',
      status: 'running',
    });
    expect(error).toBeNull();
  });
});

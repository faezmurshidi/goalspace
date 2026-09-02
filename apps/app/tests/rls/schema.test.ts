import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

config({ path: '.env.test' });

const admin = createClient(process.env.API_URL!, process.env.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

describe('phase 1 schema', () => {
  it('creates every table phase 1 needs', async () => {
    for (const table of [
      'users',
      'user_settings',
      'projects',
      'entries',
      'work_items',
      'documents',
      'document_revisions',
      'attachments',
    ]) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should exist`).toBeNull();
    }
  });

  it('exposes the account preference columns added for settings', async () => {
    // Same shape as the table-existence test above: a select that names the
    // columns fails with a PostgREST error if either is missing, which is
    // the regression this guards.
    const { error } = await admin.from('user_settings').select('locale, time_zone').limit(1);
    expect(error).toBeNull();
  });

  it('carries no legacy tables', async () => {
    for (const table of [
      'goals',
      'spaces',
      'modules',
      'tasks',
      'chat_messages',
      'blog_posts',
      'document_embeddings',
    ]) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should not exist`).not.toBeNull();
    }
  });
});

describe('agent_runs.trigger', () => {
  let owner: TestUser | undefined;
  let projectId: string;
  let agentId: string;

  beforeAll(async () => {
    owner = await createTestUser(`trigger-${Date.now()}@example.test`);

    const { data: project } = await owner.client
      .from('projects')
      .insert({
        owner_id: owner.id,
        title: 'Intake trigger',
        slug: `trigger-${Date.now()}`,
        kind: 'build',
      })
      .select()
      .single();
    projectId = project!.id;

    const { data: agent } = await owner.client
      .from('agents')
      .insert({
        project_id: projectId,
        owner_id: owner.id,
        slug: 'interviewer',
        name: 'Interviewer',
        system_prompt: 'Ask.',
        model: 'openai/gpt-4o-mini',
      })
      .select()
      .single();
    agentId = agent!.id;
  });

  afterAll(async () => {
    if (owner) await deleteTestUser(owner.id);
  });

  it('accepts an intake run', async () => {
    // Both intake runs are neither a conversation nor an action on a work
    // item. Filing them as 'conversation' would make the cost of an intake
    // unrecoverable from the trace once the Planner is reachable from a
    // general ask surface, because the agent id stops discriminating.
    const { error } = await owner!.client.from('agent_runs').insert({
      project_id: projectId,
      owner_id: owner!.id,
      agent_id: agentId,
      trigger: 'intake',
      status: 'running',
    });

    expect(error).toBeNull();
  });

  it('still refuses a trigger it does not know', async () => {
    // The constraint is widened, not removed. A typo must remain a write that
    // fails rather than a value nothing can interpret.
    const { error } = await owner!.client.from('agent_runs').insert({
      project_id: projectId,
      owner_id: owner!.id,
      agent_id: agentId,
      trigger: 'onboarding',
      status: 'running',
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe('23514');
  });
});

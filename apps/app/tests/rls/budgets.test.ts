import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getBudget, monthToDateSpend, updateBudget } from '@/lib/db/budgets';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`budgets-${Date.now()}@example.test`);

  const { data: project } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `b-${Date.now()}`, kind: 'build' })
    .select()
    .single();
  projectId = project!.id;

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Review.',
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agent!.id,
      trigger: 'conversation',
      status: 'succeeded',
    })
    .select()
    .single();

  // Two inserts, not one array with mixed keys: PostgREST builds a bulk
  // insert's column list from the union of keys across all rows, and a row
  // that omits a key present on a sibling gets an explicit NULL for it rather
  // than the column default — which trips ai_usage's `created_at not null`
  // constraint and fails the whole batch. Splitting keeps each insert's rows
  // homogeneous so `created_at` defaults to `now()` on the pair that should
  // land in the current month.
  await alice.client.from('ai_usage').insert([
    {
      project_id: projectId,
      owner_id: alice.id,
      run_id: run!.id,
      model: 'openai/gpt-4o-mini',
      cost_usd: 1.25,
    },
    {
      project_id: projectId,
      owner_id: alice.id,
      run_id: run!.id,
      model: 'openai/gpt-4o-mini',
      cost_usd: 0.75,
    },
  ]);

  // Last month: outside the window the cap uses, so it must not be counted.
  await alice.client.from('ai_usage').insert({
    project_id: projectId,
    owner_id: alice.id,
    run_id: run!.id,
    model: 'openai/gpt-4o-mini',
    cost_usd: 99,
    created_at: '2020-01-15T00:00:00Z',
  });
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('getBudget', () => {
  it('creates the row with its defaults on first read', async () => {
    const budget = await getBudget(client(), projectId, alice!.id);
    expect(budget.monthly_cap_usd).toBe(10);
    expect(budget.per_run_token_cap).toBe(200_000);
  });

  it('is idempotent — a second read does not duplicate the row', async () => {
    await getBudget(client(), projectId, alice!.id);
    const { data } = await alice!.client
      .from('project_budgets')
      .select('project_id')
      .eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });
});

describe('updateBudget', () => {
  it('changes both caps', async () => {
    const updated = await updateBudget(client(), {
      projectId,
      ownerId: alice!.id,
      values: { monthly_cap_usd: 42.5, per_run_token_cap: 150_000 },
    });
    expect(updated?.monthly_cap_usd).toBe(42.5);
    expect(updated?.per_run_token_cap).toBe(150_000);
  });

  it('refuses another owner', async () => {
    bob = await createTestUser(`budgets-bob-${Date.now()}@example.test`);
    const updated = await updateBudget(bob.client as never, {
      projectId,
      ownerId: bob.id,
      values: { monthly_cap_usd: 0, per_run_token_cap: 1_000 },
    });
    expect(updated).toBeNull();

    const untouched = await getBudget(client(), projectId, alice!.id);
    expect(untouched.monthly_cap_usd).toBe(42.5);
  });
});

describe('monthToDateSpend', () => {
  it('sums this calendar month and excludes earlier months', async () => {
    // The window must match start_agent_run's exactly, or the page shows a
    // number that disagrees with what refuses a run.
    expect(await monthToDateSpend(client(), projectId)).toBeCloseTo(2.0, 6);
  });

  it('reports zero for another owner, who can see none of it', async () => {
    expect(await monthToDateSpend(bob!.client as never, projectId)).toBe(0);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getRun, listRunProposals, listRunsForAgent, listToolCalls, runCostUsd } from '@/lib/db/runs';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let agentId: string;
let runId: string;
let proposalId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`runs-${Date.now()}@example.test`);

  const { data: project } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `runs-${Date.now()}`, kind: 'build' })
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
  agentId = agent!.id;

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      trigger: 'conversation',
      status: 'succeeded',
      step_count: 2,
    })
    .select()
    .single();
  runId = run!.id;

  await alice.client.from('agent_tool_calls').insert([
    {
      run_id: runId,
      project_id: projectId,
      owner_id: alice.id,
      tool: 'search_repo',
      args: { query: 'servo' },
      ok: true,
      duration_ms: 12,
      result_summary: '3 hits',
    },
    {
      run_id: runId,
      project_id: projectId,
      owner_id: alice.id,
      tool: 'read_document',
      args: { id: 'x' },
      ok: false,
      duration_ms: 4,
    },
  ]);

  await alice.client.from('ai_usage').insert([
    {
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      run_id: runId,
      model: 'openai/gpt-4o-mini',
      input_tokens: 1000,
      output_tokens: 500,
      cost_usd: 0.25,
    },
    {
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      run_id: runId,
      model: 'openai/gpt-4o-mini',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.05,
    },
  ]);

  const { data: proposal } = await alice.client
    .from('proposals')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      run_id: runId,
      kind: 'entry',
      payload: { body: 'Servo calibrated.' },
      rationale: 'The log has no entry for this session yet.',
    })
    .select()
    .single();
  proposalId = proposal!.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('run reads', () => {
  it('reads a run in its project', async () => {
    const run = await getRun(client(), projectId, runId);
    expect(run?.status).toBe('succeeded');
    expect(run?.step_count).toBe(2);
  });

  it('lists tool calls oldest first, so the trace reads in execution order', async () => {
    const calls = await listToolCalls(client(), runId);
    expect(calls.map((c) => c.tool)).toEqual(['search_repo', 'read_document']);
    expect(calls[1].ok).toBe(false);
  });

  it('lists an agent’s runs newest first', async () => {
    const runs = await listRunsForAgent(client(), agentId);
    expect(runs[0].id).toBe(runId);
  });

  it('sums cost across every usage row for the run', async () => {
    // Cost is summed from ai_usage rather than read from agent_runs, which has
    // only reserved_usd — a pre-flight reservation, not a charge. Reporting the
    // reservation would overstate every completed run.
    expect(await runCostUsd(client(), runId)).toBeCloseTo(0.3, 6);
  });

  it('lists the proposals a run produced', async () => {
    const proposals = await listRunProposals(client(), runId);
    expect(proposals.map((p) => p.id)).toEqual([proposalId]);
    expect(proposals[0].rationale).toBe('The log has no entry for this session yet.');
  });

  it('reports zero for a run with no usage rows', async () => {
    const { data: bare } = await alice!.client
      .from('agent_runs')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        agent_id: agentId,
        trigger: 'conversation',
        status: 'running',
      })
      .select()
      .single();
    expect(await runCostUsd(client(), bare!.id)).toBe(0);
  });
});

describe('a second user is isolated from these runs', () => {
  it('cannot read the run, its calls, or its cost', async () => {
    bob = await createTestUser(`runs-bob-${Date.now()}@example.test`);
    expect(await getRun(bob.client as never, projectId, runId)).toBeNull();
    expect(await listToolCalls(bob.client as never, runId)).toEqual([]);
    expect(await runCostUsd(bob.client as never, runId)).toBe(0);
    expect(await listRunProposals(bob.client as never, runId)).toEqual([]);
  });
});

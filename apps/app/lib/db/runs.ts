import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

/**
 * The generated type widens `status` to `string`, but the `agent_runs` CHECK
 * constraint limits it to exactly these five values — which are exactly the
 * `app.runs.status.*` locale keys. Narrowed here, the same way
 * `lib/db/proposals.ts` narrows `Proposal['status']`, so `t('app.runs.status.'
 * + run.status)` is checked against the keys at compile time instead of
 * failing silently at render time on a typo.
 */
export type Run = Omit<Tables<'agent_runs'>, 'status'> & {
  status: 'running' | 'succeeded' | 'failed' | 'cancelled' | 'capped';
};
export type ToolCall = Tables<'agent_tool_calls'>;

const RUN_COLUMNS =
  'id, project_id, owner_id, agent_id, work_item_id, trigger, status, step_count, error, reserved_usd, started_at, ended_at';

const TOOL_CALL_COLUMNS =
  'id, run_id, project_id, owner_id, tool, args, result_summary, ok, duration_ms, created_at';

export async function getRun(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Run | null> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select(RUN_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as Run | null;
}

/**
 * A run's tool calls, oldest first.
 *
 * Ascending on purpose: the trace is a narrative of what the agent did, and it
 * only reads as one in the order it happened. Every other list in the product
 * is newest-first because it answers "what changed"; this one answers "what
 * did it do", which is the opposite question.
 */
export async function listToolCalls(supabase: Client, runId: string): Promise<ToolCall[]> {
  const { data, error } = await supabase
    .from('agent_tool_calls')
    .select(TOOL_CALL_COLUMNS)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ToolCall[];
}

export async function listRunsForAgent(
  supabase: Client,
  agentId: string,
  limit = 20
): Promise<Run[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select(RUN_COLUMNS)
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Run[];
}

/**
 * What a run actually cost, summed from `ai_usage`.
 *
 * Not `agent_runs.reserved_usd`, which is what the cap check set aside before
 * the run started. A reservation is an upper bound; reporting it as the cost
 * would overstate every run that finished under budget, which is most of them.
 *
 * The generated type widens `cost_usd` to `number`, but PostgREST returns
 * Postgres `numeric` columns as strings on the wire — summing them directly
 * would silently concatenate instead of add. Coerced through `Number` before
 * the sum for that reason, not because the type says to.
 */
export async function runCostUsd(supabase: Client, runId: string): Promise<number> {
  const { data, error } = await supabase.from('ai_usage').select('cost_usd').eq('run_id', runId);

  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + Number(row.cost_usd), 0);
}

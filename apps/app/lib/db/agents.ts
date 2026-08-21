import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type RunTrigger = 'conversation' | 'work_item_action';

export interface StartRunInput {
  projectId: string;
  agentId: string;
  workItemId: string | null;
  trigger: RunTrigger;
  /** Worst-case cost of this run, held against the cap while it is in flight. */
  reservedUsd: number;
}

export type StartRunResult =
  | { started: true; runId: string }
  | { started: false; monthToDateUsd: number; monthlyCapUsd: number };

/**
 * Opens a run, or refuses because the project is out of budget.
 *
 * Wraps the start_agent_run RPC rather than calling it inline for two reasons.
 * The generated function types model neither a nullable argument nor a
 * nullable column in the result — p_work_item_id is genuinely optional and
 * run_id is null on refusal — so a cast is needed, and it belongs in one place
 * rather than at every call site. And types/supabase.ts is generated: nudging
 * its nullability by hand would be reverted by the next `gen types` without
 * anyone noticing.
 *
 * The check and the insert happen inside the function, under a per-project
 * advisory lock, because doing them as two round trips is what let two
 * concurrent runs both pass the cap.
 */
export async function startAgentRun(
  supabase: Client,
  input: StartRunInput
): Promise<StartRunResult> {
  const { data, error } = await supabase.rpc('start_agent_run', {
    p_project_id: input.projectId,
    p_agent_id: input.agentId,
    p_work_item_id: input.workItemId as string,
    p_trigger: input.trigger,
    p_reserved_usd: input.reservedUsd,
  });

  if (error) throw error;

  const verdict = data?.[0];
  if (!verdict) throw new Error('start_agent_run returned no verdict');

  if (!verdict.allowed) {
    return {
      started: false,
      monthToDateUsd: Number(verdict.month_to_date),
      monthlyCapUsd: Number(verdict.monthly_cap),
    };
  }

  return { started: true, runId: verdict.run_id };
}

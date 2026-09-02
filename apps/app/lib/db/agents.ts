import type { SupabaseClient } from '@supabase/supabase-js';

import type { UpdateAgentValues } from '@/lib/schemas/agent';
import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type RunTrigger = 'conversation' | 'work_item_action' | 'intake';

export interface StartRunInput {
  projectId: string;
  agentId: string;
  workItemId: string | null;
  trigger: RunTrigger;
  /** Worst-case cost of this run, held against the cap while it is in flight. */
  reservedUsd: number;
  /**
   * The conversation this run belongs to, linked immediately after it opens.
   *
   * Not a parameter of start_agent_run. That function exists to make the cap
   * check and the insert atomic under an advisory lock, and a foreign key that
   * nothing reads until the run ends does not need to be inside that lock.
   * Adding a parameter would mean migrating a security-invoker function for a
   * link a follow-up statement sets just as correctly.
   */
  conversationId?: string | null;
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

  const runId = verdict.run_id as string;

  if (input.conversationId) {
    await supabase
      .from('agent_runs')
      .update({ conversation_id: input.conversationId })
      .eq('id', runId);
  }

  return { started: true, runId };
}

export type Agent = Tables<'agents'>;

const AGENT_COLUMNS =
  'id, project_id, owner_id, slug, name, role_description, system_prompt, tools, model, is_active, created_at, updated_at';

export async function listAgents(supabase: Client, projectId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', projectId)
    .order('name');

  if (error) throw error;
  return (data ?? []) as Agent[];
}

export async function getAgent(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Agent | null;
}

/**
 * Update an agent, scoped to the project it belongs to.
 *
 * The `project_id` filter is not redundant with RLS. RLS stops another owner's
 * agent being written; this stops *this* owner writing an agent through the
 * wrong project's page, which is the difference between a policy violation and
 * a routing bug. Returns null when nothing matched, so the caller can tell
 * "refused" from "changed", rather than reporting a silent no-op as success.
 *
 * `tools` and `model` are validated by `updateAgentSchema` before they arrive.
 * Neither is re-checked here — but note that both must be, somewhere: an
 * unknown tool name is dropped silently by `resolveTools` at run time, and an
 * unpriced model silently zeroes both the spend cap and the run reservation.
 */
export async function updateAgent(
  supabase: Client,
  { projectId, values }: { projectId: string; values: UpdateAgentValues }
): Promise<Agent | null> {
  const { id, ...fields } = values;

  const { data, error } = await supabase
    .from('agents')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('project_id', projectId)
    .select(AGENT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Agent | null;
}

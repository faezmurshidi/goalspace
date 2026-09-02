import type { SupabaseClient } from '@supabase/supabase-js';
import type { LanguageModelUsage } from 'ai';

import { costUsd, gatewayCostFrom } from '@/lib/agents/cost';
import type { Database } from '@/types/supabase';

/**
 * One definition of what a run cost and how it is recorded.
 *
 * Three callers reach this: the streaming ask route, `runStructured`, and
 * `runTooled`. They differ in how the model is invoked and in nothing else, so
 * the accounting lives here rather than being copied into each. The copy that
 * drifted would be the one nobody is looking at, and it would drift silently —
 * a mispriced run reads as a cheaper run, never as an error.
 */

type Client = SupabaseClient<Database>;

export interface RunTokens {
  nonCachedInput: number;
  outputTokens: number;
  cachedInput: number;
}

/**
 * Splits a usage report into the three counts `costUsd` prices separately.
 *
 * `ai@7` moved cached tokens into `inputTokenDetails`; there is no
 * `usage.cachedInputTokens`. The two input counts must stay disjoint because
 * `costUsd` adds both at different rates, so `inputTokens` (the total) is only
 * a fallback for a provider that reports no detail at all.
 */
export function tokensFromUsage(usage: LanguageModelUsage): RunTokens {
  const cachedInput = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const nonCachedInput = usage.inputTokenDetails?.noCacheTokens ?? usage.inputTokens ?? 0;
  return {
    nonCachedInput,
    outputTokens: usage.outputTokens ?? 0,
    cachedInput,
  };
}

export interface RecordUsageParams {
  projectId: string;
  ownerId: string;
  agentId: string;
  runId: string;
  workItemId: string | null;
  model: string;
  usage: LanguageModelUsage;
  providerMetadata: unknown;
}

export async function recordRunUsage(supabase: Client, params: RecordUsageParams): Promise<void> {
  const { nonCachedInput, outputTokens, cachedInput } = tokensFromUsage(params.usage);

  await supabase.from('ai_usage').insert({
    project_id: params.projectId,
    owner_id: params.ownerId,
    agent_id: params.agentId,
    run_id: params.runId,
    work_item_id: params.workItemId,
    model: params.model,
    input_tokens: nonCachedInput,
    output_tokens: outputTokens,
    cached_input_tokens: cachedInput,
    cost_usd: costUsd({
      model: params.model,
      inputTokens: nonCachedInput,
      outputTokens,
      cachedInputTokens: cachedInput,
      // What the gateway says it charged beats the local table, which drifts
      // silently the moment a provider reprices.
      gatewayCostUsd: gatewayCostFrom(params.providerMetadata),
    }),
  });
}

export async function finishRun(
  supabase: Client,
  runId: string,
  patch: { status: 'succeeded' | 'failed' | 'capped'; stepCount?: number; error?: string }
): Promise<void> {
  await supabase
    .from('agent_runs')
    .update({
      status: patch.status,
      ...(patch.stepCount === undefined ? {} : { step_count: patch.stepCount }),
      ...(patch.error === undefined ? {} : { error: patch.error }),
      ended_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

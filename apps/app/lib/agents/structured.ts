import type { SupabaseClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import type { z } from 'zod';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { startAgentRun, type RunTrigger } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import type { Database } from '@/types/supabase';

/**
 * A metered run that returns an object instead of a stream.
 *
 * The second entry point to the agent layer, not a second executor. It shares
 * the reservation, the cap check, the cost metering and the run recording with
 * `app/api/agents/[agentId]/ask/route.ts`; what it does not share is the tool
 * loop, because it has none.
 *
 * That absence is the reason for the guard below. `buildToolSet` is never
 * called here, so an agent handed to this function with a non-empty allowlist
 * would run with its capabilities silently dropped — describable in the agents
 * list, unenforced in practice. Refusing loudly is the only honest option: a
 * capability boundary that is sometimes not consulted is not a boundary.
 */

export interface StructuredAgent {
  id: string;
  project_id: string;
  system_prompt: string;
  model: string;
  tools: readonly string[];
}

export type StructuredRunResult<T> =
  | { ok: true; runId: string; object: T }
  | { ok: false; reason: 'capped' | 'failed'; message: string };

export interface StructuredRunInput<T> {
  supabase: SupabaseClient<Database>;
  agent: StructuredAgent;
  ownerId: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Defaults to 'intake', the only caller in slice 2c-2. */
  trigger?: RunTrigger;
}

export async function runStructured<T>(
  input: StructuredRunInput<T>
): Promise<StructuredRunResult<T>> {
  const { supabase, agent, ownerId, prompt, schema, trigger = 'intake' } = input;

  // First, before any I/O. A guard that ran after the reservation would leave
  // an opened run nothing ever closes, holding budget until it ages out.
  if (agent.tools.length > 0) {
    throw new Error(
      `runStructured refuses agent ${agent.id}: it holds ${agent.tools.length} tool(s) and ` +
        'structured runs build no tool set, so the allowlist would not be enforced.'
    );
  }

  const budget = await getBudget(supabase, agent.project_id, ownerId);

  const start = await startAgentRun(supabase, {
    projectId: agent.project_id,
    agentId: agent.id,
    workItemId: null,
    trigger,
    reservedUsd: worstCaseUsd(agent.model, budget.per_run_token_cap),
  });

  if (!start.started) {
    // Same two-case wording as the ask route: checkCaps owns the message, but
    // it only refuses on spend already recorded, so a refusal can also mean
    // in-flight runs hold the headroom.
    const verdict = checkCaps({
      budget,
      monthToDateUsd: start.monthToDateUsd,
      runTokens: 0,
    });
    return {
      ok: false,
      reason: 'capped',
      message: verdict.allowed
        ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
        : verdict.message,
    };
  }

  const runId = start.runId;

  try {
    const result = await generateObject({
      model: agent.model,
      system: agent.system_prompt,
      prompt,
      schema,
      maxRetries: 1,
    });

    await recordRunUsage(supabase, {
      projectId: agent.project_id,
      ownerId,
      agentId: agent.id,
      runId,
      workItemId: null,
      model: agent.model,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });

    // One model call, so one step. Recorded rather than left at its default so
    // the trace does not imply the run did nothing.
    await finishRun(supabase, runId, { status: 'succeeded', stepCount: 1 });

    return { ok: true, runId, object: result.object };
  } catch (error) {
    // A schema mismatch lands here too: generateObject throws when the model
    // returns something the schema rejects, which is how the five-to-ten
    // question bound is enforced rather than requested.
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(supabase, runId, { status: 'failed', error: message });
    return { ok: false, reason: 'failed', message };
  }
}

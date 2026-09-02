import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText, stepCountIs } from 'ai';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { startAgentRun, type RunTrigger } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import type { Database } from '@/types/supabase';

/**
 * A tool loop a server action can await.
 *
 * The ask route runs the same loop inside a stream, because a conversation
 * wants tokens as they arrive. An intake does not: the wizard needs the run id
 * and the proposals the run produced, and has no use for the prose. Streaming
 * to a caller that discards the stream would also leave the action unable to
 * know when the run finished.
 *
 * Everything that constitutes a control is shared with the streaming path: the
 * reservation, the caps, the tool set, and the metering. What differs is
 * `generateText` in place of `streamText`.
 */

export interface TooledAgent {
  id: string;
  project_id: string;
  system_prompt: string;
  model: string;
  tools: readonly string[];
}

export type TooledRunResult =
  | { ok: true; runId: string; text: string }
  | { ok: false; reason: 'capped' | 'failed'; message: string };

export interface TooledRunInput {
  supabase: SupabaseClient<Database>;
  agent: TooledAgent;
  ownerId: string;
  prompt: string;
  /** Defaults to 'intake', the only caller today. */
  trigger?: RunTrigger;
  /**
   * The project skeleton, appended to the system prompt.
   *
   * The streaming ask route has always sent this; runTooled did not, so a
   * delegated agent ran with no idea what project it was in. Asked to break
   * down a restoration it had never seen, the Planner proposed from the
   * question alone and invented citation ids twenty-one times before the step
   * cap stopped it. Orientation is not a nicety here — the citation rule is
   * unsatisfiable without it.
   */
  context?: string;
}

const MAX_STEPS = 12;

export async function runTooled(input: TooledRunInput): Promise<TooledRunResult> {
  const { supabase, agent, ownerId, prompt, trigger = 'intake', context: projectContext } = input;

  // First, before any I/O — the mirror of runStructured's guard. An agent with
  // an empty allowlist in a tool loop can only talk, and a reservation would be
  // spent on a run that cannot do the thing it was started for.
  if (agent.tools.length === 0) {
    throw new Error(
      `runTooled refuses agent ${agent.id}: it holds no tools, so a tool loop has nothing to call.`
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
    const verdict = checkCaps({ budget, monthToDateUsd: start.monthToDateUsd, runTokens: 0 });
    return {
      ok: false,
      reason: 'capped',
      message: verdict.allowed
        ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
        : verdict.message,
    };
  }

  const runId = start.runId;
  let cappedByTokens = false;

  const context: RunContext = {
    supabase,
    projectId: agent.project_id,
    ownerId,
    agentId: agent.id,
    runId,
    allowlist: agent.tools,
    // Per-run, as in the ask route: a version read in one run must not vouch
    // for an edit proposed in another.
    documentVersions: new Map<string, string>(),
  };

  try {
    const result = await generateText({
      model: agent.model,
      system: projectContext
        ? `${agent.system_prompt}\n\n---\n\nThe project as it stands:\n\n${projectContext}`
        : agent.system_prompt,
      prompt,
      tools: buildToolSet(context),
      stopWhen: [
        stepCountIs(MAX_STEPS),
        ({ steps }) => {
          const runTokens = steps.reduce((n, s) => n + (s.usage.totalTokens ?? 0), 0);
          // Only the per-run cap is live mid-run: the monthly cap was settled
          // atomically at start and this run's worst case is already reserved.
          const verdict = checkCaps({ budget, monthToDateUsd: 0, runTokens });
          if (!verdict.allowed) cappedByTokens = true;
          return !verdict.allowed;
        },
      ],
      maxRetries: 1,
    });

    // generateText resolves once, so usage is recorded per step here rather
    // than through an onStepEnd callback. Same rows, same rates.
    for (const step of result.steps) {
      await recordRunUsage(supabase, {
        projectId: agent.project_id,
        ownerId,
        agentId: agent.id,
        runId,
        workItemId: null,
        model: agent.model,
        usage: step.usage,
        providerMetadata: step.providerMetadata,
      });
    }

    await finishRun(supabase, runId, {
      status: cappedByTokens ? 'capped' : 'succeeded',
      stepCount: result.steps.length,
    });

    // A capped run keeps whatever it produced. Its proposals are real and the
    // owner still reviews them; the trace records that it was cut short.
    return { ok: true, runId, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(supabase, runId, { status: 'failed', error: message });
    return { ok: false, reason: 'failed', message };
  }
}

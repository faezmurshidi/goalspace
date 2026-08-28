import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { buildSkeleton, type SkeletonWorkItem } from '@/lib/agents/skeleton';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { checkCaps } from '@/lib/agents/caps';
import { startAgentRun } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import { costUsd, gatewayCostFrom, worstCaseUsd } from '@/lib/agents/cost';

/**
 * The loop runs inside the stream.
 *
 * Flushing tokens as they arrive keeps the connection alive through a
 * multi-step retrieval loop and gives the conversation UI its streaming for
 * free. The hard step limit is what keeps a stuck model from running until
 * the platform kills it; the per-run token cap is what keeps it from costing
 * anything meaningful if it does.
 */
export const maxDuration = 300;

const MAX_STEPS = 12;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { prompt, workItemId } = (await request.json()) as {
    prompt?: string;
    workItemId?: string;
  };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  // RLS means this returns nothing unless the caller owns the agent.
  const { data: agent } = await supabase
    .from('agents')
    .select('id, project_id, owner_id, system_prompt, tools, model, is_active')
    .eq('id', agentId)
    .single();
  if (!agent || !agent.is_active) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
  }

  const budget = await getBudget(supabase, agent.project_id, auth.user.id);

  // Reserving and opening the run is one atomic step inside the database. The
  // old shape — read spend, decide, then insert — let two runs starting
  // together both read the same headroom and both proceed.
  const start = await startAgentRun(supabase, {
    projectId: agent.project_id,
    agentId: agent.id,
    workItemId: workItemId ?? null,
    trigger: workItemId ? 'work_item_action' : 'conversation',
    reservedUsd: worstCaseUsd(agent.model, budget.per_run_token_cap),
  });

  if (!start.started) {
    const verdict = checkCaps({
      budget,
      monthToDateUsd: start.monthToDateUsd,
      runTokens: 0,
    });
    return NextResponse.json(
      {
        // checkCaps owns the wording, but it only refuses on spend already
        // recorded. A refusal here can also mean in-flight runs have the
        // budget reserved, so fall back to a message that says so.
        error: verdict.allowed
          ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
          : verdict.message,
        cap: 'monthly',
      },
      { status: 402 }
    );
  }

  const runId = start.runId;

  const context: RunContext = {
    supabase,
    projectId: agent.project_id,
    ownerId: auth.user.id,
    agentId: agent.id,
    runId,
    allowlist: agent.tools,
    // One map per run: read_document fills it, propose_document_edit requires
    // it. Scoped to the run so a version read in one conversation cannot
    // vouch for an edit proposed in another.
    documentVersions: new Map<string, string>(),
  };

  const skeleton = await loadSkeleton(supabase, agent.project_id);

  let cappedByTokens = false;

  const result = streamText({
    model: agent.model,
    system: `${agent.system_prompt}\n\n---\n\nThe project as it stands:\n\n${skeleton}`,
    prompt,
    tools: buildToolSet(context),
    stopWhen: [
      stepCountIs(MAX_STEPS),
      ({ steps }) => {
        const runTokens = steps.reduce((total, step) => total + (step.usage.totalTokens ?? 0), 0);
        // Only the per-run token cap is live here. The monthly cap was settled
        // atomically at start and this run's worst case is already reserved
        // against it, so re-checking it mid-run would either duplicate that
        // decision or act on a figure this run is itself still changing.
        const verdict = checkCaps({ budget, monthToDateUsd: 0, runTokens });
        if (!verdict.allowed) cappedByTokens = true;
        return !verdict.allowed;
      },
    ],
    maxRetries: 1,
    // onStepFinish/onFinish are deprecated in ai@7; onStepEnd receives the
    // same StepResult and onEnd carries the aggregated steps.
    onStepEnd: async (step) => {
      // v7 moved cached tokens into inputTokenDetails — there is no
      // usage.cachedInputTokens. costUsd prices input and cached input at
      // different rates and adds both, so the two must be disjoint: record
      // the non-cached count as input_tokens, not the total.
      const cachedInput = step.usage.inputTokenDetails.cacheReadTokens ?? 0;
      const nonCachedInput = step.usage.inputTokenDetails.noCacheTokens ?? step.usage.inputTokens ?? 0;
      const outputTokens = step.usage.outputTokens ?? 0;

      await supabase.from('ai_usage').insert({
        project_id: agent.project_id,
        owner_id: auth.user.id,
        agent_id: agent.id,
        run_id: runId,
        work_item_id: workItemId ?? null,
        model: agent.model,
        input_tokens: nonCachedInput,
        output_tokens: outputTokens,
        cached_input_tokens: cachedInput,
        cost_usd: costUsd({
          model: agent.model,
          inputTokens: nonCachedInput,
          outputTokens,
          cachedInputTokens: cachedInput,
          // What the gateway says it charged beats the local table, which
          // drifts silently the moment a provider reprices.
          gatewayCostUsd: gatewayCostFrom(step.providerMetadata),
        }),
      });
    },
    onEnd: async ({ steps }) => {
      await supabase
        .from('agent_runs')
        .update({
          status: cappedByTokens ? 'capped' : 'succeeded',
          step_count: steps.length,
          ended_at: new Date().toISOString(),
        })
        .eq('id', runId);
    },
    onError: async ({ error }) => {
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          ended_at: new Date().toISOString(),
        })
        .eq('id', runId);
    },
  });

  return result.toTextStreamResponse();
}

async function loadSkeleton(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<string> {
  const [{ data: project }, { data: workItems }, { data: decisions }] = await Promise.all([
    supabase.from('projects').select('title, kind, brief').eq('id', projectId).single(),
    supabase
      .from('work_items')
      .select('id, parent_id, title, status, kind')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
    supabase
      .from('entries')
      .select('id, title, occurred_at')
      .eq('project_id', projectId)
      .eq('kind', 'decision')
      .order('occurred_at', { ascending: false })
      .limit(200),
  ]);

  if (!project) return '(project not found)';
  return buildSkeleton({
    project,
    // status and kind are check-constrained text, not Postgres enums, so
    // Supabase generates them as plain `string`. work_items_status_check and
    // work_items_kind_check are the guarantee that they are one of the values
    // SkeletonWorkItem names; narrowing here beats widening the domain type
    // to accommodate a value the database will not store.
    workItems: (workItems ?? []) as SkeletonWorkItem[],
    decisions: decisions ?? [],
  });
}

import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { buildSkeleton, type SkeletonWorkItem } from '@/lib/agents/skeleton';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { checkCaps, type Budget } from '@/lib/agents/caps';
import { costUsd, gatewayCostFrom } from '@/lib/agents/cost';

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

  const budget = await loadBudget(supabase, agent.project_id, auth.user.id);
  const monthToDate = await monthToDateSpend(supabase, agent.project_id);
  const before = checkCaps({ budget, monthToDateUsd: monthToDate, runTokens: 0 });
  if (!before.allowed) {
    return NextResponse.json({ error: before.message, cap: before.cap }, { status: 402 });
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .insert({
      project_id: agent.project_id,
      owner_id: auth.user.id,
      agent_id: agent.id,
      work_item_id: workItemId ?? null,
      trigger: workItemId ? 'work_item_action' : 'conversation',
      status: 'running',
    })
    .select('id')
    .single();
  if (!run) return NextResponse.json({ error: 'Could not start a run.' }, { status: 500 });

  const context: RunContext = {
    supabase,
    projectId: agent.project_id,
    ownerId: auth.user.id,
    agentId: agent.id,
    runId: run.id,
    allowlist: agent.tools,
  };

  const skeleton = await loadSkeleton(supabase, agent.project_id);

  // The up-front check above can only see spend that already landed, so the
  // per-run token cap has to be enforced from inside the loop. Reusing
  // checkCaps rather than comparing here keeps one definition of "too much".
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
        const verdict = checkCaps({ budget, monthToDateUsd: monthToDate, runTokens });
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
        run_id: run.id,
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
        .eq('id', run.id);
    },
    onError: async ({ error }) => {
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          ended_at: new Date().toISOString(),
        })
        .eq('id', run.id);
    },
  });

  return result.toTextStreamResponse();
}

async function loadBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  ownerId: string
): Promise<Budget> {
  const { data } = await supabase
    .from('project_budgets')
    .select('monthly_cap_usd, per_run_token_cap')
    .eq('project_id', projectId)
    .maybeSingle();
  if (data) {
    return {
      monthly_cap_usd: Number(data.monthly_cap_usd),
      per_run_token_cap: data.per_run_token_cap,
    };
  }
  await supabase.from('project_budgets').insert({ project_id: projectId, owner_id: ownerId });
  return { monthly_cap_usd: 10, per_run_token_cap: 200_000 };
}

async function monthToDateSpend(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<number> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('ai_usage')
    .select('cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', since.toISOString());
  return (data ?? []).reduce((total, row) => total + Number(row.cost_usd), 0);
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

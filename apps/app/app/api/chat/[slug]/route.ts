import { NextResponse } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { buildSkeleton, type SkeletonWorkItem } from '@/lib/agents/skeleton';
import { runTooled } from '@/lib/agents/tooled';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { startAgentRun } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import { appendMessage, getOrCreateConversation } from '@/lib/db/conversations';
import { getProjectBySlug } from '@/lib/db/projects';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300;
const MAX_STEPS = 12;

const AGENT_COLUMNS = 'id, project_id, owner_id, system_prompt, tools, model, is_active';

/**
 * One turn of the conversation.
 *
 * Shaped like the ask route — the loop runs inside the stream, the per-run
 * token cap lives in stopWhen, and metering goes through lib/agents/usage.ts.
 * What it adds is persistence, and two context fields the Partner needs.
 *
 * `delegate` closes over runTooled here rather than being imported by the
 * handlers, which would close a module cycle. This is the only place that knows
 * how to start a second run, and the only place that should.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const project = await getProjectBySlug(supabase, auth.user.id, slug);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const { data: agent } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', project.id)
    .eq('slug', 'partner')
    .maybeSingle();

  if (!agent || !agent.is_active) {
    // The composer falls back to record-only on this rather than showing a dead
    // input. A project without a Partner is still a project.
    return NextResponse.json({ error: 'partner_missing' }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(supabase, {
    projectId: project.id,
    ownerId: auth.user.id,
    agentId: agent.id,
  });

  // The last turn is what the owner just sent. Written before the run starts:
  // record_entry validates its sources against this conversation's user turns,
  // and a message that is not yet stored is not a citable source.
  const latest = messages.at(-1);
  const text =
    latest?.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') ?? '';

  if (latest?.role === 'user' && text.trim()) {
    await appendMessage(supabase, {
      conversationId: conversation.id,
      projectId: project.id,
      ownerId: auth.user.id,
      role: 'user',
      content: text,
    });
  }

  const budget = await getBudget(supabase, project.id, auth.user.id);
  const start = await startAgentRun(supabase, {
    projectId: project.id,
    agentId: agent.id,
    workItemId: null,
    conversationId: conversation.id,
    trigger: 'conversation',
    reservedUsd: worstCaseUsd(agent.model, budget.per_run_token_cap),
  });

  if (!start.started) {
    const verdict = checkCaps({ budget, monthToDateUsd: start.monthToDateUsd, runTokens: 0 });
    // 402 is what the composer switches to record-only on. The user turn above
    // is already saved, so nothing typed is lost to a refusal.
    return NextResponse.json(
      {
        error: verdict.allowed
          ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
          : verdict.message,
        cap: 'monthly',
      },
      { status: 402 }
    );
  }

  const runId = start.runId;
  let cappedByTokens = false;

  const context: RunContext = {
    supabase,
    projectId: project.id,
    ownerId: auth.user.id,
    agentId: agent.id,
    runId,
    allowlist: agent.tools,
    documentVersions: new Map<string, string>(),
    conversationId: conversation.id,
    delegate: async (agentSlug, question) => {
      const { data: sub } = await supabase
        .from('agents')
        .select(AGENT_COLUMNS)
        .eq('project_id', project.id)
        .eq('slug', agentSlug)
        .maybeSingle();

      if (!sub || !sub.is_active) {
        return { ok: false, message: `This project has no active ${agentSlug}.` };
      }

      // Under the sub-agent's own allowlist, in its own run. The Partner gains
      // nothing: buildToolSet is called with sub.tools, and any proposal
      // carries sub.id.
      const outcome = await runTooled({
        supabase,
        agent: sub,
        ownerId: auth.user.id,
        prompt: question,
        trigger: 'conversation',
      });

      return outcome.ok
        ? { ok: true, text: outcome.text }
        : { ok: false, message: outcome.message };
    },
  };

  const skeleton = await loadSkeleton(supabase, project.id);
  // Async in ai@7: it resolves file and data parts before handing the model a
  // plain message list.
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: agent.model,
    system: `${agent.system_prompt}\n\n---\n\nThe project as it stands:\n\n${skeleton}`,
    messages: modelMessages,
    tools: buildToolSet(context),
    stopWhen: [
      stepCountIs(MAX_STEPS),
      ({ steps }) => {
        const runTokens = steps.reduce((total, step) => total + (step.usage.totalTokens ?? 0), 0);
        const verdict = checkCaps({ budget, monthToDateUsd: 0, runTokens });
        if (!verdict.allowed) cappedByTokens = true;
        return !verdict.allowed;
      },
    ],
    maxRetries: 1,
    onStepEnd: async (step) => {
      await recordRunUsage(supabase, {
        projectId: project.id,
        ownerId: auth.user.id,
        agentId: agent.id,
        runId,
        workItemId: null,
        model: agent.model,
        usage: step.usage,
        providerMetadata: step.providerMetadata,
      });
    },
    onEnd: async ({ steps, text: answer }) => {
      if (answer.trim()) {
        await appendMessage(supabase, {
          conversationId: conversation.id,
          projectId: project.id,
          ownerId: auth.user.id,
          role: 'assistant',
          content: answer,
          runId,
        });
      }
      await finishRun(supabase, runId, {
        status: cappedByTokens ? 'capped' : 'succeeded',
        stepCount: steps.length,
      });
    },
    onError: async ({ error }) => {
      // The user turn stays. Losing what the owner typed is the worst failure
      // this product has, and a failed model call is not a reason to incur it.
      await finishRun(supabase, runId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return result.toUIMessageStreamResponse();
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
    workItems: (workItems ?? []) as SkeletonWorkItem[],
    decisions: decisions ?? [],
  });
}

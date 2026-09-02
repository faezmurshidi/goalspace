import { NextResponse } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { buildSkeleton, type SkeletonWorkItem } from '@/lib/agents/skeleton';
import { runTooled } from '@/lib/agents/tooled';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { textFromParts } from '@/lib/chat/parts';
import { startAgentRun } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import {
  appendMessage,
  getOrCreateConversation,
  listMessages,
  upsertStreamedMessage,
} from '@/lib/db/conversations';
import { getProjectBySlug } from '@/lib/db/projects';
import { listRunProposals } from '@/lib/db/proposals';
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
      parts: latest.parts,
      uiMessageId: latest.id,
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

  // Loaded before the run context, which closes over it for delegation.
  const skeleton = await loadSkeleton(supabase, project.id);

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
        // The skeleton carries titles, never ids, so an agent that proposes
        // straight from it cites nothing real. Saying so here rather than in
        // the template, because it is delegation that creates the situation:
        // asked directly, an agent has a conversation to read ids from.
        prompt: [
          'The owner asked this through their Partner:',
          '',
          question,
          '',
          'Read before you answer. The overview below lists titles only — use',
          'list_entries, list_work_items or search_repo to get the ids you cite.',
          'A citation you invent is rejected and the proposal discarded.',
        ].join('\n'),
        context: skeleton,
        trigger: 'conversation',
      });

      if (!outcome.ok) return { ok: false, message: outcome.message };

      // Counted from the rows the delegated run actually produced, not from
      // what it says it produced. This number is what the composer renders an
      // inbox affordance from; the Partner's prose is not a control.
      const produced = await listRunProposals(supabase, outcome.runId);
      return { ok: true, text: outcome.text, proposals: produced.length };
    },
  };

  // Async in ai@7: it resolves file and data parts before handing the model a
  // plain message list.
  const modelMessages = await convertToModelMessages(messages);

  // record_entry requires the id of the message it is transcribing, and the
  // model has no other way to learn one: convertToModelMessages strips ids, so
  // the model sees role and content and nothing else. Asked to cite, it
  // invented a uuid — the guard refused it, correctly, and the requirement was
  // unsatisfiable until this block existed.
  //
  // Read after the user turn is appended, so the turn being answered is in the
  // list. Excerpts are short: this is an index for citing, not a second copy of
  // the transcript, which the model already has.
  const stored = await listMessages(supabase, conversation.id);
  const citableTurns = stored
    .filter((message) => message.role === 'user')
    .slice(-20)
    .map((message) => `${message.id}  ${message.content.slice(0, 80).replace(/\s+/g, ' ')}`)
    .join('\n');

  const result = streamText({
    model: agent.model,
    system: [
      agent.system_prompt,
      '---',
      `The project as it stands:\n\n${skeleton}`,
      '---',
      'Things the owner has said in this conversation, with the id of each.',
      'These are the only ids record_entry accepts; anything else is refused.',
      citableTurns || '(nothing yet)',
    ].join('\n\n'),
    messages: modelMessages,
    tools: buildToolSet(context),
    // record_entry asks before it writes.
    //
    // This is what lets "agents propose, they never write" stand unamended.
    // The earlier design wrote directly and leaned on a required citation to
    // the message being transcribed — but a citation constrains which message
    // is named, never what goes in the body. The owner reading the body before
    // it lands is the guarantee that citation was standing in for.
    //
    // Only record_entry. The propose_* tools already produce durable rows the
    // owner decides on in the inbox, with claim and supersede semantics an
    // approval that expires with the run could not offer.
    toolApproval: { record_entry: 'user-approval' },
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
    onEnd: async ({ steps }) => {
      // The assistant turn is persisted from toUIMessageStreamResponse's
      // onFinish instead of here: this callback sees only the text, and a turn
      // whose substance is a tool call awaiting approval would be stored as an
      // empty message with the question thrown away.
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

  // originalMessages puts the stream in persistence mode: the response can
  // extend the assistant turn that requested an approval rather than starting a
  // new one, and onFinish hands back that whole turn to store.
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      // Parts, not text. The turn's substance may be a tool call waiting on the
      // owner, which has no prose at all — and which the transcript has to hold
      // if a reload is not to discard the question.
      try {
        await upsertStreamedMessage(supabase, {
          conversationId: conversation.id,
          projectId: project.id,
          ownerId: auth.user.id,
          role: 'assistant',
          content: textFromParts(responseMessage.parts),
          parts: responseMessage.parts,
          runId,
          uiMessageId: responseMessage.id,
        });
      } catch (error) {
        // Logged rather than left to reject. A rejection here is swallowed by
        // the stream, which is how a failing upsert against a partial index
        // dropped every assistant turn without a single visible symptom.
        console.error('[chat] could not store the assistant turn', error);
      }
    },
  });
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

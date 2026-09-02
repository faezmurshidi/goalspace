'use server';

import { revalidatePath } from 'next/cache';

import { fail, ok, type ActionResult } from '@/lib/actions/result';
import { runStructured } from '@/lib/agents/structured';
import { runTooled } from '@/lib/agents/tooled';
import { requireSessionContext } from '@/lib/auth/session';
import { createEntry } from '@/lib/db/entries';
import { getProjectBySlug } from '@/lib/db/projects';
import { listRunProposals, settleProposal } from '@/lib/db/proposals';
import { createWorkItem } from '@/lib/db/work-items';
import { intakeNoteBody } from '@/lib/intake/note';
import { applyProposal } from '@/lib/proposals/apply';
import {
  answeredPairs,
  applyIntakeSchema,
  intakeAnswersSchema,
  intakeQuestionsSchema,
  unansweredQuestions,
  type IntakeQuestion,
} from '@/lib/schemas/intake';

/**
 * The intake's actions.
 *
 * Kept out of `app/(workspace)/actions.ts`, which is already long enough that
 * one more feature's worth of exports makes it harder to read. They follow the
 * same conventions: the project is resolved from the slug under the caller's
 * own session, and failures come back as an `ActionResult` carrying an i18n
 * key rather than prose.
 */

const AGENT_COLUMNS = 'id, project_id, owner_id, system_prompt, model, tools, is_active';

async function resolveAgent(slug: string, agentSlug: 'interviewer' | 'planner') {
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) return { supabase, userId, project: null, agent: null };

  // RLS restricts this to the caller's own rows; the project filter states the
  // ownership rather than relying on a policy for correctness.
  const { data: agent } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', project.id)
    .eq('slug', agentSlug)
    .maybeSingle();

  return { supabase, userId, project, agent };
}

export async function startIntakeAction(
  slug: string
): Promise<ActionResult<{ questions: IntakeQuestion[] }>> {
  const { supabase, userId, project, agent } = await resolveAgent(slug, 'interviewer');
  if (!project) return fail('app.errors.projectMissing');
  // A deleted or deactivated Interviewer is not an error page. The wizard says
  // so and offers skip, because a project without an intake is a fine project.
  if (!agent || !agent.is_active) return fail('app.intake.interviewerMissing');

  const result = await runStructured({
    supabase,
    agent,
    ownerId: userId,
    schema: intakeQuestionsSchema,
    prompt: [
      `Project title: ${project.title}`,
      `Kind: ${project.kind}`,
      project.brief ? `Brief: ${project.brief}` : 'Brief: (none given)',
    ].join('\n'),
  });

  if (!result.ok) {
    // The cap message is written for a person and names the cap that refused,
    // so it is surfaced rather than flattened into a generic failure.
    return fail(result.reason === 'capped' ? result.message : 'app.intake.questionsFailed');
  }

  return ok({ questions: result.object.questions });
}

export interface ProposedItem {
  id: string;
  title: string;
  kind: string;
  rationale: string;
}

export async function submitIntakeAction(
  slug: string,
  input: unknown
): Promise<
  ActionResult<{ proposals: ProposedItem[]; entryId: string | null; plannerFailed: boolean }>
> {
  const parsed = intakeAnswersSchema.safeParse(input);
  if (!parsed.success) return fail('app.errors.validation');

  const { supabase, userId, project, agent } = await resolveAgent(slug, 'planner');
  if (!project) return fail('app.errors.projectMissing');

  // The entry is written first and independently of the Planner. The owner's
  // own words are the part of this that must not be lost to a model failure —
  // a project with the answers recorded and no breakdown is a good outcome; a
  // project with neither is what the intake existed to prevent.
  const body = intakeNoteBody(parsed.data.answers);
  let entryId: string | null = null;

  if (body.length > 0) {
    try {
      const entry = await createEntry(supabase, {
        projectId: project.id,
        ownerId: userId,
        // agent_id stays null: the owner typed these words. The Interviewer
        // contributed the prompt, not the content, and holds no write tool.
        agentId: null,
        values: { kind: 'note', title: project.title, body, work_item_id: null },
      });
      entryId = entry.id;
    } catch (error) {
      console.error('submitIntakeAction could not record the answers', error);
      return fail('app.intake.answersFailed');
    }
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/log`);

  if (!agent || !agent.is_active) {
    // No Planner, but the answers are safely in the log. The review step
    // renders with no proposed work rather than losing the submission.
    return ok({ proposals: [], entryId, plannerFailed: true });
  }

  const answered = answeredPairs(parsed.data.answers);
  const run = await runTooled({
    supabase,
    agent,
    ownerId: userId,
    prompt: [
      'The owner has just created this project and answered questions about it.',
      `Their answers are recorded in the log as entry ${entryId ?? '(none)'}.`,
      'Read that entry, then propose the work that follows from it.',
      '',
      `Project: ${project.title}`,
      `Kind: ${project.kind}`,
      '',
      ...answered.map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`),
    ].join('\n'),
  });

  if (!run.ok) {
    console.error('submitIntakeAction planner run failed', run.message);
    return ok({ proposals: [], entryId, plannerFailed: true });
  }

  // By run id, not by project: a project may already hold pending proposals
  // from an earlier run, and offering those here would ask the owner to accept
  // work this intake did not propose.
  const proposals = await listRunProposals(supabase, run.runId);

  return ok({
    entryId,
    plannerFailed: false,
    proposals: proposals
      .filter((p) => p.kind === 'work_item')
      .map((p) => {
        const payload = p.payload as { title?: string; kind?: string };
        return {
          id: p.id,
          title: payload.title ?? '(untitled)',
          kind: payload.kind ?? 'task',
          rationale: p.rationale,
        };
      }),
  });
}

export async function applyIntakeAction(
  slug: string,
  answersInput: unknown,
  input: unknown
): Promise<ActionResult<{ applied: number; questions: number; failed: number }>> {
  const parsedAnswers = intakeAnswersSchema.safeParse(answersInput);
  const parsed = applyIntakeSchema.safeParse(input);
  if (!parsedAnswers.success || !parsed.success) return fail('app.errors.validation');

  const { supabase, userId, project, agent } = await resolveAgent(slug, 'interviewer');
  if (!project) return fail('app.errors.projectMissing');

  let applied = 0;
  let failed = 0;

  // One at a time, in list order. applyProposal claims each conditionally from
  // `pending`, so a second tab racing this yields one row rather than two.
  for (const proposalId of parsed.data.proposalIds) {
    const outcome = await applyProposal(supabase, { proposalId, ownerId: userId });
    if (outcome.status === 'applied') applied += 1;
    else failed += 1;
  }

  const kept = unansweredQuestions(parsedAnswers.data.answers).filter((q) =>
    parsed.data.questionIds.includes(q.id)
  );

  let questions = 0;
  for (const q of kept) {
    try {
      await createWorkItem(supabase, {
        projectId: project.id,
        ownerId: userId,
        // The words are the Interviewer's, so the provenance is too. The row
        // exists because the owner ticked it, which is the same act as
        // accepting a proposal — see spec §8.2.
        agentId: agent?.id ?? null,
        values: { title: q.question, body: '', kind: 'question', parent_id: null, wake_at: null },
      });
      questions += 1;
    } catch (error) {
      console.error('applyIntakeAction could not open a question', error);
      failed += 1;
    }
  }

  revalidatePath('/', 'layout');
  return ok({ applied, questions, failed });
}

/**
 * Reject the proposals the owner did not tick.
 *
 * Separate from applying, and called by the same submit: a proposal left
 * `pending` would surface later in an inbox the owner has never opened, as
 * though it were still undecided. Failures are logged and swallowed — a
 * proposal that could not be rejected is a stale inbox row, a far smaller
 * problem than failing an apply that already created real work items.
 */
export async function rejectIntakeRemainderAction(
  proposalIds: string[]
): Promise<ActionResult<{ rejected: number }>> {
  const { supabase } = await requireSessionContext();

  let rejected = 0;
  for (const id of proposalIds) {
    try {
      const settled = await settleProposal(supabase, id, 'rejected', { from: 'pending' });
      if (settled) rejected += 1;
    } catch (error) {
      console.error('rejectIntakeRemainderAction failed for', id, error);
    }
  }

  revalidatePath('/', 'layout');
  return ok({ rejected });
}

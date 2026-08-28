'use server';

import { revalidatePath } from 'next/cache';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug, createProject } from '@/lib/db/projects';
import { createEntry } from '@/lib/db/entries';
import { createDocument, getRevision, updateDocument } from '@/lib/db/documents';
import { updateAgent } from '@/lib/db/agents';
import {
  changeWorkItemStatus,
  createWorkItem,
  moveWorkItem,
  updateWorkItem,
} from '@/lib/db/work-items';
import { createEntrySchema } from '@/lib/schemas/entry';
import { createDocumentSchema, updateDocumentSchema } from '@/lib/schemas/document';
import { updateAgentSchema } from '@/lib/schemas/agent';
import { createProjectSchema } from '@/lib/schemas/project';
import { applyProposal } from '@/lib/proposals/apply';
import { settleProposal } from '@/lib/db/proposals';
import {
  changeStatusSchema,
  createWorkItemSchema,
  moveWorkItemSchema,
  updateWorkItemSchema,
} from '@/lib/schemas/work-item';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/actions/result';

/**
 * Resolve the project a mutation targets, from its slug.
 *
 * Slug rather than id: the id would have to be trusted from the client, and
 * while RLS would still reject a write against someone else's project, an
 * ownership check that lives only in a policy is one migration away from being
 * the only thing standing between a bug and a cross-tenant write. The slug is
 * resolved under the caller's own session, so a project they cannot see simply
 * does not exist.
 */
async function resolveProject(slug: string) {
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  return { supabase, userId, project };
}

function revalidateProject(slug: string) {
  // Every workspace surface reads the same rows, so a capture made on the
  // resume view has to invalidate the log and the work tree too.
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/log`);
  revalidatePath(`/projects/${slug}/work`);
}

export async function captureEntryAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEntrySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const entry = await createEntry(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    revalidateProject(slug);
    return ok({ id: entry.id });
  } catch (error) {
    console.error('captureEntryAction failed', error);
    return fail('app.errors.captureFailed');
  }
}

export async function createWorkItemAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createWorkItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const item = await createWorkItem(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    revalidateProject(slug);
    return ok({ id: item.id });
  } catch (error) {
    console.error('createWorkItemAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function changeStatusAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const item = await changeWorkItemStatus(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    revalidateProject(slug);
    return ok({ id: item.id });
  } catch (error) {
    console.error('changeStatusAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function updateWorkItemAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateWorkItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const { id, ...patch } = parsed.data;
    const item = await updateWorkItem(supabase, { projectId: project.id, id, patch });
    revalidateProject(slug);
    return ok({ id: item.id });
  } catch (error) {
    console.error('updateWorkItemAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function moveWorkItemAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = moveWorkItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const item = await moveWorkItem(supabase, {
      projectId: project.id,
      id: parsed.data.id,
      parentId: parsed.data.parent_id,
      orderIndex: parsed.data.order_index,
    });
    revalidateProject(slug);
    return ok({ id: item.id });
  } catch (error) {
    // The cycle guard in moveWorkItem throws a message written for a person,
    // so it is worth surfacing rather than flattening to a generic failure.
    console.error('moveWorkItemAction failed', error);
    return fail('app.errors.moveRejected');
  }
}

export async function createProjectAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await createProject(supabase, userId, parsed.data);
    revalidatePath('/', 'layout');
    return ok({ slug: project.slug });
  } catch (error) {
    console.error('createProjectAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function acceptProposalAction(input: {
  proposalId: string;
  payloadOverride?: unknown;
}): Promise<ActionResult<{ status: string; appliedId?: string }>> {
  const { supabase, userId } = await requireSessionContext();

  try {
    const outcome = await applyProposal(supabase, {
      proposalId: input.proposalId,
      ownerId: userId,
      payloadOverride: input.payloadOverride,
    });

    revalidatePath('/', 'layout');

    switch (outcome.status) {
      case 'applied':
        return ok({ status: 'applied', appliedId: outcome.appliedId });
      case 'superseded':
        // Not an error: the proposal was honest when written and the record
        // moved on. Saying so is more useful than a generic failure.
        return fail('app.inbox.superseded');
      case 'gone':
        return fail('app.inbox.alreadyDecided');
      case 'invalid':
        return fail(outcome.message);
    }
  } catch (error) {
    console.error('acceptProposalAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function rejectProposalAction(
  proposalId: string
): Promise<ActionResult<{ status: string }>> {
  const { supabase } = await requireSessionContext();

  try {
    // Only a pending proposal can be rejected. Without the guard a stale tab
    // could reject one that has already been applied, leaving a real row in
    // the log whose proposal claims it was refused.
    const settled = await settleProposal(supabase, proposalId, 'rejected', { from: 'pending' });
    if (!settled) return fail('app.inbox.alreadyDecided');

    revalidatePath('/', 'layout');
    return ok({ status: 'rejected' });
  } catch (error) {
    console.error('rejectProposalAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function createDocumentAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const document = await createDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });

    revalidatePath('/', 'layout');
    return ok({ id: document.id });
  } catch (error) {
    console.error('createDocumentAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function updateDocumentAction(
  slug: string,
  input: unknown,
  expectedUpdatedAt: string,
  overwrite = false
): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const updated = await updateDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
      // A person saving clears the agent stamp: the column describes who wrote
      // the body that is there now, and that is now them.
      agentId: null,
      // Omitting expectedUpdatedAt skips the version check entirely, so an
      // explicit overwrite always applies rather than repeating the same
      // conflict it was meant to escape.
      ...(overwrite ? {} : { expectedUpdatedAt }),
    });

    // Null means the version moved under us — another tab, or an accepted
    // proposal. Refusing beats overwriting work the owner cannot see.
    if (!updated) return fail('app.documents.conflict');

    revalidatePath('/', 'layout');
    return ok({ updatedAt: updated.updated_at });
  } catch (error) {
    console.error('updateDocumentAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function restoreRevisionAction(
  slug: string,
  documentId: string,
  revisionId: string,
  expectedUpdatedAt: string
): Promise<ActionResult<{ updatedAt: string }>> {
  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const revision = await getRevision(supabase, project.id, revisionId);
    if (!revision || revision.document_id !== documentId) return fail('app.errors.generic');

    const updated = await updateDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: { id: documentId, title: revision.title, body: revision.body },
      // A restore is the owner's decision, whoever originally wrote the words.
      // The revision keeps the original attribution; the current body is theirs.
      agentId: null,
      expectedUpdatedAt,
    });

    if (!updated) return fail('app.documents.conflict');

    revalidatePath('/', 'layout');
    return ok({ updatedAt: updated.updated_at });
  } catch (error) {
    console.error('restoreRevisionAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function updateAgentAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateAgentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const updated = await updateAgent(supabase, { projectId: project.id, values: parsed.data });
    if (!updated) return fail('app.agents.missing');

    revalidateProject(slug);
    return ok({ id: updated.id });
  } catch {
    return fail('app.errors.generic');
  }
}

'use server';

import { revalidatePath } from 'next/cache';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug, createProject } from '@/lib/db/projects';
import { createEntry } from '@/lib/db/entries';
import {
  changeWorkItemStatus,
  createWorkItem,
  moveWorkItem,
  updateWorkItem,
} from '@/lib/db/work-items';
import { createEntrySchema } from '@/lib/schemas/entry';
import { createProjectSchema } from '@/lib/schemas/project';
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

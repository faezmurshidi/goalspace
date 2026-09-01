'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { NEXT_LOCALE_COOKIE } from '@goalspace/i18n';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug, createProject, updateProject, deleteProject } from '@/lib/db/projects';
import { createEntry } from '@/lib/db/entries';
import { createDocument, getRevision, updateDocument } from '@/lib/db/documents';
import { updateAgent } from '@/lib/db/agents';
import { updateBudget } from '@/lib/db/budgets';
import { updateUserSettings } from '@/lib/db/user-settings';
import {
  changeWorkItemStatus,
  createWorkItem,
  moveWorkItem,
  updateWorkItem,
} from '@/lib/db/work-items';
import { createEntrySchema } from '@/lib/schemas/entry';
import { createDocumentSchema, updateDocumentSchema } from '@/lib/schemas/document';
import { updateAgentSchema } from '@/lib/schemas/agent';
import { createProjectSchema, updateProjectSchema, deleteProjectSchema } from '@/lib/schemas/project';
import { updateBudgetSchema } from '@/lib/schemas/budget';
import { updateAccountSettingsSchema } from '@/lib/schemas/user-settings';
import { applyProposal } from '@/lib/proposals/apply';
import { settleProposal } from '@/lib/db/proposals';
import {
  changeStatusSchema,
  createWorkItemSchema,
  moveWorkItemSchema,
  updateWorkItemSchema,
} from '@/lib/schemas/work-item';
import { THEME_COOKIE, TIME_ZONE_COOKIE, PREFERENCE_COOKIE_MAX_AGE } from '@/lib/settings/preference-cookies';
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

    // Not revalidateProject: an agent edit changes name, role description,
    // model, active state, and tools, none of which resume/log/work render.
    // Only the agents list and this agent's own detail page show them.
    revalidatePath(`/projects/${slug}/agents`);
    revalidatePath(`/projects/${slug}/agents/${updated.id}`);
    return ok({ id: updated.id });
  } catch {
    return fail('app.errors.generic');
  }
}

export async function updateProjectAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ slug: string }>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    // The schema carries an id, but the row updated is the one the *slug*
    // resolved to. Trusting the client's id here would let a caller aim an
    // update at another of their own projects through this page's URL.
    const updated = await updateProject(supabase, {
      id: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    if (!updated) return fail('app.errors.projectMissing');

    revalidatePath(`/projects/${slug}/settings`);
    revalidateProject(slug);
    return ok({ slug: updated.slug });
  } catch {
    return fail('app.errors.generic');
  }
}

export async function updateBudgetAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ monthlyCapUsd: number }>> {
  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const updated = await updateBudget(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    if (!updated) return fail('app.errors.projectMissing');

    revalidatePath(`/projects/${slug}/settings`);
    return ok({ monthlyCapUsd: updated.monthly_cap_usd });
  } catch {
    return fail('app.errors.generic');
  }
}

/**
 * Persist theme, language, time zone and email notification preferences, and
 * carry the change into the current session.
 *
 * Two writes, one act: the database row is the durable copy read back at the
 * next login (see the callback route), and the cookies are the request-time
 * copy `app/layout.tsx` reads before there is any session to query. Writing
 * only one half would leave either a new device or the current tab showing a
 * stale preference.
 *
 * Unlike `updateProjectAction`, there is no slug — account settings belong to
 * the caller, not to a project the caller must first be resolved into.
 */
export async function updateAccountSettingsAction(
  input: unknown
): Promise<ActionResult<{ locale: string }>> {
  const parsed = updateAccountSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const updated = await updateUserSettings(supabase, { userId, values: parsed.data });
    if (!updated) return fail('app.errors.generic');

    const cookieStore = await cookies();
    // path is stated rather than left to Next's default so this matches the
    // three pre-existing NEXT_LOCALE sites (apps/web/middleware.ts,
    // packages/i18n/src/i18n.ts, use-translations.ts) and stays greppable.
    const cookieOptions = { maxAge: PREFERENCE_COOKIE_MAX_AGE, path: '/' };
    /**
     * NEXT_LOCALE stays readable from `document.cookie` — the client hook in
     * packages/i18n/src/use-translations.ts writes it directly. The theme and
     * time zone are only ever read on the server, so httpOnly costs nothing
     * and keeps a stray client-side write from drifting out of step with the
     * stored row. Verified: no client component reads either cookie.
     */
    const serverOnly = { ...cookieOptions, httpOnly: true };
    cookieStore.set(NEXT_LOCALE_COOKIE, updated.locale, cookieOptions);
    cookieStore.set(THEME_COOKIE, updated.theme, serverOnly);
    cookieStore.set(TIME_ZONE_COOKIE, updated.time_zone, serverOnly);

    // Locale and theme affect every rendered page, not just this one.
    revalidatePath('/', 'layout');
    return ok({ locale: updated.locale });
  } catch (error) {
    console.error('updateAccountSettingsAction failed', error);
    return fail('app.errors.generic');
  }
}

/**
 * Clear the three preference cookies, so the next person on a shared browser
 * does not inherit the previous user's theme, language and time zone.
 *
 * `THEME_COOKIE` and `TIME_ZONE_COOKIE` are `httpOnly` (see this file's
 * `updateAccountSettingsAction`), so client script cannot delete them —
 * `document.cookie = 'name=; max-age=0'` on an httpOnly cookie is a silent
 * no-op. `header-rail.tsx`'s `signOut` is otherwise entirely client-side
 * (`createClient().auth.signOut()`), so it calls this action to do the part
 * it no longer can. Clearing server-side is also simply more reliable than
 * `document.cookie` manipulation: it cannot miss on a path or domain
 * mismatch the way a client-side clear can.
 *
 * No session is required: sign-out is exactly the moment the session is
 * ending, and this only ever touches cookies, never a row, so there is
 * nothing here that needs to know who the caller is.
 */
export async function clearPreferenceCookiesAction(): Promise<void> {
  const cookieStore = await cookies();
  // maxAge: 0 rather than a past expiry date — matches the idiom `set(...,
  // { maxAge })` already uses elsewhere in this file.
  const expired = { path: '/', maxAge: 0 };
  cookieStore.set(NEXT_LOCALE_COOKIE, '', expired);
  cookieStore.set(THEME_COOKIE, '', { ...expired, httpOnly: true });
  cookieStore.set(TIME_ZONE_COOKIE, '', { ...expired, httpOnly: true });
}

/**
 * Delete a project, after checking the typed slug on the server.
 *
 * The browser also checks it, to disable the button — but that check is a
 * convenience. This one is the control, because it is the only one an attacker
 * or a mis-wired client cannot skip.
 */
export async function deleteProjectAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ deleted: true }>> {
  const parsed = deleteProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  if (parsed.data.confirmSlug !== project.slug) {
    return fail('app.settings.deleteMismatch');
  }

  try {
    const removed = await deleteProject(supabase, { id: project.id, ownerId: userId });
    if (!removed) return fail('app.errors.projectMissing');

    revalidatePath('/', 'layout');
    return ok({ deleted: true });
  } catch {
    return fail('app.errors.generic');
  }
}

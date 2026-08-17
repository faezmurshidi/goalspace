import { redirect } from 'next/navigation';

import { requireSessionContext } from '@/lib/auth/session';
import { getLandingProject } from '@/lib/db/projects';

/**
 * `/` resolves to the active project's resume view.
 *
 * PRODUCT.md's thesis is that re-entry is the job, so putting a project picker
 * in front of the resume view would add a navigation step to the exact moment
 * the product exists to serve. Switching projects is still possible, from the
 * quiet control in the chrome.
 */
export default async function WorkspaceIndex() {
  const { supabase, userId } = await requireSessionContext();
  const project = await getLandingProject(supabase, userId);

  if (!project) redirect('/projects/new');
  redirect(`/projects/${project.slug}`);
}

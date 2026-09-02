import { cookies } from 'next/headers';

import { WorkspaceChrome } from '@/components/shell/workspace-chrome';
import { requireSessionContext } from '@/lib/auth/session';
import { listProjects } from '@/lib/db/projects';
import { countPendingByProject } from '@/lib/db/proposals';
import { parseSidebarState, SIDEBAR_COOKIE } from '@/lib/shell/sidebar-state';

// The workspace is per-user and reads live rows on every request, so nothing
// here can be prerendered or cached across users.
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await requireSessionContext();
  const projects = await listProjects(supabase, userId);
  const pending = await countPendingByProject(supabase);

  // Read here rather than in an effect: deciding on the client means the first
  // paint shows the wrong width and the sidebar visibly snaps.
  const store = await cookies();
  const defaultSidebarOpen = parseSidebarState(store.get(SIDEBAR_COOKIE)?.value);

  return (
    <WorkspaceChrome
      projects={projects.map(({ id, slug, title }) => ({
        slug,
        title,
        pendingProposals: pending.get(id) ?? 0,
      }))}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </WorkspaceChrome>
  );
}

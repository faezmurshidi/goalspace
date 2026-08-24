import { requireSessionContext } from '@/lib/auth/session';
import { listProjects } from '@/lib/db/projects';
import { countPendingByProject } from '@/lib/db/proposals';
import { WorkspaceChrome } from '@/components/shell/workspace-chrome';

// The workspace is per-user and reads live rows on every request, so nothing
// here can be prerendered or cached across users.
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await requireSessionContext();
  const projects = await listProjects(supabase, userId);
  const pending = await countPendingByProject(supabase);

  return (
    <WorkspaceChrome
      projects={projects.map(({ id, slug, title }) => ({
        slug,
        title,
        pendingProposals: pending.get(id) ?? 0,
      }))}
    >
      {children}
    </WorkspaceChrome>
  );
}

import { cookies } from 'next/headers';

import { requireSessionContext } from '@/lib/auth/session';
import { listProjects } from '@/lib/db/projects';
import { countPendingByProject } from '@/lib/db/proposals';
import { getUserSettings } from '@/lib/db/user-settings';
import { SIDEBAR_COOKIE, parseSidebarState } from '@/lib/shell/sidebar-state';
import { WorkspaceChrome } from '@/components/shell/workspace-chrome';

// The workspace is per-user and reads live rows on every request, so nothing
// here can be prerendered or cached across users.
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await requireSessionContext();
  const projects = await listProjects(supabase, userId);
  const pending = await countPendingByProject(supabase);
  // The header rail's theme shortcut persists through the same schema the
  // settings page does (`updateAccountSettingsSchema`), so it needs the
  // caller's other current preferences to send alongside a new theme.
  const settings = await getUserSettings(supabase, userId);

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
      accountPreferences={{
        locale: settings.locale,
        time_zone: settings.time_zone,
        email_notifications: settings.email_notifications,
      }}
    >
      {children}
    </WorkspaceChrome>
  );
}

'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './sidebar';

import { destinationsFor, isActive, type ChromeProject } from '@/lib/shell/destinations';

export function WorkspaceSidebar({
  projects,
  current,
  pathname,
}: {
  projects: ChromeProject[];
  current: ChromeProject;
  pathname: string;
}) {
  const { t } = useAppTranslations();
  const { open, isMobile, setOpenMobile } = useSidebar();

  // The sheet is always full width, so it is never "collapsed" — `open` is the
  // desktop rail's state and means nothing on mobile. Reading it there rendered
  // the rail's single-letter labels inside a full-width sheet.
  const collapsed = !isMobile && !open;

  const destinations = destinationsFor(current.slug, { inbox: current.pendingProposals });

  // The provider lives in the chrome, which the workspace layout keeps mounted
  // across route changes — so nothing dismisses the sheet on its own, and
  // following a link inside it left it sitting open over the page it had just
  // navigated to. Closing on click is the whole fix; on desktop there is no
  // sheet and this is a no-op.
  const dismissSheet = () => setOpenMobile(false);

  return (
    <Sidebar label={t('app.nav.projectNav')}>
      <SidebarHeader>
        <ProjectSwitcher
          current={current}
          projects={projects}
          collapsed={collapsed}
          onNavigate={dismissSheet}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {destinations.map((destination, index) => {
              const active = isActive(pathname, destination);
              const label = t(destination.labelKey);
              // The first trailing destination gets a rule above it: project
              // scope, not one more section of the record. Checking the
              // previous entry (rather than every destination.trailing) keeps
              // the rule to a single line even if more trailing entries join
              // settings later.
              const isFirstTrailing = destination.trailing && !destinations[index - 1]?.trailing;

              return (
                <SidebarMenuItem
                  key={destination.key}
                  className={cn(isFirstTrailing && 'border-t border-rule pt-1')}
                >
                  <SidebarMenuButton asChild isActive={active}>
                    <Link
                      href={destination.href}
                      title={collapsed ? label : undefined}
                      onClick={dismissSheet}
                    >
                      {/* Collapsed, the first letter stands in for the label —
                          and `sr-only` keeps the real name in the a11y tree,
                          so the rail is never an unlabelled control. */}
                      <span aria-hidden="true" className={cn(!collapsed && 'hidden')}>
                        {Array.from(label)[0] ?? ''}
                      </span>
                      <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>
                        {label}
                      </span>
                      {destination.count !== undefined ? (
                        <span className={cn('text-ink-soft', collapsed && 'sr-only')}>
                          {destination.count}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Unchanged in behaviour from the previous shell: with one project there is
 * nothing to switch to, and a disclosure arrow that opens a menu of one item
 * is a lie about what the control does.
 */
function ProjectSwitcher({
  current,
  projects,
  collapsed,
  onNavigate,
}: {
  current: ChromeProject;
  projects: ChromeProject[];
  collapsed: boolean;
  /** Dismisses the mobile sheet; switching project navigates away. */
  onNavigate: () => void;
}) {
  const { t } = useAppTranslations();

  if (collapsed) {
    return (
      <>
        <span aria-hidden="true" className="text-title text-ink">
          {Array.from(current.title)[0] ?? ''}
        </span>
        <span className="sr-only">{current.title}</span>
      </>
    );
  }

  if (projects.length < 2) {
    return <span className="truncate text-title text-ink">{current.title}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('app.nav.switchProject')}
        className="flex w-full items-center gap-2 truncate text-title text-ink transition-colors hover:text-oxide"
      >
        <span className="truncate">{current.title}</span>
        <span aria-hidden="true" className="label text-ink-soft">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-64 rounded-none border border-rule-strong bg-paper p-0 shadow-none"
      >
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.slug}
            asChild
            className="cursor-pointer rounded-none focus:bg-paper-shade"
          >
            <Link
              href={`/projects/${project.slug}`}
              onClick={onNavigate}
              className={cn(
                'unstyled block px-3 py-2 text-body',
                project.slug === current.slug ? 'text-oxide' : 'text-ink'
              )}
            >
              {project.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

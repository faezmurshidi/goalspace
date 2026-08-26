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
  const { open } = useSidebar();

  const destinations = destinationsFor(current.slug, { inbox: current.pendingProposals });

  return (
    <Sidebar label={t('app.nav.projectNav')}>
      <SidebarHeader>
        <ProjectSwitcher current={current} projects={projects} collapsed={!open} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {destinations.map((destination) => {
              const active = isActive(pathname, destination);
              const label = t(destination.labelKey);

              return (
                <SidebarMenuItem key={destination.key}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={destination.href} title={open ? undefined : label}>
                      {/* Collapsed, the first letter stands in for the label —
                          and `sr-only` keeps the real name in the a11y tree,
                          so the rail is never an unlabelled control. */}
                      <span aria-hidden="true" className={cn(open && 'hidden')}>
                        {label.slice(0, 1)}
                      </span>
                      <span className={cn('flex-1 truncate', !open && 'sr-only')}>{label}</span>
                      {destination.count !== undefined ? (
                        <span className={cn('text-ink-soft', !open && 'sr-only')}>
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
}: {
  current: ChromeProject;
  projects: ChromeProject[];
  collapsed: boolean;
}) {
  const { t } = useAppTranslations();

  if (collapsed) {
    return (
      <span aria-hidden="true" className="text-title text-ink">
        {current.title.slice(0, 1)}
      </span>
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
      <DropdownMenuContent align="start" className="min-w-64 border border-rule-strong bg-paper p-0">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.slug}
            asChild
            className="cursor-pointer focus:bg-paper-shade"
          >
            <Link
              href={`/projects/${project.slug}`}
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

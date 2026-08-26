'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { SidebarProvider } from './sidebar';

import { projectSlugFrom, type ChromeProject } from '@/lib/shell/destinations';
import { SIDEBAR_COOKIE, SIDEBAR_MAX_AGE, serializeSidebarState } from '@/lib/shell/sidebar-state';
import { WorkspaceSidebar } from './workspace-sidebar';
import { HeaderRail } from './header-rail';

export type { ChromeProject };

/**
 * The shell is composition and nothing else.
 *
 * What can be wrong here — which destinations exist, which is active, whether
 * the sidebar starts open — lives in `lib/shell/` and is unit-tested. This
 * file arranges components, so it is verified by typecheck and build; `apps/app`
 * runs vitest in a node environment with no jsdom, and adding component-test
 * infrastructure for a layout is not worth it.
 */
export function WorkspaceChrome({
  projects,
  defaultSidebarOpen,
  children,
}: {
  projects: ChromeProject[];
  defaultSidebarOpen: boolean;
  children: React.ReactNode;
}) {
  const { t } = useAppTranslations();
  const pathname = usePathname() ?? '/';

  // Resolved from the URL rather than from props, so the shell cannot disagree
  // with the page it sits around during a client transition.
  const slug = projectSlugFrom(pathname);
  const current = projects.find((project) => project.slug === slug) ?? null;

  const persist = useCallback((open: boolean) => {
    document.cookie = `${SIDEBAR_COOKIE}=${serializeSidebarState(open)}; path=/; max-age=${SIDEBAR_MAX_AGE}; samesite=lax`;
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} onOpenChange={persist}>
      {/*
        Keyboard users should not have to tab the whole nav on every page.

        Positioned off-screen by transform rather than with
        `sr-only focus:not-sr-only`: that pairing has `not-sr-only` setting
        `position: static` while `focus:absolute` sets `absolute`, so which one
        applies depends on Tailwind's internal utility ordering, and if static
        won the link would shove the page down as it appeared. A transform
        cannot reflow anything and does not depend on emit order.
      */}
      <a
        href="#workspace-main"
        className="label absolute left-4 top-4 z-50 -translate-y-24 border border-rule-strong bg-paper px-4 py-3 text-ink transition-transform duration-150 ease-out-quart focus:translate-y-0"
      >
        {t('app.nav.skipToContent')}
      </a>

      {current ? (
        <WorkspaceSidebar projects={projects} current={current} pathname={pathname} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderRail title={current?.title ?? null} />
        <main id="workspace-main" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

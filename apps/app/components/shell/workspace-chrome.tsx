'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { Wordmark } from './wordmark';
import { createClient } from '@/utils/supabase/client';

export interface ChromeProject {
  slug: string;
  title: string;
}

/**
 * One bar, not two.
 *
 * The alternative was a global bar plus a project bar, which costs a second
 * horizontal rule and about 60px of vertical space on every screen, on a
 * product whose main surface is a dense list. Nav is project-scoped, so it
 * simply does not render when there is no project in the path.
 */
export function WorkspaceChrome({
  projects,
  children,
}: {
  projects: ChromeProject[];
  children: React.ReactNode;
}) {
  const { t } = useAppTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // The active project comes from the URL rather than from props, so the nav
  // cannot disagree with the page it sits above during a client transition.
  const slug = useMemo(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const current = projects.find((p) => p.slug === slug) ?? null;

  // Keyed off the resolved project, not the raw path segment. `/projects/new`
  // is a static route, so matching the segment alone made it look like a slug
  // and rendered nav pointing at /projects/new/work and /projects/new/log,
  // neither of which exists.
  const destinations = current
    ? [
        { href: `/projects/${current.slug}`, label: t('app.nav.resume'), exact: true },
        { href: `/projects/${current.slug}/work`, label: t('app.nav.work'), exact: false },
        { href: `/projects/${current.slug}/log`, label: t('app.nav.log'), exact: false },
      ]
    : [];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : Boolean(pathname?.startsWith(href));

  async function signOut() {
    // Navigate either way. If signOut rejects, React does not surface the
    // rejection from a menu handler, so the user would sit on a page that
    // still looks signed in with no feedback and an ambiguous session.
    try {
      await createClient().auth.signOut();
    } catch (caught) {
      console.error('Sign out failed', caught);
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <div className="min-h-svh bg-paper">
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

      <header className="sticky top-0 z-30 border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <Link href="/" className="unstyled shrink-0">
            <Wordmark className="text-title" />
          </Link>

          {current ? (
            <>
              {/* A hairline divider rather than a bullet or a slash: the
                  system separates with rules, not with punctuation. */}
              <span aria-hidden="true" className="hidden h-5 w-px bg-rule sm:block" />
              <ProjectSwitcher current={current} projects={projects} />
            </>
          ) : null}

          {/* Natural DOM order, no `order-last`. Reordering put Account above
              the section nav once the bar wrapped on a narrow screen, which
              inverted the hierarchy: the sections are the primary navigation.
              `ml-auto` still right-aligns both on one line from sm up. */}
          <nav
            aria-label={t('app.nav.sections')}
            className="flex w-full gap-5 sm:ml-auto sm:w-auto"
          >
            {destinations.map((d) => {
              const active = isActive(d.href, d.exact);
              return (
                <Link
                  key={d.href}
                  href={d.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'label unstyled border-b-2 pb-1 pt-1 transition-colors',
                    active
                      ? 'border-oxide text-ink'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  )}
                >
                  {d.label}
                </Link>
              );
            })}
          </nav>

          <div className={cn('flex items-center gap-4', destinations.length === 0 && 'ml-auto')}>
            <DropdownMenu>
              <DropdownMenuTrigger className="label text-ink-soft transition-colors hover:text-ink">
                {t('app.nav.account')}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-48 border border-rule-strong bg-paper p-0"
              >
                <div className="label border-b border-rule px-3 py-2 text-ink-soft">
                  {t('app.nav.theme')}
                </div>
                {(['light', 'dark', 'system'] as const).map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => setTheme(value)}
                    className={cn(
                      'label cursor-pointer px-3 py-2 focus:bg-paper-shade',
                      theme === value ? 'text-oxide' : 'text-ink'
                    )}
                  >
                    {t(
                      value === 'light'
                        ? 'app.nav.themeLight'
                        : value === 'dark'
                          ? 'app.nav.themeDark'
                          : 'app.nav.themeSystem'
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-rule" />
                <DropdownMenuItem
                  onSelect={signOut}
                  className="label cursor-pointer px-3 py-2 text-ink focus:bg-paper-shade"
                >
                  {t('app.common.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="workspace-main" tabIndex={-1} className="mx-auto max-w-5xl px-5">
        {children}
      </main>
    </div>
  );
}

function ProjectSwitcher({
  current,
  projects,
}: {
  current: ChromeProject;
  projects: ChromeProject[];
}) {
  const { t } = useAppTranslations();

  // With one project there is nothing to switch to, and a disclosure arrow
  // that opens a menu of one item is a lie about what the control does.
  if (projects.length < 2) {
    return <span className="truncate text-title text-ink">{current.title}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('app.nav.switchProject')}
        className="flex items-center gap-2 truncate text-title text-ink transition-colors hover:text-oxide"
      >
        <span className="truncate">{current.title}</span>
        <span aria-hidden="true" className="label text-ink-soft">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64 border border-rule-strong bg-paper p-0">
        {projects.map((p) => (
          <DropdownMenuItem key={p.slug} asChild className="cursor-pointer focus:bg-paper-shade">
            <Link
              href={`/projects/${p.slug}`}
              className={cn(
                'unstyled block px-3 py-2 text-body',
                p.slug === current.slug ? 'text-oxide' : 'text-ink'
              )}
            >
              {p.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

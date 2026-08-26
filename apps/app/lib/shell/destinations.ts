/**
 * What the sidebar offers, and which of it you are looking at.
 *
 * Pure, and tested, because the previous shell computed this inline and got it
 * wrong twice: `/projects/new` is a static route, not a slug, and matching the
 * segment alone rendered nav pointing at `/projects/new/work`; and an active
 * check by bare `startsWith` lights up a section for any route that merely
 * shares its prefix.
 */

/** A project as the shell needs it: enough to route to and label. */
export interface ChromeProject {
  slug: string;
  title: string;
  /** Pending proposals awaiting review. Drives the inbox count. */
  pendingProposals: number;
}

export interface Destination {
  key: string;
  href: string;
  /** An i18n key. The shell resolves it; this module never holds prose. */
  labelKey: string;
  /** Match the path exactly rather than as a subtree root. */
  exact: boolean;
  /** Absent means nothing to show — a rendered "0" is noise. */
  count?: number;
}

/** Routes under /projects that are not a project. */
const RESERVED = new Set(['new']);

export function projectSlugFrom(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/?#]+)/);
  if (!match) return null;

  const segment = decodeURIComponent(match[1]);
  return RESERVED.has(segment) ? null : segment;
}

export function destinationsFor(slug: string, counts: { inbox: number }): Destination[] {
  const base = `/projects/${slug}`;

  return [
    { key: 'resume', href: base, labelKey: 'app.nav.resume', exact: true },
    { key: 'work', href: `${base}/work`, labelKey: 'app.nav.work', exact: false },
    { key: 'log', href: `${base}/log`, labelKey: 'app.nav.log', exact: false },
    {
      key: 'inbox',
      href: `${base}/inbox`,
      labelKey: 'app.inbox.title',
      exact: false,
      ...(counts.inbox > 0 ? { count: counts.inbox } : {}),
    },
  ];
}

export function isActive(pathname: string, destination: Destination): boolean {
  // Compare paths only. A query string is a filter within a section, not a
  // different section — /log?kind=decision is still the log.
  const path = pathname.split(/[?#]/)[0];
  if (destination.exact) return path === destination.href;

  // The boundary check is what stops /work matching /workspaces.
  return path === destination.href || path.startsWith(`${destination.href}/`);
}

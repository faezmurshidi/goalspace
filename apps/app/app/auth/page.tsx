import { redirect } from 'next/navigation';

/**
 * There were two competing auth surfaces: `/auth` (tabbed, glassmorphic) and
 * `/login` (OAuth plus email). They drifted apart, and middleware only ever
 * sent unauthenticated users to `/login`, so `/auth` was reachable but
 * unmaintained.
 *
 * `/login` is now the single sign-in surface. This route survives only so that
 * any link or bookmark pointing at `/auth` still lands somewhere useful.
 * `/auth/callback` is unaffected: it is a route handler, not a page.
 */
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Forwarded, not dropped: /login reads returnUrl to restore where the user
  // was headed, and a bare redirect would send them to the workspace root
  // after signing in.
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.append(key, value);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  redirect(`/login${suffix}`);
}

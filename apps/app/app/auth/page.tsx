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
export default function AuthPage() {
  redirect('/login');
}

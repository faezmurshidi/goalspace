import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

export type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

/**
 * The authenticated context, or null.
 *
 * Always `getUser()`, never `getSession()`. `getSession()` reads the cookie
 * and trusts it; `getUser()` revalidates the token with the auth server. On
 * the server the difference is the whole security boundary, because a cookie
 * is attacker-controlled input.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { supabase, userId: user.id };
}

/**
 * Same, but sends the caller to sign-in when there is no session. For pages
 * and actions that cannot render or run without one.
 *
 * Middleware already gates these routes; this is the second line, so that a
 * route added later without a matcher entry fails closed rather than open.
 */
export async function requireSessionContext(returnUrl?: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (context) return context;

  const target = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
  redirect(target);
}

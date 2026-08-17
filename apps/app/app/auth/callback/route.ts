import { NextResponse } from 'next/server';

import { trackEvent } from '@/utils/server-analytics';
import { safeInternalPath } from '@/lib/safe-redirect';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeInternalPath(requestUrl.searchParams.get('next'), requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login`);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('Missing Supabase environment variables:', error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=server_configuration`);
  }

  try {
    const { data, error: verifyError } = await supabase.auth.exchangeCodeForSession(code);

    if (verifyError) throw verifyError;
    if (!data.user) throw new Error('No user returned from verification');

    /**
     * The profile and settings rows are created by the `on_auth_user_created`
     * trigger, inside the same transaction as the auth insert. This route used
     * to insert them itself, which is now both redundant and wrong:
     *
     *  - It could not work reliably anyway. RLS on `public.users` requires
     *    `id = auth.uid()`, and it wrote `theme: 'dark'` into user_settings,
     *    contradicting the column's own 'system' default.
     *  - Worse, with the trigger in place the row always exists by the time
     *    this code runs, so the old "does the row exist yet?" test for a new
     *    account would report *every* user as returning, and the
     *    `user_registered` event would never fire again.
     *
     * First sign-in is detected from the auth record instead: Supabase stamps
     * `created_at` and `last_sign_in_at` within milliseconds of each other on
     * the very first session, and they diverge permanently after that.
     */
    const createdAt = Date.parse(data.user.created_at ?? '');
    const lastSignInAt = Date.parse(data.user.last_sign_in_at ?? '');
    const isNewUser =
      Number.isFinite(createdAt) &&
      Number.isFinite(lastSignInAt) &&
      Math.abs(lastSignInAt - createdAt) < 5_000;

    trackEvent(isNewUser ? 'user_registered' : 'user_logged_in', {
      provider: data.user.app_metadata?.provider || 'unknown',
      is_new_user: isNewUser,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  } catch (error) {
    console.error('Error in verification callback:', error);

    trackEvent('auth_error', {
      error_type: 'verification_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.redirect(`${requestUrl.origin}/login?error=verification_failed`);
  }
}

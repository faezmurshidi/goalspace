import { NextResponse } from 'next/server';

import { NEXT_LOCALE_COOKIE } from '@goalspace/i18n';

import { trackEvent } from '@/utils/server-analytics';
import { safeInternalPath } from '@/lib/safe-redirect';
import { createClient } from '@/utils/supabase/server';
import { getUserSettings } from '@/lib/db/user-settings';
import {
  THEME_COOKIE,
  TIME_ZONE_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
} from '@/lib/settings/preference-cookies';

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

    const response = NextResponse.redirect(`${requestUrl.origin}${next}`);

    /**
     * Seed the preference cookies from the stored row. Without this the
     * database column is write-only: a new browser has never set these
     * cookies, so it would show defaults forever even for a returning user
     * who chose a theme, language and time zone on another device.
     *
     * A failed lookup must never cost someone their login, so it is caught
     * here rather than left to propagate to the outer catch, which would
     * bounce the user back to `/login?error=verification_failed` despite a
     * verified session. But leaving the cookies untouched on failure is not
     * the safe fallback it looks like: on a shared browser they would still
     * hold the *previous* account's theme, language and time zone, and the
     * newly signed-in user would silently inherit them. Deleting them is the
     * correct failure mode — it falls back to documented defaults instead.
     */
    try {
      const settings = await getUserSettings(supabase, data.user.id);
      /**
       * `path` is stated rather than left to Next's default so this matches
       * the three pre-existing NEXT_LOCALE sites (apps/web/middleware.ts,
       * packages/i18n/src/i18n.ts, use-translations.ts) and stays greppable.
       *
       * NEXT_LOCALE stays readable from `document.cookie` — the client hook in
       * packages/i18n/src/use-translations.ts writes it directly. The theme and
       * time zone are only ever read on the server, so httpOnly costs nothing
       * and keeps a stray client-side write from drifting out of step with the
       * stored row. Verified: no client component reads either cookie.
       */
      const cookieOptions = { maxAge: PREFERENCE_COOKIE_MAX_AGE, path: '/' };
      const serverOnly = { ...cookieOptions, httpOnly: true };
      response.cookies.set(NEXT_LOCALE_COOKIE, settings.locale, cookieOptions);
      response.cookies.set(THEME_COOKIE, settings.theme, serverOnly);
      response.cookies.set(TIME_ZONE_COOKIE, settings.time_zone, serverOnly);
    } catch (settingsError) {
      console.error('Failed to seed preference cookies at login:', settingsError);
      response.cookies.delete(NEXT_LOCALE_COOKIE);
      response.cookies.delete(THEME_COOKIE);
      response.cookies.delete(TIME_ZONE_COOKIE);
    }

    return response;
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

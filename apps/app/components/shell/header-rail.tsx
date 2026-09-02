'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@goalspace/ui';
import { useTheme } from 'next-themes';

import { THEMES, type ThemePreference } from '@/lib/settings/preference-cookies';
import { clearPreferenceCookiesAction, updateThemeAction } from '@/app/(workspace)/actions';
import { createClient } from '@/utils/supabase/client';
import { SidebarTrigger } from './sidebar';
import { Wordmark } from './wordmark';

export function HeaderRail({ title, hasSidebar }: { title: string | null; hasSidebar: boolean }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Bumped once per selectTheme call, so each in-flight persist can tell
  // whether it is still the latest one. Without this, picking Dark then
  // quickly Light starts two independent writes with their own captured
  // `previous`; if the Dark write's promise settles (resolved-failure or
  // rejected) after the Light write already succeeded, its rollback fires
  // and restores the pre-Dark theme, discarding the newer choice the person
  // actually asked for.
  //
  // This only orders the *client* rollback — it makes the latest selection
  // win on this tab. It does not order the *server* writes themselves: two
  // rapid `updateThemeAction` calls can still reach the database and land
  // out of order, so the stored row is not guaranteed to match the latest
  // click either. That half of the race is not closed here.
  const themeRequestId = useRef(0);

  function selectTheme(value: ThemePreference) {
    const requestId = ++themeRequestId.current;

    // Captured before the optimistic write below, so a failed persist can put
    // the device back where it was rather than leaving it pinned to a theme
    // the account never actually stored.
    const previous = theme as ThemePreference | undefined;

    // Updates the current tab immediately...
    setTheme(value);

    // ...and persists it, so the choice reaches the column and the cookie
    // rather than following only this tab. Without this a theme set from the
    // menu never follows the person to another device, and the settings
    // page's own <select> would show a different value than the app is
    // actually rendering.
    //
    // `updateThemeAction` resolves rather than rejects on a validation or
    // database failure (`ActionResult`'s `fail(...)` is a resolved value), so
    // `.catch()` alone would never see it — the result has to be checked. A
    // silently-discarded failure would leave `localStorage.theme` (already
    // written by `setTheme` above) pinned to a value the account never
    // stored: `localStorage` beats `defaultTheme` in next-themes on every
    // later visit, on this device, permanently.
    updateThemeAction({ theme: value })
      .then((result) => {
        // A newer selection has started since this one — its own rollback
        // logic owns theme state now, so this stale result must not touch it.
        if (themeRequestId.current !== requestId) return;
        if (!result.ok && previous) setTheme(previous);
      })
      .catch((caught) => {
        console.error('Persisting theme from the menu failed', caught);
        if (themeRequestId.current !== requestId) return;
        if (previous) setTheme(previous);
      });
  }

  async function signOut() {
    // Clear the preference cookies BEFORE ending the session, not after.
    //
    // `clearPreferenceCookiesAction` lives in the (workspace) route group, so
    // invoking it re-renders that group's layout as part of the action
    // response — and that layout requires a session. Called after
    // `auth.signOut()` the re-render has no session left, the action response
    // fails with "An unexpected response was received from the server", and
    // the cookies are never cleared. Measured in the browser pass: the theme
    // cookie survived sign-out, so the next person to sign in on that browser
    // inherited the previous user's theme.
    //
    // The action needs no session of its own — it only touches the caller's
    // own cookies — so running it first is safe. If sign-out then fails, the
    // user keeps a valid session with their display preferences reset to
    // defaults, which is recoverable; the reverse order loses the clearing
    // entirely.
    try {
      await clearPreferenceCookiesAction();
    } catch (caught) {
      console.error('Clearing preference cookies failed', caught);
    }

    // `localStorage.theme` beats `defaultTheme` in next-themes, so leaving it
    // would mean the next person to sign in on this browser inherits this
    // account's theme and their own preference never applies.
    try {
      window.localStorage.removeItem('theme');
    } catch (caught) {
      console.error('Clearing the local theme failed', caught);
    }

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
    <header className="border-rule bg-paper sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4">
      {hasSidebar ? (
        /* Rendered at every width. The desktop sidebar is `hidden md:flex`, so a
           trigger hidden above `md` would leave desktop with no way to collapse
           it at all. */
        <SidebarTrigger label={t('app.nav.toggleSidebar')} />
      ) : null}

      {title ? (
        <span className="text-title text-ink truncate">{title}</span>
      ) : (
        <Link href="/" className="shrink-0">
          <Wordmark className="text-title" />
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="label text-ink-soft hover:text-ink transition-colors">
            {t('app.nav.account')}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-rule-strong bg-paper min-w-48 rounded-none border p-0 shadow-none"
          >
            <div className="label border-rule text-ink-soft border-b px-3 py-2">
              {t('app.nav.theme')}
            </div>
            {THEMES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => selectTheme(value)}
                className={cn(
                  'label focus:bg-paper-shade cursor-pointer rounded-none px-3 py-2',
                  theme === value ? 'text-oxide' : 'text-ink'
                )}
              >
                {t(`app.account.theme.${value}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-rule" />
            <DropdownMenuItem asChild className="focus:bg-paper-shade cursor-pointer rounded-none">
              <Link href="/settings" className="label text-ink block px-3 py-2">
                {t('app.nav.accountSettings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={signOut}
              className="label text-ink focus:bg-paper-shade cursor-pointer rounded-none px-3 py-2"
            >
              {t('app.common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

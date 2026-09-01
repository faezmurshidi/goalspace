'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

import { SidebarTrigger } from './sidebar';
import { Wordmark } from './wordmark';
import { createClient } from '@/utils/supabase/client';
import { updateThemeAction, clearPreferenceCookiesAction } from '@/app/(workspace)/actions';
import { THEMES, type ThemePreference } from '@/lib/settings/preference-cookies';

export function HeaderRail({
  title,
  hasSidebar,
}: {
  title: string | null;
  hasSidebar: boolean;
}) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  function selectTheme(value: ThemePreference) {
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
        if (!result.ok && previous) setTheme(previous);
      })
      .catch((caught) => {
        console.error('Persisting theme from the menu failed', caught);
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-rule bg-paper px-4">
      {hasSidebar ? (
        /* Rendered at every width. The desktop sidebar is `hidden md:flex`, so a
           trigger hidden above `md` would leave desktop with no way to collapse
           it at all. */
        <SidebarTrigger label={t('app.nav.toggleSidebar')} />
      ) : null}

      {title ? (
        <span className="truncate text-title text-ink">{title}</span>
      ) : (
        <Link href="/" className="unstyled shrink-0">
          <Wordmark className="text-title" />
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="label text-ink-soft transition-colors hover:text-ink">
            {t('app.nav.account')}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-48 rounded-none border border-rule-strong bg-paper p-0 shadow-none"
          >
            <div className="label border-b border-rule px-3 py-2 text-ink-soft">
              {t('app.nav.theme')}
            </div>
            {THEMES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => selectTheme(value)}
                className={cn(
                  'label cursor-pointer rounded-none px-3 py-2 focus:bg-paper-shade',
                  theme === value ? 'text-oxide' : 'text-ink'
                )}
              >
                {t(`app.account.theme.${value}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-rule" />
            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-none focus:bg-paper-shade"
            >
              <Link
                href="/settings"
                className="unstyled label block px-3 py-2 text-ink"
              >
                {t('app.nav.accountSettings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={signOut}
              className="label cursor-pointer rounded-none px-3 py-2 text-ink focus:bg-paper-shade"
            >
              {t('app.common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

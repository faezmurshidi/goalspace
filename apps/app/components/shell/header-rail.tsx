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
import { updateAccountSettingsAction, clearPreferenceCookiesAction } from '@/app/(workspace)/actions';
import { THEMES, type ThemePreference } from '@/lib/settings/preference-cookies';

/**
 * The account preferences other than theme, needed to persist a theme change
 * made from this menu: `updateAccountSettingsAction` validates against
 * `updateAccountSettingsSchema`, which requires all four fields, so a theme
 * pick from here has to resend the caller's current locale, time zone and
 * email-notifications choice unchanged rather than guessing defaults — a
 * wrong guess would silently overwrite a real preference.
 */
export type AccountPreferences = {
  locale: string;
  time_zone: string;
  email_notifications: boolean;
};

export function HeaderRail({
  title,
  hasSidebar,
  accountPreferences,
}: {
  title: string | null;
  hasSidebar: boolean;
  accountPreferences: AccountPreferences;
}) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  function selectTheme(value: ThemePreference) {
    // Updates the current tab immediately...
    setTheme(value);
    // ...and persists it, so the choice reaches the column and the cookie
    // rather than following only this tab. Without this a theme set from the
    // menu never follows the person to another device, and the settings
    // page's own <select> would show a different value than the app is
    // actually rendering.
    updateAccountSettingsAction({ theme: value, ...accountPreferences }).catch((caught) => {
      console.error('Persisting theme from the menu failed', caught);
    });
  }

  async function signOut() {
    // Navigate either way. If signOut rejects, React does not surface the
    // rejection from a menu handler, so the user would sit on a page that
    // still looks signed in with no feedback and an ambiguous session.
    try {
      await createClient().auth.signOut();
    } catch (caught) {
      console.error('Sign out failed', caught);
    } finally {
      // `localStorage.theme` beats `defaultTheme` in next-themes, so leaving
      // it would mean the next person to sign in on this browser inherits
      // this account's theme and their own preference never applies.
      try {
        window.localStorage.removeItem('theme');
      } catch (caught) {
        console.error('Clearing the local theme failed', caught);
      }

      // THEME_COOKIE and TIME_ZONE_COOKIE are httpOnly, so client script
      // cannot clear them itself — a server action is the only way. Cleanup
      // failing must not cost anyone their sign-out, so it is caught here
      // rather than left to propagate.
      try {
        await clearPreferenceCookiesAction();
      } catch (caught) {
        console.error('Clearing preference cookies failed', caught);
      }

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

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

export function HeaderRail({ title, hasSidebar }: { title: string | null; hasSidebar: boolean }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
            {(['light', 'dark', 'system'] as const).map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => setTheme(value)}
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

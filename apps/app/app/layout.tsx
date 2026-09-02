import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { I18nProvider, localeFromCookie, NEXT_LOCALE_COOKIE } from '@goalspace/i18n';
import { ThemeProvider, Toaster } from '@goalspace/ui';

import { archivo, azeret } from '@/lib/fonts';
import { parseTheme, THEME_COOKIE } from '@/lib/settings/preference-cookies';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Goalspace',
    template: '%s | Goalspace',
  },
  description: 'The record of one long project.',
  // The workspace is private by definition. Nothing here should ever reach an
  // index, including via a leaked or shared URL.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the light and dark grounds in globals.css, so the browser chrome
  // and the overscroll area do not flash a colour the system never uses.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.96 0.008 85)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.18 0.008 60)' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = localeFromCookie(cookieStore.get(NEXT_LOCALE_COOKIE)?.value);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${archivo.variable} ${azeret.variable}`}
    >
      <body>
        <I18nProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme={theme}
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

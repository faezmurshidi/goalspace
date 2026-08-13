import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { ThemeProvider, Toaster } from '@goalspace/ui';
import { I18nProvider, NEXT_LOCALE_COOKIE, localeFromCookie } from '@goalspace/i18n';

import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = localeFromCookie(cookieStore.get(NEXT_LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
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

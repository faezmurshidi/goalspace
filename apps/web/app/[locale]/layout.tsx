import React, { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@goalspace/i18n';
import { ThemeProvider, Toaster } from '@goalspace/ui';

import AnalyticsProvider from '@/app/providers/analytics-provider';

const inter = Inter({ subsets: ['latin'] });

// Define supported locales for static generation
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ms' }, { locale: 'zh' }];
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AnalyticsProvider>{children}</AnalyticsProvider>
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

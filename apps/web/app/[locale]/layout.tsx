import type { ReactNode } from 'react';
import { I18nProvider } from '@goalspace/i18n';
import AnalyticsProvider from '@/app/providers/analytics-provider';
import { archivo, azeret } from '@/lib/fonts';

import '../globals.css';

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
    <html lang={locale} className={`${archivo.variable} ${azeret.variable}`}>
      <body>
        <I18nProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

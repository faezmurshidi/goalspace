import type { ReactNode } from 'react';
import { I18nProvider } from '@goalspace/i18n';
import { HtmlLangSync } from '@/components/html-lang-sync';
import { SiteHeader } from '@/components/site-header';
import { Colophon } from '@/components/manual/colophon';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ms' }, { locale: 'zh' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <I18nProvider>
      <HtmlLangSync locale={locale} />
      <div className="flex min-h-screen flex-col bg-paper">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <Colophon />
      </div>
    </I18nProvider>
  );
}

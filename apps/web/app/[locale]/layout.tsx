import type { ReactNode } from 'react';
import { I18nProvider } from '@goalspace/i18n';
import { HtmlLangSync } from '@/components/html-lang-sync';

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
      {children}
    </I18nProvider>
  );
}

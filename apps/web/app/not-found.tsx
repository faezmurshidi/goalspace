'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { useAppTranslations } from '@goalspace/i18n';

/**
 * The global not-found route: it renders outside the `[locale]` layout (a
 * blog slug that misses falls through to `notFound()`, which bubbles past
 * the locale segment to this file), so it carries no SiteHeader/Colophon of
 * its own. It still owes the manual system its vocabulary: paper ground,
 * ink text, square corners, the label/oxide accents, no shadow. `t()` works
 * here without an `I18nProvider` ancestor because `useAppTranslations`
 * reads the module-level i18next singleton registered in
 * `packages/i18n/src/i18n.ts`, not React context.
 */
function NotFoundContent() {
  const { t, currentLocale } = useAppTranslations();
  const locale = currentLocale || 'en';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16 text-center text-ink">
      <span className="label mb-6 block text-oxide">{t('notFound.label')}</span>
      <h1 className="text-display wdth-expanded">{t('notFound.title')}</h1>
      <p className="mt-6 max-w-[52ch] text-body text-ink-soft">{t('notFound.description')}</p>
      <Link
        href={`/${locale}`}
        className="label mt-12 inline-flex items-center gap-2 bg-oxide-deep px-8 py-4 text-paper transition-colors duration-150 ease-out-expo hover:bg-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('notFound.cta')}
      </Link>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <NotFoundContent />
    </Suspense>
  );
}

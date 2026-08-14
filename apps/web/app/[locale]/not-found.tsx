'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { useAppTranslations } from '@goalspace/i18n';

/**
 * The not-found route for the `[locale]` segment: any URL that doesn't
 * match a real page (an unknown blog slug, a typo'd path) falls through to
 * `notFound()`, which bubbles up to the nearest `not-found.tsx` boundary.
 * This used to live outside the `[locale]` layout entirely, as the app's
 * global fallback, carrying no SiteHeader/Colophon of its own; it moved
 * here so the app has a single `<html>`-owning root layout (see the doc
 * comment on `[locale]/layout.tsx`), and now renders inside that layout's
 * usual chrome and reads the active locale from context like every other
 * page, rather than from the module-level i18next singleton it fell back
 * on before. It still owes the manual system its vocabulary: paper
 * ground, ink text, square corners, the label/oxide accents, no shadow.
 * `min-h-screen` was dropped in favour of the ancestor layout's own
 * `min-h-screen flex-col` wrapper, since nesting two would make the
 * footer unreachable without scrolling past a full extra viewport.
 */
function NotFoundContent() {
  const { t, currentLocale } = useAppTranslations();
  const locale = currentLocale || 'en';

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center text-ink">
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

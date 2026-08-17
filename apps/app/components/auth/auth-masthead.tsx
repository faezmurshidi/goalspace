'use client';

import { useAppTranslations } from '@goalspace/i18n';

import { Wordmark } from '@/components/shell/wordmark';

/**
 * Client-side only because the tagline is translated and `useAppTranslations`
 * reads the i18next instance from context. The Wordmark itself is server-safe;
 * only this wrapper needs the boundary.
 */
export function AuthMasthead() {
  const { t } = useAppTranslations();

  return (
    <div className="mb-10 text-center">
      <Wordmark />
      <p className="label mt-3 text-ink-soft">{t('app.auth.tagline')}</p>
    </div>
  );
}

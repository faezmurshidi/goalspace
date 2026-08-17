'use client';

import { useAppTranslations } from '@goalspace/i18n';

/**
 * A screen-reader announcement for route-level loading states.
 *
 * The skeletons themselves are `aria-hidden`, which is right for a stack of
 * decorative bars but left assistive technology with nothing at all between
 * navigation and content.
 *
 * A client component rather than `getFixedT`, because a `loading.tsx` is a
 * Suspense fallback and a fallback must not suspend, so it cannot await
 * `cookies()` to discover the request locale. Reading the i18n context gets the
 * right language without that.
 */
export function LoadingAnnouncement() {
  const { t } = useAppTranslations();

  return (
    <p role="status" className="sr-only">
      {t('app.common.loadingRegion')}
    </p>
  );
}

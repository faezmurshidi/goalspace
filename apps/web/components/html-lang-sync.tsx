'use client';

import { useEffect } from 'react';

/**
 * Keeps document.documentElement.lang in sync with the active locale.
 *
 * The root layout (app/layout.tsx) owns the single <html> element and sets a
 * static lang="en" default so the marketing site can remain fully statically
 * rendered (no cookie/header reads at the root). This component corrects the
 * lang attribute client-side for non-default locales without opting the tree
 * out of static rendering.
 */
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}

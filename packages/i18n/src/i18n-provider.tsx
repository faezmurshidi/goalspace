'use client';

import { ReactNode, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { i18n as I18nInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

import i18n from './i18n';

interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
}

/**
 * Provider component for i18next.
 *
 * Renders synchronously on every pass (no `isReady` gate, no `useEffect`
 * before first paint): the previous version returned `null` until an
 * effect fired, which means server-rendered HTML never contained any
 * translated content at all. Every page in both apps is wrapped in this
 * provider, so that made the entire server response blank.
 *
 * The `i18n` singleton imported above is module-level state, shared by
 * every in-flight request on the server. It is never mutated here
 * (`i18n.changeLanguage`) during render, because doing so would race
 * concurrent requests for different locales against each other. Instead,
 * when the resolved locale differs from the singleton's current language,
 * `i18n.cloneInstance` produces a lightweight instance scoped to this
 * render tree. The clone shares the already-loaded resource bundles (see
 * `./i18n`, which imports all three locale JSON files directly rather than
 * fetching them), so `initAsync: false` keeps this synchronous — no
 * network/backend round trip, safe to call during render.
 */
export default function I18nProvider({ children, locale: localeProp }: I18nProviderProps) {
  const params = useParams();
  const locale = localeProp ?? (params?.locale as string | undefined);

  const instance = useMemo<I18nInstance>(() => {
    if (!locale || i18n.language === locale) {
      return i18n;
    }
    return i18n.cloneInstance({ lng: locale, initAsync: false });
  }, [locale]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

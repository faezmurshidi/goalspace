'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { useParams } from 'next/navigation';

interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
}

/**
 * Provider component for i18next
 * This should be placed high in the component tree to make i18n available throughout the app
 */
export default function I18nProvider({ children, locale: localeProp }: I18nProviderProps) {
  const params = useParams();
  const [isReady, setIsReady] = useState(false);

  // Get locale from the explicit prop if provided, otherwise from route params
  useEffect(() => {
    // Extract locale from the explicit prop or URL params
    const locale = localeProp ?? (params?.locale as string | undefined);

    if (locale && i18n.language !== locale) {
      console.log(`[I18nProvider] Setting language to: ${locale}`);

      // Change language if needed
      i18n.changeLanguage(locale).then(() => {
        // Mark initialization as complete
        setIsReady(true);
      }).catch(err => {
        console.error('[I18nProvider] Failed to change language:', err);
        setIsReady(true); // Still mark as ready to avoid blocking the UI
      });
    } else {
      // If no locale change needed, mark as ready immediately
      setIsReady(true);
    }
  }, [params, localeProp]);

  if (!isReady) {
    // Return a minimal loading state or null
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
} 
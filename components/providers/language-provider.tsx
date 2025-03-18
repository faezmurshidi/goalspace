import { I18nextProvider } from 'react-i18next';
import { ReactNode, useEffect } from 'react';
import i18n from '@/lib/i18n';

interface LanguageProviderProps {
  locale: string;
  children: ReactNode;
  messages?: any; // Keep for backward compatibility during migration
}

export default function LanguageProvider({ 
  locale, 
  children,
}: LanguageProviderProps) {
  // Change language when locale prop changes
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
} 
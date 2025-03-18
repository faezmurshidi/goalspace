import { I18nextProvider } from 'react-i18next';
import { ReactNode, useEffect } from 'react';
import i18n from '@/lib/i18n';

interface LanguageProviderProps {
  locale: string;
  children: ReactNode;
  messages: any;
}

export default function LanguageProvider({ 
  locale, 
  children,
  messages 
}: LanguageProviderProps) {
  // Update i18n language based on the locale prop
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    
    // If we have messages, we can dynamically add them
    if (messages) {
      // Add resources for the current locale if not already added
      if (messages && !i18n.hasResourceBundle(locale, 'translation')) {
        i18n.addResourceBundle(locale, 'translation', messages);
      }
    }
  }, [locale, messages]);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
} 
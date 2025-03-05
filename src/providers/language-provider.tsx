import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

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
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
} 
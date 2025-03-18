import React, { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import LanguageProvider from '@/components/providers/language-provider';
import { Toaster } from '@/components/ui/toaster';
import { setRequestLocale } from 'next-intl/server';

// Import localized messages
import enMessages from '../../locales/en.json';
import msMessages from '../../locales/ms.json';

const inter = Inter({ subsets: ['latin'] });

// Message dictionary by locale
const messages: Record<string, any> = {
  en: enMessages,
  ms: msMessages,
};

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ms' }];
}

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // This enables static rendering
  setRequestLocale(locale);
  
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider locale={locale} messages={messages[locale]}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
} 
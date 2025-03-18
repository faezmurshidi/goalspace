import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setCookie } from 'cookies-next';

// Import the i18n instance directly
import i18n from '../i18n';

/**
 * Custom hook for handling translations and language switching
 * Provides translation, language switching, and formatting utilities
 */
export function useAppTranslations() {
  // Use the pre-initialized i18n instance
  const { t } = useTranslation();
  const [currentLocale, setCurrentLocale] = useState<string>(i18n.language || 'en');
  const router = useRouter();
  const pathname = usePathname();
  
  // Update locale state when i18n.language changes
  useEffect(() => {
    setCurrentLocale(i18n.language);
    // We need to listen to i18n.language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  /**
   * Change the application language
   * This will update the i18n instance, the cookie, and navigate to the new locale path
   * @param newLocale The new locale to switch to
   */
  const changeLanguage = (newLocale: string) => {
    // Set cookie for middleware to use
    setCookie('NEXT_LOCALE', newLocale, { 
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/' 
    });
    
    // Change i18n language
    i18n.changeLanguage(newLocale);
    
    // Get the pathname without the locale prefix
    const pathnameWithoutLocale = pathname.replace(`/${currentLocale}`, '');
    
    // Navigate to the same page with the new locale
    const newPath = `/${newLocale}${pathnameWithoutLocale || ''}`;
    router.push(newPath);
  };
  
  /**
   * Format a date according to the current locale
   * @param date The date to format
   * @param options Intl.DateTimeFormatOptions
   * @returns The formatted date string
   */
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(currentLocale, options).format(date);
  };
  
  /**
   * Format a number according to the current locale
   * @param number The number to format
   * @param options Intl.NumberFormatOptions
   * @returns The formatted number string
   */
  const formatNumber = (number: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(currentLocale, options).format(number);
  };

  return {
    t,                 // Translation function
    i18n,              // i18n instance
    currentLocale,     // Current language
    changeLanguage,    // Function to change language
    formatDate,        // Function to format dates
    formatNumber       // Function to format numbers
  };
} 
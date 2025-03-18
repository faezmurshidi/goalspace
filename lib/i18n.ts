import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { InitOptions } from 'i18next';

// Import translation files directly
import enTranslation from '../locales/en.json';
import msTranslation from '../locales/ms.json';
import zhTranslation from '../locales/zh.json';

// Define the resources with namespaces
const resources = {
  en: { 
    translation: enTranslation 
  },
  ms: { 
    translation: msTranslation 
  },
  zh: { 
    translation: zhTranslation 
  }
};

// Set expiration date to 1 year from now
const expirationDate = new Date();
expirationDate.setFullYear(expirationDate.getFullYear() + 1);

// Configuration options
const i18nOptions: InitOptions = {
  resources,
  fallbackLng: 'en',
  debug: process.env.NODE_ENV === 'development',
  
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
  
  // Detection options - only used in browser
  detection: {
    order: ['path', 'cookie', 'navigator'],
    lookupFromPathIndex: 0,
    caches: ['cookie'],
    // Cookie will expire after one year
    cookieOptions: {
      expires: expirationDate,
      path: '/',
      sameSite: 'strict'
    },
  },
  
  // React options
  react: {
    useSuspense: false, // Set to false to avoid issues with SSR
  },
};

// Check if i18next has already been initialized
if (!i18n.isInitialized) {
  console.log('[i18n] Initializing i18next');
  
  // Only use browser-specific features in client environment
  if (typeof window !== 'undefined') {
    i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init(i18nOptions);
  } else {
    // Server-side initialization (simpler)
    i18n
      .use(initReactI18next)
      .init({
        ...i18nOptions,
        detection: {}, // Empty detection for server
      });
  }
}

export default i18n; 
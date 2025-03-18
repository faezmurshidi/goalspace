import 'i18next';
import enTranslation from '../locales/en.json';

// Define the shape of the translation resources
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof enTranslation;
    };
  }
} 
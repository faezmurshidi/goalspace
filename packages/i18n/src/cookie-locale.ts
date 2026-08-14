import { defaultLocale, isLocale, type Locale } from './locales';

export const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeFromCookie(value: string | undefined): Locale {
  if (value && isLocale(value)) return value;
  return defaultLocale;
}

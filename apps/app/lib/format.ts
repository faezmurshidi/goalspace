import { cookies } from 'next/headers';
import { NEXT_LOCALE_COOKIE, localeFromCookie, type Locale } from '@goalspace/i18n';

/**
 * The request's locale, from the same cookie the root layout reads.
 *
 * Server components cannot use `useAppTranslations`, and formatting dates on
 * the client instead would either flash the wrong format on first paint or
 * produce a hydration mismatch, because the server has no idea what locale the
 * browser will settle on. Formatting here, with an explicit locale, keeps the
 * markup deterministic.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return localeFromCookie(store.get(NEXT_LOCALE_COOKIE)?.value);
}

/** "23 Jul 2026". Unambiguous across locales in a way a numeric date is not. */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Date plus time, for entries where the hour carries information. */
export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "August 2026", for durations measured in months rather than days. */
export function formatMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(iso)
  );
}

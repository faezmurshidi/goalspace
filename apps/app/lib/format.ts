import { cookies } from 'next/headers';
import { localeFromCookie, NEXT_LOCALE_COOKIE, type Locale } from '@goalspace/i18n';

import { parseTimeZone, TIME_ZONE_COOKIE } from '@/lib/settings/preference-cookies';

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

/**
 * The request's time zone, from the same cookie the account settings form
 * writes. Same shape as `getLocale`: read here, once, so every server-rendered
 * date on the page agrees.
 */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  return parseTimeZone(store.get(TIME_ZONE_COOKIE)?.value);
}

/**
 * "23 Jul 2026". Unambiguous across locales in a way a numeric date is not.
 *
 * `timeZone` is required, not optional: `Intl.DateTimeFormat` with no
 * `timeZone` uses the runtime's zone, so a server in one region would render
 * every date in that region for every reader. `parseTimeZone` guards against
 * an unrecognised zone name (a stale cookie) reaching `Intl` and throwing.
 */
export function formatDate(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: parseTimeZone(timeZone),
  }).format(new Date(iso));
}

/**
 * Date plus time, for entries where the hour carries information.
 *
 * `timeZone` is required, not optional: `Intl.DateTimeFormat` with no
 * `timeZone` uses the runtime's zone, so a server in one region would render
 * every date in that region for every reader. `parseTimeZone` guards against
 * an unrecognised zone name (a stale cookie) reaching `Intl` and throwing.
 */
export function formatDateTime(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: parseTimeZone(timeZone),
  }).format(new Date(iso));
}

/**
 * "August 2026", for durations measured in months rather than days.
 *
 * `timeZone` is required, not optional: `Intl.DateTimeFormat` with no
 * `timeZone` uses the runtime's zone, so a server in one region would render
 * every date in that region for every reader. `parseTimeZone` guards against
 * an unrecognised zone name (a stale cookie) reaching `Intl` and throwing.
 */
export function formatMonthYear(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: parseTimeZone(timeZone),
  }).format(new Date(iso));
}

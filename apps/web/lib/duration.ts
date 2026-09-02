const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  const diff = (utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY;
  return diff > 0 ? Math.round(diff) : 0;
}

/**
 * Joins word-like fragments (a number and a unit, a unit and "ago") the
 * way each locale actually spaces text: Chinese doesn't space between
 * characters ("23天前", not "23 天 前"), while English and Malay do.
 */
export function localeJoin(parts: string[], locale: string): string {
  return parts.join(locale === 'zh' ? '' : ' ');
}

/**
 * Elapsed-time unit words, by locale. Malay and Chinese do not inflect
 * these for number, so both slots hold the same word; the singular/plural
 * lookup below still runs so English keeps its distinction. Only the
 * app's three supported locales are listed; anything else falls back to
 * English rather than producing an untranslated unit.
 */
const ELAPSED_UNIT_WORDS: Record<
  string,
  { day: [string, string]; month: [string, string]; year: [string, string] }
> = {
  en: { day: ['day', 'days'], month: ['month', 'months'], year: ['year', 'years'] },
  ms: { day: ['hari', 'hari'], month: ['bulan', 'bulan'], year: ['tahun', 'tahun'] },
  zh: { day: ['天', '天'], month: ['个月', '个月'], year: ['年', '年'] },
};

export function formatElapsed(
  days: number,
  locale: string = 'en'
): { value: string; unit: string } {
  const words = ELAPSED_UNIT_WORDS[locale] ?? ELAPSED_UNIT_WORDS.en;

  if (days >= 730) {
    const years = Math.floor(days / 365);
    return { value: String(years), unit: years === 1 ? words.year[0] : words.year[1] };
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return { value: String(months), unit: months === 1 ? words.month[0] : words.month[1] };
  }
  return { value: String(days), unit: days === 1 ? words.day[0] : words.day[1] };
}

/**
 * "2026-07-21" -> "21 July", read straight off the record's own dates.
 * `locale` defaults to `en-GB` but accepts any BCP-47 tag (the app's bare
 * `currentLocale` values, "en" | "ms" | "zh", all resolve fine through
 * `Intl.DateTimeFormat`), so callers with access to the active locale can
 * pass it straight through instead of hardcoding English.
 */
export function formatDayMonth(iso: string, locale: string = 'en-GB'): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    date
  );
}

/**
 * Full date including year, for content outside the specimen record (the
 * blog) whose dates are not all within the same year. Takes a full ISO
 * timestamp, not the bare YYYY-MM-DD the record uses.
 */
export function formatFullDate(iso: string, locale: string = 'en-GB'): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  const diff = (utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY;
  return diff > 0 ? Math.round(diff) : 0;
}

export function formatElapsed(days: number): { value: string; unit: string } {
  if (days >= 730) {
    const years = Math.floor(days / 365);
    return { value: String(years), unit: years === 1 ? 'year' : 'years' };
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return { value: String(months), unit: months === 1 ? 'month' : 'months' };
  }
  return { value: String(days), unit: days === 1 ? 'day' : 'days' };
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

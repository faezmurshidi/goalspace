import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatMonthYear } from '@/lib/format';

// 2026-01-01T02:00:00Z is still 2025-12-31 in New York and already
// 2026-01-01 in Kuala Lumpur — so a zone that is ignored shows up as a
// wrong day, month and year at once.
const NEW_YEAR_UTC = '2026-01-01T02:00:00.000Z';

describe('formatDate', () => {
  it('renders the date in the given zone, not the runtime zone', () => {
    expect(formatDate(NEW_YEAR_UTC, 'en', 'UTC')).toContain('2026');
    expect(formatDate(NEW_YEAR_UTC, 'en', 'America/New_York')).toContain('2025');
  });

  it('shifts the day across a zone boundary', () => {
    const kl = formatDate(NEW_YEAR_UTC, 'en', 'Asia/Kuala_Lumpur');
    const ny = formatDate(NEW_YEAR_UTC, 'en', 'America/New_York');
    expect(kl).not.toBe(ny);
  });
});

describe('formatDateTime', () => {
  it('renders the hour in the given zone', () => {
    // 02:00 UTC is 10:00 in Kuala Lumpur (UTC+8).
    expect(formatDateTime(NEW_YEAR_UTC, 'en', 'Asia/Kuala_Lumpur')).toMatch(/10[:.]00/);
    expect(formatDateTime(NEW_YEAR_UTC, 'en', 'UTC')).toMatch(/02[:.]00/);
  });
});

describe('formatMonthYear', () => {
  it('crosses a month boundary with the zone', () => {
    expect(formatMonthYear(NEW_YEAR_UTC, 'en', 'UTC')).toContain('January');
    expect(formatMonthYear(NEW_YEAR_UTC, 'en', 'America/New_York')).toContain('December');
  });
});

describe('an unknown zone', () => {
  it('renders as UTC rather than throwing or falling back to the host', () => {
    // Intl throws a RangeError on an unknown zone. A date page must not 500
    // because a cookie held a stale zone name.
    expect(() => formatDate(NEW_YEAR_UTC, 'en', 'Mars/Olympus_Mons')).not.toThrow();
    expect(formatDate(NEW_YEAR_UTC, 'en', 'Mars/Olympus_Mons')).toBe(
      formatDate(NEW_YEAR_UTC, 'en', 'UTC')
    );
  });
});

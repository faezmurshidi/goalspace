import { describe, expect, it } from 'vitest';

import { timeZoneOptions } from '@/lib/settings/time-zones';

describe('timeZoneOptions', () => {
  it('offers UTC, which Intl does not list', () => {
    // The regression this exists for: UTC is the column default and
    // parseTimeZone's fallback, so it is the stored value for every account
    // that has never picked a zone. A list without it leaves the <select> with
    // no matching option, and the browser then selects the first entry —
    // presenting Africa/Abidjan as the user's zone and overwriting UTC on save.
    expect(Intl.supportedValuesOf('timeZone')).not.toContain('UTC');
    expect(timeZoneOptions()).toContain('UTC');
  });

  it('lists UTC first, because it is the default rather than a location', () => {
    expect(timeZoneOptions()[0]).toBe('UTC');
  });

  it('offers no zone twice', () => {
    // Guards the case where a future ICU starts listing UTC itself: appending
    // unconditionally would then show it twice.
    const zones = timeZoneOptions();
    expect(zones.length).toBe(new Set(zones).size);
  });

  it('still carries the real IANA zones', () => {
    const zones = timeZoneOptions();
    expect(zones).toContain('Asia/Kuala_Lumpur');
    expect(zones).toContain('America/New_York');
    expect(zones.length).toBeGreaterThan(400);
  });
});

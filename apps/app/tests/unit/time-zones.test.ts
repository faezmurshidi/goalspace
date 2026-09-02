import { describe, expect, it } from 'vitest';

import { parseTimeZone } from '@/lib/settings/preference-cookies';
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

  it('has a matching option for every value parseTimeZone can return', () => {
    // The UTC-missing-from-the-select bug is fixed and tested above, but that
    // only proves the one instance. The actual invariant is broader: whatever
    // parseTimeZone resolves a stored or cookie-carried value to, the select
    // built from timeZoneOptions must be able to represent it — otherwise the
    // same class of bug reappears the next time the fallback changes.
    const zones = timeZoneOptions();
    const candidates = [
      'Asia/Kuala_Lumpur',
      'America/New_York',
      'UTC',
      undefined,
      '',
      'Mars/Olympus_Mons',
      'GMT+7',
      '../etc',
      '<script>',
      '\n',
      '🚀',
    ];

    for (const candidate of candidates) {
      expect(zones).toContain(parseTimeZone(candidate));
    }
  });

  it('has a matching option for known time zone aliases', () => {
    // `Intl.supportedValuesOf('timeZone')` is specified to return only
    // primary IANA identifiers, but `Intl.DateTimeFormat` still accepts
    // aliases. On an engine whose list carries only the primary id
    // (`Asia/Kolkata`) rather than the alias (`Asia/Calcutta`), a stored
    // alias returned unchanged would have no matching <select> option — the
    // same class of bug fixed for UTC above, through a different door. This
    // does not reproduce on every engine (this repo's Node still returns the
    // alias unchanged from both supportedValuesOf and resolvedOptions), so
    // the invariant has to hold structurally rather than by reproducing the
    // mismatch here.
    const zones = timeZoneOptions();
    const aliases = ['Asia/Calcutta', 'Europe/Kiev', 'America/Godthab'];

    for (const alias of aliases) {
      expect(zones).toContain(parseTimeZone(alias));
    }
  });
});

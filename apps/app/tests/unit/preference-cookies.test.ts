import { describe, expect, it } from 'vitest';

import {
  isSupportedTimeZone,
  parseTheme,
  parseTimeZone,
  LOCALE_COOKIE_OPTIONS,
  PREFERENCE_COOKIE_MAX_AGE,
  SERVER_PREFERENCE_COOKIE_OPTIONS,
  THEME_COOKIE,
  TIME_ZONE_COOKIE,
} from '@/lib/settings/preference-cookies';

describe('parseTheme', () => {
  it('accepts the three themes next-themes understands', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
  });

  it('falls back to system for anything else', () => {
    // A cookie is client-writable. Anything unrecognised must land on the
    // documented default rather than reaching next-themes as a class name.
    for (const value of [undefined, '', 'sepia', 'DARK', '<script>']) {
      expect(parseTheme(value)).toBe('system');
    }
  });
});

describe('parseTimeZone', () => {
  it('accepts a real IANA zone', () => {
    expect(parseTimeZone('Asia/Kuala_Lumpur')).toBe('Asia/Kuala_Lumpur');
    expect(parseTimeZone('Europe/London')).toBe('Europe/London');
  });

  it('falls back to UTC for anything the runtime does not know', () => {
    // Never the server's own zone: rendering dates in whatever zone the host
    // happens to run in is the bug this slice exists to fix, so the fallback
    // has to be a stated value rather than an ambient one.
    for (const value of [undefined, '', 'Mars/Olympus_Mons', 'GMT+7', '../etc']) {
      expect(parseTimeZone(value)).toBe('UTC');
    }
  });

  it('does not throw on a value that would break Intl', () => {
    expect(() => parseTimeZone('\n')).not.toThrow();
    expect(() => parseTimeZone('🚀')).not.toThrow();
  });
});

describe('isSupportedTimeZone', () => {
  it('agrees with the runtime rather than a hardcoded list', () => {
    // The D1 migration deliberately left time_zone unconstrained because the
    // IANA list is maintained outside this repo. A hardcoded list here would
    // be the same mistake one layer up.
    expect(isSupportedTimeZone('UTC')).toBe(true);
    expect(isSupportedTimeZone('America/New_York')).toBe(true);
    expect(isSupportedTimeZone('Nowhere/Nothing')).toBe(false);
  });
});

describe('cookie names', () => {
  it('are distinct and namespaced like the existing locale cookie', () => {
    expect(THEME_COOKIE).not.toBe(TIME_ZONE_COOKIE);
    for (const name of [THEME_COOKIE, TIME_ZONE_COOKIE]) {
      expect(name).toMatch(/^[A-Za-z0-9_.-]+$/);
    }
  });
});

describe('cookie option objects', () => {
  // Nothing else asserts these attributes on any of the three writers (the
  // auth callback, updateAccountSettingsAction, clearPreferenceCookiesAction)
  // — dropping httpOnly today would still leave every other gate green.

  it('both apply to the whole app, not just the route that sets them', () => {
    expect(LOCALE_COOKIE_OPTIONS.path).toBe('/');
    expect(SERVER_PREFERENCE_COOKIE_OPTIONS.path).toBe('/');
  });

  it('both carry the shared preference max-age', () => {
    expect(LOCALE_COOKIE_OPTIONS.maxAge).toBe(PREFERENCE_COOKIE_MAX_AGE);
    expect(SERVER_PREFERENCE_COOKIE_OPTIONS.maxAge).toBe(PREFERENCE_COOKIE_MAX_AGE);
  });

  it('is httpOnly only for the server-only variant', () => {
    // NEXT_LOCALE must stay client-readable: use-translations.ts writes it
    // via document.cookie. The theme and time-zone cookies are never read on
    // the client, so httpOnly must hold for that variant instead.
    expect(SERVER_PREFERENCE_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect((LOCALE_COOKIE_OPTIONS as { httpOnly?: boolean }).httpOnly).not.toBe(true);
  });
});

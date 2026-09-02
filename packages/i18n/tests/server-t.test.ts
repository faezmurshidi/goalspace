import { describe, expect, it } from 'vitest';

import { getFixedT } from '../src/server';

describe('getFixedT', () => {
  it('resolves a dot-path key', () => {
    expect(getFixedT('en')('app.nav.resume')).toBe('Resume');
  });

  it('resolves in the requested locale', () => {
    expect(getFixedT('zh')('app.nav.log')).toBe('日志');
    expect(getFixedT('ms')('app.nav.work')).toBe('Kerja');
  });

  it('interpolates named variables', () => {
    expect(getFixedT('en')('app.resume.overdueDays', { count: 12 })).toBe('12 days past due');
  });

  it('interpolates the same variable more than once', () => {
    // i18next allows a key to repeat a placeholder; a naive single replace
    // would leave the second one showing raw braces to the user.
    const t = getFixedT('en');
    expect(t('app.resume.progressOf', { done: 2, total: 2 }).includes('{{')).toBe(false);
  });

  it('leaves an unknown placeholder untouched rather than printing undefined', () => {
    expect(getFixedT('en')('app.resume.overdueDays')).toBe('{{count}} days past due');
  });

  it('falls back to English when a locale is missing the key', () => {
    // Translations land at different times. A missing ms string should show
    // usable English, never a raw key in the middle of the interface.
    const t = getFixedT('ms');
    expect(t('app.nav.resume')).toBe('Sambung');
  });

  it('returns the key itself when nothing resolves, in any locale', () => {
    expect(getFixedT('en')('app.nope.missing')).toBe('app.nope.missing');
    expect(getFixedT('zh')('app.nope.missing')).toBe('app.nope.missing');
  });

  it('does not return an object when the key points at a branch', () => {
    // 'app.nav' is a namespace, not a string. Rendering "[object Object]"
    // into the page is worse than showing the key.
    expect(getFixedT('en')('app.nav')).toBe('app.nav');
  });

  describe('plural resolution', () => {
    it('selects the _one form for a singular count in English', () => {
      expect(getFixedT('en')('app.runs.steps', { count: 1 })).toBe('1 step');
    });

    it('selects the _other form for a plural count', () => {
      expect(getFixedT('en')('app.runs.steps', { count: 3 })).toBe('3 steps');
    });

    it('selects the _other form for a zero count', () => {
      expect(getFixedT('en')('app.runs.steps', { count: 0 })).toBe('0 steps');
    });

    it('selects the inert _other form for every count in Chinese', () => {
      // Intl.PluralRules('zh') has only one category, "other" — the zh.json
      // _one entries exist solely to satisfy locale parity and are never
      // selected. That is correct, by design.
      expect(getFixedT('zh')('app.runs.steps', { count: 1 })).toBe('1 步');
      expect(getFixedT('zh')('app.runs.steps', { count: 5 })).toBe('5 步');
    });

    it('still resolves a key with no plural forms normally', () => {
      expect(getFixedT('en')('app.resume.overdueDays', { count: 12 })).toBe('12 days past due');
    });

    it('still returns the key when nothing resolves, count included', () => {
      expect(getFixedT('en')('app.nope.missing', { count: 2 })).toBe('app.nope.missing');
    });
  });
});

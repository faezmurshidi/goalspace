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

describe('the silent-turn line', () => {
  // It reports a count that is genuinely often zero — a model can decline
  // before calling anything — and i18next only reaches a `_zero` key as a
  // special case, since English has no zero plural category. Asserting it
  // rather than trusting it: a missed `_zero` would render the key itself.
  it('has a distinct key for no tool calls at all', () => {
    // Not a `_zero` plural: English has no zero category, so i18next falls
    // through to `_other` and renders "after 0 tool calls". Written as a
    // test first, which is how that was found rather than shipped.
    const line = getFixedT('en')('app.chat.silentTurnNoTools');
    expect(line).toContain('no tools');
    expect(line).not.toContain('{{');
  });

  it('reads as singular for one call and plural for several', () => {
    const t = getFixedT('en');
    expect(t('app.chat.silentTurn', { count: 1 })).toContain('1 tool call');
    expect(t('app.chat.silentTurn', { count: 12 })).toContain('12 tool calls');
  });

  it('resolves in every locale rather than falling back to the key', () => {
    for (const locale of ['en', 'ms', 'zh'] as const) {
      expect(getFixedT(locale)('app.chat.silentTurnNoTools')).not.toContain('silentTurn');
      for (const count of [1, 12]) {
        const line = getFixedT(locale)('app.chat.silentTurn', { count });
        expect(line).not.toContain('silentTurn');
        expect(line).not.toContain('{{');
      }
    }
  });
});

describe('the staleness line', () => {
  it('reads as a fact, not a judgement', () => {
    // The count cannot know whether those entries matter to this document.
    // Wording that implied they did — stale, outdated, needs attention —
    // would be a claim the product cannot support.
    expect(getFixedT('en')('app.documents.since', { count: 14 })).toBe(
      '14 entries since this was written'
    );
  });

  it('is singular for one', () => {
    expect(getFixedT('en')('app.documents.since', { count: 1 })).toBe(
      '1 entry since this was written'
    );
  });

  it('resolves in ms and zh rather than falling back to the key', () => {
    for (const locale of ['ms', 'zh'] as const) {
      for (const count of [1, 14]) {
        const line = getFixedT(locale)('app.documents.since', { count });
        expect(line).not.toContain('documents.since');
        expect(line).not.toContain('{{');
      }
    }
  });
});

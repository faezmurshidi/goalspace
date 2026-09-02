import { describe, expect, it } from 'vitest';

import { checkCaps } from '@/lib/agents/caps';

const budget = { monthly_cap_usd: 10, per_run_token_cap: 200_000 };

describe('checkCaps', () => {
  it('allows a run comfortably inside both caps', () => {
    expect(checkCaps({ budget, monthToDateUsd: 1, runTokens: 1000 })).toEqual({ allowed: true });
  });

  it('blocks when month-to-date spend has reached the monthly cap', () => {
    expect(checkCaps({ budget, monthToDateUsd: 10, runTokens: 0 })).toMatchObject({
      allowed: false,
      cap: 'monthly',
    });
  });

  it('blocks when month-to-date spend is over the cap', () => {
    expect(checkCaps({ budget, monthToDateUsd: 10.01, runTokens: 0 }).allowed).toBe(false);
  });

  it('blocks when the run has burned its token cap', () => {
    expect(checkCaps({ budget, monthToDateUsd: 0, runTokens: 200_000 })).toMatchObject({
      allowed: false,
      cap: 'per_run',
    });
  });

  it('reports the monthly cap first when both are exceeded', () => {
    expect(checkCaps({ budget, monthToDateUsd: 99, runTokens: 999_999 })).toMatchObject({
      allowed: false,
      cap: 'monthly',
    });
  });

  it('carries a message the UI can state plainly', () => {
    const v = checkCaps({ budget, monthToDateUsd: 10, runTokens: 0 });
    if (v.allowed) throw new Error('expected a block');
    expect(v.message.length).toBeGreaterThan(0);
  });
});

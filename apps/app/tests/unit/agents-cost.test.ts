import { describe, expect, it } from 'vitest';

import { costUsd, gatewayCostFrom } from '@/lib/agents/cost';

describe('costUsd', () => {
  it('prices a known model from the rate table', () => {
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(18, 6);
  });

  it('prices cached input at the cached rate', () => {
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.3, 6);
  });

  it('prefers the gateway-reported cost when present', () => {
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      gatewayCostUsd: 0.42,
    });
    expect(cost).toBe(0.42);
  });

  it('returns 0 for an unknown model rather than throwing', () => {
    expect(costUsd({ model: 'acme/nope', inputTokens: 1000, outputTokens: 1000 })).toBe(0);
  });

  it('treats undefined token counts as zero', () => {
    expect(costUsd({ model: 'anthropic/claude-sonnet-5' })).toBe(0);
  });

  it('prices the seeded gpt-4o-mini from the rate table', () => {
    const cost = costUsd({
      model: 'openai/gpt-4o-mini',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.75, 6);
  });
});

describe('gatewayCostFrom', () => {
  // The gateway reports cost as a *string* — "0.00000375", verified against a
  // live call. Handed to costUsd unparsed it fails the `typeof === 'number'`
  // check and silently falls through to the rate table, which is the exact
  // drift the gateway figure exists to prevent.
  it('parses the string cost the gateway actually returns', () => {
    expect(gatewayCostFrom({ gateway: { cost: '0.00000375' } })).toBeCloseTo(0.00000375, 12);
  });

  it('accepts a number, should the gateway ever send one', () => {
    expect(gatewayCostFrom({ gateway: { cost: 0.5 } })).toBe(0.5);
  });

  it('reads zero as a real figure, not as absence', () => {
    // A cached-only step can genuinely cost nothing. Returning undefined here
    // would fall back to the rate table and invent a charge.
    expect(gatewayCostFrom({ gateway: { cost: '0' } })).toBe(0);
  });

  it('returns undefined when the gateway reports no cost', () => {
    expect(gatewayCostFrom({ gateway: { routing: {} } })).toBeUndefined();
    expect(gatewayCostFrom({ openai: { responseId: 'resp_1' } })).toBeUndefined();
    expect(gatewayCostFrom(undefined)).toBeUndefined();
    expect(gatewayCostFrom(null)).toBeUndefined();
  });

  it('returns undefined for a value that is not a finite number', () => {
    expect(gatewayCostFrom({ gateway: { cost: 'free' } })).toBeUndefined();
    expect(gatewayCostFrom({ gateway: { cost: '' } })).toBeUndefined();
    expect(gatewayCostFrom({ gateway: { cost: Number.NaN } })).toBeUndefined();
    expect(gatewayCostFrom({ gateway: { cost: Infinity } })).toBeUndefined();
  });

  it('rejects a negative cost rather than crediting a run', () => {
    expect(gatewayCostFrom({ gateway: { cost: '-1' } })).toBeUndefined();
  });
});

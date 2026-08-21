import { describe, expect, it } from 'vitest';

import { costUsd } from '@/lib/agents/cost';

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
});

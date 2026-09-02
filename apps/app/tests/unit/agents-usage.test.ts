import { describe, expect, it } from 'vitest';

import { tokensFromUsage } from '@/lib/agents/usage';

const usage = (over: Partial<Record<string, unknown>> = {}) => ({
  inputTokens: 100,
  outputTokens: 20,
  inputTokenDetails: { noCacheTokens: 70, cacheReadTokens: 30, cacheWriteTokens: 0 },
  ...over,
});

describe('tokensFromUsage', () => {
  it('keeps cached and non-cached input disjoint', () => {
    // costUsd prices the two at different rates and adds both, so reporting
    // the total as input_tokens double-counts every cached token.
    const t = tokensFromUsage(usage() as never);
    expect(t.nonCachedInput).toBe(70);
    expect(t.cachedInput).toBe(30);
    expect(t.nonCachedInput + t.cachedInput).toBe(100);
  });

  it('falls back to inputTokens when the provider reports no detail', () => {
    const t = tokensFromUsage(
      usage({
        inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined },
      }) as never
    );
    expect(t.nonCachedInput).toBe(100);
    expect(t.cachedInput).toBe(0);
  });

  it('reports zero rather than NaN when nothing is known', () => {
    // A run that failed before its first token still gets a usage row. NaN
    // there would poison the month-to-date sum the caps are checked against.
    const t = tokensFromUsage({
      inputTokens: undefined,
      outputTokens: undefined,
      inputTokenDetails: {},
    } as never);
    expect(t).toEqual({ nonCachedInput: 0, outputTokens: 0, cachedInput: 0 });
  });
});

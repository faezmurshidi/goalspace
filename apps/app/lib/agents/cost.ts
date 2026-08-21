/**
 * What a run cost, in dollars.
 *
 * Two sources, in priority order. The gateway reports what it actually
 * charged; the rate table below is a fallback for when it does not. A local
 * rate table drifts the moment a provider reprices, and the failure mode is
 * confidently displayed wrong numbers rather than a crash — so the gateway's
 * figure wins whenever it is available.
 *
 * An unknown model returns 0 rather than throwing. A missing rate should not
 * be able to fail a run that already happened.
 */

export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok: number;
}

/** Dollars per million tokens. Configuration, not code — see spec §12. */
export const RATES: Record<string, ModelRate> = {
  'anthropic/claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15, cachedInputPerMTok: 0.3 },
  'anthropic/claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, cachedInputPerMTok: 0.5 },
  'anthropic/claude-haiku-4.5': { inputPerMTok: 1, outputPerMTok: 5, cachedInputPerMTok: 0.1 },
};

export interface CostInput {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  /** What the gateway says it charged. Wins over the table when present. */
  gatewayCostUsd?: number;
}

export function costUsd(input: CostInput): number {
  if (typeof input.gatewayCostUsd === 'number') return input.gatewayCostUsd;

  const rate = RATES[input.model];
  if (!rate) return 0;

  const perToken = (tokens: number | undefined, perMTok: number) =>
    ((tokens ?? 0) / 1_000_000) * perMTok;

  return (
    perToken(input.inputTokens, rate.inputPerMTok) +
    perToken(input.outputTokens, rate.outputPerMTok) +
    perToken(input.cachedInputTokens, rate.cachedInputPerMTok)
  );
}

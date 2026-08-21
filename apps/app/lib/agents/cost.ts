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
  // What the seeded Critic runs on until the gateway account carries credits:
  // every anthropic/* slug returns 403 RestrictedModelsError on the free tier.
  'openai/gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6, cachedInputPerMTok: 0.075 },
};

export interface CostInput {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  /** What the gateway says it charged. Wins over the table when present. */
  gatewayCostUsd?: number;
}

/**
 * Digs the gateway's own charge out of `providerMetadata`.
 *
 * The gateway reports cost as a decimal *string* — `"0.00000375"` — under
 * `providerMetadata.gateway.cost`, verified against a live call rather than
 * assumed. Passed through unparsed it fails `costUsd`'s `typeof === 'number'`
 * check and falls silently back to the rate table, which is precisely the
 * drift the gateway figure exists to prevent. Parsing it here, once, keeps
 * that shape knowledge out of the route handler.
 *
 * Returns undefined rather than 0 when there is nothing to read: 0 is a real
 * cost a cached step can incur, so the two must stay distinguishable.
 */
export function gatewayCostFrom(metadata: unknown): number | undefined {
  if (typeof metadata !== 'object' || metadata === null) return undefined;

  const gateway = (metadata as Record<string, unknown>).gateway;
  if (typeof gateway !== 'object' || gateway === null) return undefined;

  const cost = (gateway as Record<string, unknown>).cost;
  if (typeof cost !== 'string' && typeof cost !== 'number') return undefined;

  // Number('') is 0, which would report a free run as costing nothing.
  if (typeof cost === 'string' && cost.trim() === '') return undefined;

  const parsed = Number(cost);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
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

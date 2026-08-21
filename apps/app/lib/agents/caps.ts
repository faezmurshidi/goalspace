/**
 * Spend limits, checked before a run starts and again after each step.
 *
 * An agentic retrieval loop with a stuck model is the realistic way to burn a
 * budget, so the per-run token cap matters as much as the monthly one. A run
 * that trips either ends with status `capped`, keeps whatever it produced,
 * and surfaces which cap it hit — silence here is the failure mode the
 * success criteria exist to rule out.
 */

export interface Budget {
  monthly_cap_usd: number;
  per_run_token_cap: number;
}

export type CapVerdict =
  | { allowed: true }
  | { allowed: false; cap: 'monthly' | 'per_run'; message: string };

export function checkCaps(input: {
  budget: Budget;
  monthToDateUsd: number;
  runTokens: number;
}): CapVerdict {
  const { budget, monthToDateUsd, runTokens } = input;

  if (monthToDateUsd >= budget.monthly_cap_usd) {
    return {
      allowed: false,
      cap: 'monthly',
      message: `Monthly cap of $${budget.monthly_cap_usd.toFixed(2)} reached ($${monthToDateUsd.toFixed(2)} spent).`,
    };
  }

  if (runTokens >= budget.per_run_token_cap) {
    return {
      allowed: false,
      cap: 'per_run',
      message: `This run reached its ${budget.per_run_token_cap.toLocaleString()} token limit.`,
    };
  }

  return { allowed: true };
}

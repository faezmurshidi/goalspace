import { describe, expect, it } from 'vitest';

import { worstCaseReservationUsd } from '@/lib/db/budgets';
import { worstCaseUsd } from '@/lib/agents/cost';

describe('worstCaseReservationUsd', () => {
  it('reports the largest single reservation, not the average or the sum', () => {
    // §6.4: "the worst-case reservation at the project's current models,
    // because that figure — not the average — is what decides whether a run is
    // refused." The per-run check evaluates one run at a time, so the sum
    // describes a scenario it never asks about.
    const models = ['openai/gpt-4o-mini', 'anthropic/claude-opus-5'];
    const cap = 200_000;
    const expected = Math.max(...models.map((m) => worstCaseUsd(m, cap)));

    expect(worstCaseReservationUsd(models, cap).usd).toBeCloseTo(expected, 9);
    expect(worstCaseReservationUsd(models, cap).usd).toBeGreaterThan(
      worstCaseUsd('openai/gpt-4o-mini', cap)
    );
  });

  it('reports zero and nothing unpriced when a project has no agents', () => {
    expect(worstCaseReservationUsd([], 200_000)).toEqual({ usd: 0, unpriced: [] });
  });

  it('names an unpriced model instead of pricing it at zero', () => {
    // worstCaseUsd returns 0 for a model absent from RATES. Folding that into
    // the figure would render $0.0000, which on this page is indistinguishable
    // from a cheap model at a low cap — so the surface whose job is to state
    // the refusal threshold would hide the case where there is not one.
    expect(worstCaseReservationUsd(['acme/unpriced'], 200_000)).toEqual({
      usd: 0,
      unpriced: ['acme/unpriced'],
    });
  });

  it('still reports the priced maximum when one model among several is unpriced', () => {
    const result = worstCaseReservationUsd(
      ['openai/gpt-4o-mini', 'acme/unpriced'],
      200_000
    );
    expect(result.usd).toBeCloseTo(worstCaseUsd('openai/gpt-4o-mini', 200_000), 9);
    expect(result.unpriced).toEqual(['acme/unpriced']);
  });
});

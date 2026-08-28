import { z } from 'zod';

/**
 * A project's spending limits.
 *
 * Both caps mirror their columns exactly, because a value this schema accepts
 * and the column cannot store is the worst kind of validation: Postgres
 * silently rounds `numeric(10,2)`, so the figure read back would differ from
 * the one submitted with nothing reporting a problem.
 *
 * The token floor is not arbitrary. A cap of a few hundred tokens cannot
 * complete any useful run, so setting one would look like a configuration
 * choice and behave like an outage.
 */
export const MIN_PER_RUN_TOKEN_CAP = 1_000;
export const MAX_PER_RUN_TOKEN_CAP = 2_000_000;

export const updateBudgetSchema = z.object({
  monthly_cap_usd: z
    .number()
    .min(0)
    // numeric(10,2): eight digits before the point, two after.
    .max(99_999_999.99)
    // `Number(n.toFixed(2)) === n` rather than arithmetic on `n * 100`. The
    // multiply-and-compare form looks equivalent and is not: floating-point
    // error in `n * 100` grows with magnitude, so a fixed epsilon starts
    // rejecting legitimate values partway up the allowed range (131072.02 is
    // the first). toFixed rounds decimally and the comparison is exact.
    .refine((n) => Number(n.toFixed(2)) === n, {
      message: 'A cap is set to the cent.',
    }),
  per_run_token_cap: z.number().int().min(MIN_PER_RUN_TOKEN_CAP).max(MAX_PER_RUN_TOKEN_CAP),
});

export type UpdateBudgetValues = z.output<typeof updateBudgetSchema>;

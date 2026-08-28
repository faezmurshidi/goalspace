import { describe, expect, it } from 'vitest';

import { updateBudgetSchema } from '@/lib/schemas/budget';

const valid = { monthly_cap_usd: 25, per_run_token_cap: 200_000 };

describe('updateBudgetSchema', () => {
  it('accepts a well-formed budget', () => {
    expect(updateBudgetSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a genuine two-decimal cap', () => {
    // `valid` uses an integer, so without this the accept path for the
    // decimal rule is never exercised at all.
    for (const cap of [0.07, 1.1, 42.5, 12.34]) {
      expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: cap }).success).toBe(true);
    }
  });

  it('accepts a large cap without floating-point false rejections', () => {
    // The obvious `n * 100` form of this rule rejects these; the toFixed form
    // does not. Both are inside numeric(10,2).
    for (const cap of [131_072.02, 272_522.35, 20_000_000.01]) {
      expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: cap }).success).toBe(true);
    }
  });

  it('accepts a zero monthly cap, which stops every run', () => {
    // Zero is a legitimate setting — "no agent spending this month" — and is
    // distinct from absent. The column is not nullable precisely so that the
    // default posture cannot become "unlimited".
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 0 }).success).toBe(true);
  });

  it('rejects a negative monthly cap', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: -1 }).success).toBe(false);
  });

  it('rejects more than two decimal places, which the column cannot store', () => {
    // numeric(10,2). A third decimal would be rounded by Postgres, so the value
    // read back would differ from the value submitted, with no error anywhere.
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 1.005 }).success).toBe(false);
  });

  it('rejects a monthly cap beyond what numeric(10,2) holds', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 100_000_000 }).success).toBe(
      false
    );
  });

  it('rejects a fractional token cap', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, per_run_token_cap: 1000.5 }).success).toBe(
      false
    );
  });

  it('rejects a token cap below a floor that could never complete a run', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, per_run_token_cap: 100 }).success).toBe(false);
  });
});

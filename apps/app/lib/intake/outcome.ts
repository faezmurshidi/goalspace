export interface ApplyCounts {
  applied: number;
  questions: number;
  failed: number;
}

/**
 * What to tell the owner after applying, or nothing.
 *
 * Nothing is the common case and the right default. They arrive at a resume
 * view holding the items they ticked, which is the confirmation; announcing a
 * count on top of it would be the progress celebration PRODUCT.md excludes.
 *
 * A failure is different. `applyIntakeAction` keeps whatever applied and leaves
 * the rest pending, so a silent partial failure means the owner walks away
 * believing they created nine items when they created six — and finds the other
 * three in an inbox they have no reason to open.
 */
export function describeApplyOutcome(counts: ApplyCounts): { key: string; count: number } | null {
  if (counts.failed === 0) return null;
  return { key: 'app.intake.partialFailure', count: counts.failed };
}

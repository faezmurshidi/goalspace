/**
 * Re-entry: what the project was waiting on while you were gone.
 *
 * This is the thesis of the product expressed as arithmetic. `blocked` plus a
 * `wake_at` is neither open (nothing to do) nor done, and for a hardware build
 * waiting is half the project. Returning after a month, the resume view should
 * say *the motor you ordered in March should have arrived*, which is this
 * module plus a sentence.
 *
 * Pure, and takes `now` as an argument rather than reading the clock, so every
 * boundary below is a deterministic test instead of a flake at midnight.
 */

import type { WorkItemStatus } from './progress';

const DAY_MS = 86_400_000;

/**
 * Gaps shorter than this are not worth narrating. "Away 1 day" is absurd on a
 * screen whose entire argument is elapsed time, so below the threshold the
 * resume view drops to a plain last-session timestamp instead.
 */
export const SIGNIFICANT_ABSENCE_DAYS = 3;

export interface ReentryRow {
  id: string;
  status: WorkItemStatus;
  /** ISO 8601, or null when nothing is being waited on. */
  wake_at: string | null;
}

export type WokenItem<R extends ReentryRow = ReentryRow> = R & {
  /** Whole days since the wake date passed. 0 means it came due today. */
  overdueDays: number;
};

/**
 * Blocked items whose wake date has arrived, longest overdue first.
 *
 * Only `blocked` rows qualify. `wake_at` may legitimately be set on any
 * status, but surfacing an open or finished item under "waiting on the world"
 * would be noise on the one screen that has to stay scannable.
 */
export function wokenItems<R extends ReentryRow>(rows: readonly R[], now: Date): WokenItem<R>[] {
  const nowMs = now.getTime();
  const woken: WokenItem<R>[] = [];

  for (const row of rows) {
    if (row.status !== 'blocked') continue;
    if (row.wake_at === null) continue;

    const wakeMs = Date.parse(row.wake_at);
    // A malformed timestamp is bad data, not a reason to fail the whole
    // resume view. Skipping it loses one row; throwing loses the screen.
    if (!Number.isFinite(wakeMs)) continue;
    if (wakeMs > nowMs) continue;

    woken.push({ ...row, overdueDays: Math.floor((nowMs - wakeMs) / DAY_MS) });
  }

  return woken.sort((a, b) => b.overdueDays - a.overdueDays);
}

export interface Absence {
  /** Whole 24-hour periods elapsed, not calendar days. */
  days: number;
  significant: boolean;
}

/**
 * How long the project sat untouched, or null when there is nothing to
 * measure: a project with no activity yet, or an unusable timestamp.
 *
 * Counts elapsed 24-hour periods rather than calendar days on purpose. Calendar
 * days would need a timezone to be meaningful, and the answer would change
 * depending on where the user opened the laptop.
 */
export function describeAbsence(lastActivityAt: Date | null, now: Date): Absence | null {
  if (lastActivityAt === null) return null;

  const lastMs = lastActivityAt.getTime();
  if (!Number.isFinite(lastMs)) return null;

  // Clock skew between the browser and the database is ordinary, and
  // "away -1 days" is worse than saying nothing.
  const elapsed = Math.max(0, now.getTime() - lastMs);
  const days = Math.floor(elapsed / DAY_MS);

  return { days, significant: days >= SIGNIFICANT_ABSENCE_DAYS };
}

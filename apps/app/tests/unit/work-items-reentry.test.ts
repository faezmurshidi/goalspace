import { describe, expect, it } from 'vitest';

import type { WorkItemStatus } from '@/lib/work-items/progress';
import {
  describeAbsence,
  SIGNIFICANT_ABSENCE_DAYS,
  wokenItems,
  type ReentryRow,
} from '@/lib/work-items/reentry';

const NOW = new Date('2026-08-14T12:00:00.000Z');

function daysBefore(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}
function daysAfter(n: number): string {
  return new Date(NOW.getTime() + n * 86_400_000).toISOString();
}
function row(id: string, status: WorkItemStatus, wake_at: string | null = null): ReentryRow {
  return { id, status, wake_at };
}

describe('wokenItems', () => {
  it('returns nothing for no rows', () => {
    expect(wokenItems([], NOW)).toEqual([]);
  });

  it('surfaces a blocked item whose wake date has passed', () => {
    const woken = wokenItems([row('motor', 'blocked', daysBefore(5))], NOW);

    expect(woken.map((w) => w.id)).toEqual(['motor']);
    expect(woken[0].overdueDays).toBe(5);
  });

  it('leaves a blocked item alone until its wake date arrives', () => {
    expect(wokenItems([row('motor', 'blocked', daysAfter(3))], NOW)).toEqual([]);
  });

  it('surfaces an item whose wake date is exactly now', () => {
    // The boundary is inclusive: a six-week lead time that lands today is
    // due today, not tomorrow.
    const woken = wokenItems([row('motor', 'blocked', NOW.toISOString())], NOW);

    expect(woken.map((w) => w.id)).toEqual(['motor']);
    expect(woken[0].overdueDays).toBe(0);
  });

  it('ignores a blocked item with no wake date', () => {
    // Blocked on something with no date attached is not waiting on the world
    // in a way a clock can resolve, so it belongs under what is open.
    expect(wokenItems([row('stuck', 'blocked', null)], NOW)).toEqual([]);
  });

  it.each(['open', 'doing', 'done', 'dropped'] as const)(
    'ignores a %s item even when its wake date has passed',
    (status) => {
      // wake_at may be set on any status, but the spec surfaces only blocked
      // items here. The rest would be noise on a screen about what is waiting.
      expect(wokenItems([row('x', status, daysBefore(10))], NOW)).toEqual([]);
    }
  );

  it('puts the longest overdue item first', () => {
    const woken = wokenItems(
      [
        row('recent', 'blocked', daysBefore(2)),
        row('ancient', 'blocked', daysBefore(90)),
        row('middling', 'blocked', daysBefore(30)),
      ],
      NOW
    );

    expect(woken.map((w) => w.id)).toEqual(['ancient', 'middling', 'recent']);
  });

  it('ignores an unparseable wake date rather than throwing', () => {
    expect(wokenItems([row('bad', 'blocked', 'not-a-date')], NOW)).toEqual([]);
  });
});

describe('describeAbsence', () => {
  it('reports nothing when there is no activity yet', () => {
    // A brand new project has no last session, so there is no absence to
    // describe and the resume view shows its first-run state instead.
    expect(describeAbsence(null, NOW)).toBeNull();
  });

  it('counts whole elapsed days', () => {
    expect(describeAbsence(new Date(daysBefore(23)), NOW)).toEqual({
      days: 23,
      significant: true,
    });
  });

  it('does not call a short gap significant', () => {
    // "Away 1 day" is absurd on a screen whose whole argument is elapsed time.
    expect(describeAbsence(new Date(daysBefore(1)), NOW)).toEqual({
      days: 1,
      significant: false,
    });
  });

  it('treats the threshold itself as significant', () => {
    expect(describeAbsence(new Date(daysBefore(SIGNIFICANT_ABSENCE_DAYS)), NOW)).toEqual({
      days: SIGNIFICANT_ABSENCE_DAYS,
      significant: true,
    });
  });

  it('reports zero days for activity earlier today', () => {
    const earlier = new Date(NOW.getTime() - 3 * 3_600_000);
    expect(describeAbsence(earlier, NOW)).toEqual({ days: 0, significant: false });
  });

  it('clamps a future timestamp to zero instead of going negative', () => {
    // Clock skew between the browser and the database is normal, and
    // "away -1 days" would be worse than saying nothing.
    expect(describeAbsence(new Date(daysAfter(2)), NOW)).toEqual({
      days: 0,
      significant: false,
    });
  });

  it('reports nothing for an invalid timestamp', () => {
    expect(describeAbsence(new Date('nonsense'), NOW)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { computeProgress, type ProgressRow, type WorkItemStatus } from '@/lib/work-items/progress';

function row(id: string, status: WorkItemStatus, parent_id: string | null = null): ProgressRow {
  return { id, status, parent_id };
}

describe('computeProgress', () => {
  it('returns nothing for no rows', () => {
    expect(computeProgress([]).size).toBe(0);
  });

  it('counts an unfinished leaf as 0 of 1', () => {
    const p = computeProgress([row('a', 'open')]);
    expect(p.get('a')).toEqual({ done: 0, total: 1, ratio: 0 });
  });

  it('counts a done leaf as 1 of 1', () => {
    const p = computeProgress([row('a', 'done')]);
    expect(p.get('a')).toEqual({ done: 1, total: 1, ratio: 1 });
  });

  it.each(['open', 'doing', 'blocked'] as const)('counts a %s leaf as unfinished', (status) => {
    expect(computeProgress([row('a', status)]).get('a')).toEqual({
      done: 0,
      total: 1,
      ratio: 0,
    });
  });

  it('sums a parent over its leaf descendants', () => {
    const p = computeProgress([
      row('parent', 'open'),
      row('x', 'done', 'parent'),
      row('y', 'open', 'parent'),
    ]);

    expect(p.get('parent')).toEqual({ done: 1, total: 2, ratio: 0.5 });
  });

  it("ignores a parent's own status when it has children", () => {
    // Marking a parent done must not claim credit for unfinished children;
    // progress is defined over leaf descendants only.
    const p = computeProgress([
      row('parent', 'done'),
      row('x', 'open', 'parent'),
      row('y', 'open', 'parent'),
    ]);

    expect(p.get('parent')).toEqual({ done: 0, total: 2, ratio: 0 });
  });

  it('excludes a dropped leaf from both numerator and denominator', () => {
    const p = computeProgress([
      row('parent', 'open'),
      row('kept', 'done', 'parent'),
      row('abandoned', 'dropped', 'parent'),
    ]);

    expect(p.get('parent')).toEqual({ done: 1, total: 1, ratio: 1 });
  });

  it('omits dropped rows from the result entirely', () => {
    const p = computeProgress([row('a', 'dropped')]);
    expect(p.has('a')).toBe(false);
  });

  it('reports nothing to measure when every child is dropped', () => {
    // ratio 0 with total 0 rather than 1: nothing here was achieved, so
    // claiming completion would be a lie. The UI decides whether to draw a
    // bar at all, which it can tell from total === 0.
    const p = computeProgress([
      row('parent', 'open'),
      row('a', 'dropped', 'parent'),
      row('b', 'dropped', 'parent'),
    ]);

    expect(p.get('parent')).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('takes a whole dropped branch off the books, including its descendants', () => {
    const p = computeProgress([
      row('root', 'open'),
      row('live', 'done', 'root'),
      row('cancelled', 'dropped', 'root'),
      row('under-cancelled', 'open', 'cancelled'),
    ]);

    expect(p.get('root')).toEqual({ done: 1, total: 1, ratio: 1 });
    expect(p.has('under-cancelled')).toBe(false);
  });

  it('rolls leaf descendants up through several levels', () => {
    const p = computeProgress([
      row('top', 'open'),
      row('mid', 'open', 'top'),
      row('leaf1', 'done', 'mid'),
      row('leaf2', 'open', 'mid'),
      row('leaf3', 'done', 'top'),
    ]);

    expect(p.get('mid')).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(p.get('top')).toEqual({ done: 2, total: 3, ratio: 2 / 3 });
  });

  it('does not recurse forever on a cycle', () => {
    // Matches buildTree: corrupt data must not take the process down.
    const p = computeProgress([row('a', 'open', 'b'), row('b', 'open', 'a')]);
    expect(p.size).toBe(0);
  });
});

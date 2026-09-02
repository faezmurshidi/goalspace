import { describe, expect, it } from 'vitest';

import { buildTree, type TreeRow } from '@/lib/work-items/tree';

/**
 * Minimal row factory. Only the columns `buildTree` actually reads are
 * modelled, so these tests do not quietly depend on the shape of the wider
 * work_items table.
 */
function row(id: string, parent_id: string | null = null, order_index = 0): TreeRow {
  return { id, parent_id, order_index };
}

describe('buildTree', () => {
  it('returns nothing for no rows', () => {
    expect(buildTree([])).toEqual({ roots: [], orphans: [], cyclic: [] });
  });

  it('nests a child under its parent', () => {
    const { roots } = buildTree([row('parent'), row('child', 'parent')]);

    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('parent');
    expect(roots[0].children.map((c) => c.id)).toEqual(['child']);
  });

  it('orders siblings by order_index, not by input order', () => {
    const { roots } = buildTree([
      row('third', null, 2),
      row('first', null, 0),
      row('second', null, 1),
    ]);

    expect(roots.map((r) => r.id)).toEqual(['first', 'second', 'third']);
  });

  it('breaks ties on equal order_index by id, so ordering is stable', () => {
    // order_index is not unique in the schema, and two items dragged in the
    // same session can share one. Without a tiebreak the tree would reorder
    // itself between renders for no user-visible reason.
    const { roots } = buildTree([row('b', null, 0), row('a', null, 0)]);

    expect(roots.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('records depth on each node', () => {
    const { roots } = buildTree([row('a'), row('b', 'a'), row('c', 'b')]);

    expect(roots[0].depth).toBe(0);
    expect(roots[0].children[0].depth).toBe(1);
    expect(roots[0].children[0].children[0].depth).toBe(2);
  });

  it('reports a row whose parent is absent as an orphan, and does not drop it', () => {
    // RLS returns empty rather than erroring, so a partial fetch can hand us a
    // child whose parent was filtered out. Silently discarding it would make
    // work disappear from the tree with no signal.
    const { roots, orphans } = buildTree([row('child', 'missing-parent')]);

    expect(orphans).toEqual(['child']);
    expect(roots.map((r) => r.id)).toEqual(['child']);
  });

  it('reports a parent cycle instead of recursing forever', () => {
    // The action layer rejects cycles on write, so one here means corrupt
    // data. The spec requires surfacing it rather than blowing the stack.
    const { roots, cyclic } = buildTree([row('a', 'b'), row('b', 'a')]);

    expect(cyclic.sort()).toEqual(['a', 'b']);
    expect(roots).toEqual([]);
  });

  it('keeps healthy rows when part of the set is cyclic', () => {
    const { roots, cyclic } = buildTree([row('healthy'), row('a', 'b'), row('b', 'a')]);

    expect(roots.map((r) => r.id)).toEqual(['healthy']);
    expect(cyclic.sort()).toEqual(['a', 'b']);
  });

  it('handles a node that points at itself', () => {
    const { roots, cyclic } = buildTree([row('self', 'self')]);

    expect(cyclic).toEqual(['self']);
    expect(roots).toEqual([]);
  });
});

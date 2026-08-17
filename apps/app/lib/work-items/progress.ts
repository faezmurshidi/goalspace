/**
 * Subtree progress, derived from the tree and never stored.
 *
 * The schema this replaced kept `goals.progress` refreshed by an AFTER UPDATE
 * trigger that averaged child progress, which went silently stale on insert,
 * delete, and cascade. Deriving it in one pure pass over a flat array makes
 * every edge case (empty parents, all-dropped subtrees, deep nesting, corrupt
 * cycles) a unit test rather than a database fixture.
 */

export type WorkItemStatus = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

export interface ProgressRow {
  id: string;
  parent_id: string | null;
  status: WorkItemStatus;
}

export interface Progress {
  done: number;
  total: number;
  /** `done / total`, or 0 when there is nothing to measure. */
  ratio: number;
}

/**
 * Progress for every live row, keyed by id.
 *
 * The rules, all of which are pinned by tests:
 *
 *  - A **leaf** (no children at all in the input) contributes 1 to the
 *    denominator, and 1 to the numerator when `done`.
 *  - A **parent** is the sum over its live descendants. Its own status is
 *    ignored, so marking a parent done cannot claim credit for children that
 *    are not.
 *  - **Dropped** rows are excluded from both sides, and so is everything
 *    beneath them: abandoning a branch takes the whole branch off the books.
 *  - A parent whose children are all dropped reports `total: 0`, not a
 *    completed 1/1. Nothing there was achieved, and the caller can tell the
 *    difference from `total === 0` and decline to draw a bar.
 */
export function computeProgress(rows: readonly ProgressRow[]): Map<string, Progress> {
  const byId = new Map<string, ProgressRow>();
  for (const r of rows) byId.set(r.id, r);

  const childrenOf = new Map<string, ProgressRow[]>();
  for (const r of rows) {
    if (r.parent_id === null) continue;
    const bucket = childrenOf.get(r.parent_id);
    if (bucket) bucket.push(r);
    else childrenOf.set(r.parent_id, [r]);
  }

  // Roots include rows whose parent was filtered out by RLS, matching how
  // buildTree treats an orphan, so the two never disagree about what exists.
  const roots = rows.filter((r) => r.parent_id === null || !byId.has(r.parent_id));

  // Breadth-first from the roots, refusing to descend into a dropped row.
  // Anything a root cannot reach is off the books by construction: a dropped
  // branch, or a `parent_id` cycle, which is unreachable and therefore never
  // recursed into.
  const order: ProgressRow[] = [];
  const live = new Set<string>();
  const queue = roots.filter((r) => r.status !== 'dropped');
  for (const r of queue) live.add(r.id);

  for (let i = 0; i < queue.length; i += 1) {
    const node = queue[i];
    order.push(node);
    for (const child of childrenOf.get(node.id) ?? []) {
      if (child.status === 'dropped' || live.has(child.id)) continue;
      live.add(child.id);
      queue.push(child);
    }
  }

  // Breadth-first order puts every parent before its children, so walking it
  // backwards guarantees a node's children are already accumulated.
  const result = new Map<string, Progress>();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const node = order[i];
    const structuralChildren = childrenOf.get(node.id) ?? [];

    if (structuralChildren.length === 0) {
      const done = node.status === 'done' ? 1 : 0;
      result.set(node.id, { done, total: 1, ratio: done });
      continue;
    }

    let done = 0;
    let total = 0;
    for (const child of structuralChildren) {
      const childProgress = result.get(child.id);
      if (!childProgress) continue; // dropped, or otherwise off the books
      done += childProgress.done;
      total += childProgress.total;
    }

    result.set(node.id, { done, total, ratio: total === 0 ? 0 : done / total });
  }

  return result;
}

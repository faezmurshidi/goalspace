/**
 * Flat work_items rows into a nested tree.
 *
 * Pure: no database, no clock, no framework. Every awkward case the real data
 * can produce (a parent filtered out by RLS, a cycle written before the action
 * layer's guard existed) is a unit test rather than a database fixture.
 */

/** The only columns the tree cares about. */
export interface TreeRow {
  id: string;
  parent_id: string | null;
  order_index: number;
}

export type TreeNode<R extends TreeRow = TreeRow> = R & {
  depth: number;
  children: TreeNode<R>[];
};

export interface TreeResult<R extends TreeRow = TreeRow> {
  roots: TreeNode<R>[];
  /**
   * Rows whose `parent_id` points at something not in the input. Reported
   * rather than dropped: RLS returns empty instead of erroring, so a partial
   * fetch can hand us a child without its parent, and silently discarding it
   * would make work vanish from the tree with no signal. They are attached at
   * the root so they stay reachable.
   */
  orphans: string[];
  /**
   * Rows on a `parent_id` cycle, plus anything descending from one. The action
   * layer walks ancestors before writing, so a cycle here means corrupt data;
   * the spec calls for surfacing it instead of recursing.
   */
  cyclic: string[];
}

type Verdict = 'ok' | 'cyclic';

export function buildTree<R extends TreeRow>(rows: readonly R[]): TreeResult<R> {
  const byId = new Map<string, R>();
  for (const r of rows) byId.set(r.id, r);

  const verdicts = new Map<string, Verdict>();
  const orphans: string[] = [];

  // Walk each row's ancestor chain once, memoising the result, so the whole
  // classification is linear rather than quadratic on deep trees.
  for (const start of rows) {
    if (verdicts.has(start.id)) continue;

    const path: string[] = [];
    const onPath = new Set<string>();
    let cursor: R | undefined = start;
    let verdict: Verdict = 'ok';

    while (cursor) {
      if (onPath.has(cursor.id)) {
        verdict = 'cyclic';
        break;
      }

      const settled = verdicts.get(cursor.id);
      if (settled) {
        verdict = settled;
        break;
      }

      path.push(cursor.id);
      onPath.add(cursor.id);

      const parentId: string | null = cursor.parent_id;
      if (parentId === null) break;

      const parent = byId.get(parentId);
      if (!parent) {
        orphans.push(cursor.id);
        break;
      }
      cursor = parent;
    }

    for (const id of path) verdicts.set(id, verdict);
  }

  const cyclic = [...verdicts.entries()].filter(([, v]) => v === 'cyclic').map(([id]) => id);

  // Siblings sort on order_index, then id. order_index is not unique in the
  // schema, and two items reordered in one session can share a value; without
  // the tiebreak the tree would shuffle between renders for no reason a user
  // could see.
  const sortSiblings = (a: TreeNode<R>, b: TreeNode<R>) =>
    a.order_index - b.order_index || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const nodes = new Map<string, TreeNode<R>>();
  for (const r of rows) {
    if (verdicts.get(r.id) === 'cyclic') continue;
    nodes.set(r.id, { ...r, depth: 0, children: [] } as TreeNode<R>);
  }

  const roots: TreeNode<R>[] = [];
  for (const node of nodes.values()) {
    const parentId = node.parent_id;
    const parent = parentId === null ? undefined : nodes.get(parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  roots.sort(sortSiblings);
  // Depth is assigned on the way down rather than stored, so it cannot drift
  // out of step with the structure. Iterative to stay safe on deep trees.
  const stack: TreeNode<R>[] = [...roots];
  while (stack.length) {
    const node = stack.pop()!;
    node.children.sort(sortSiblings);
    for (const child of node.children) {
      child.depth = node.depth + 1;
      stack.push(child);
    }
  }

  return { roots, orphans, cyclic };
}

/** Depth-first flatten, in the same order the tree renders. */
export function flattenTree<R extends TreeRow>(roots: readonly TreeNode<R>[]): TreeNode<R>[] {
  const out: TreeNode<R>[] = [];
  const walk = (nodes: readonly TreeNode<R>[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

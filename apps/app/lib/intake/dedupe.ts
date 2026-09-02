export interface DedupableItem {
  id: string;
  title: string;
}

/**
 * Drop proposals the Planner made twice.
 *
 * Observed on the first live run: the same task was proposed twice with an
 * identical rationale. Asking the model not to repeat itself is prompt
 * instruction, which this codebase does not treat as a control — so the
 * duplicate is removed here instead.
 *
 * Returns the dropped ids as well as the kept items, because a proposal the
 * owner never sees must still be settled. Left `pending` it would surface
 * later in an inbox they never opened, as though it were awaiting a decision
 * they were never offered.
 *
 * Compared on the normalised title only. Two items with the same title are the
 * same item to a reader, whatever their rationales say.
 */
export function dedupeProposedItems<T extends DedupableItem>(
  items: T[]
): { kept: T[]; dropped: string[] } {
  const seen = new Set<string>();
  const kept: T[] = [];
  const dropped: string[] = [];

  for (const item of items) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) {
      dropped.push(item.id);
      continue;
    }
    seen.add(key);
    kept.push(item);
  }

  return { kept, dropped };
}

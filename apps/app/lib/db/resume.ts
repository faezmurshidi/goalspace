import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { buildTree, type TreeNode } from '@/lib/work-items/tree';
import { computeProgress, type Progress } from '@/lib/work-items/progress';
import { describeAbsence, wokenItems, type Absence, type WokenItem } from '@/lib/work-items/reentry';
import { getLatestEntryAt, listEntries, type Entry } from './entries';
import { getLatestStatusChangeAt, listWorkItems, type WorkItem } from './work-items';
import { countPendingProposals } from './proposals';
import type { Project } from './projects';

type Client = SupabaseClient<Database>;

export interface ResumeData {
  project: Project;
  /** Null when the project has never been touched, which is the first-run case. */
  absence: Absence | null;
  lastActivityAt: string | null;
  /** Blocked items whose wake date has passed, longest overdue first. */
  waiting: WokenItem<WorkItem>[];
  /** Open and in-progress items, questions first. */
  open: WorkItem[];
  recentEntries: Entry[];
  recentDecisions: Entry[];
  tree: TreeNode<WorkItem>[];
  progress: Map<string, Progress>;
  /** Whole-project progress, summed across every root. */
  overall: Progress;
  /** Set when the fetched tree is structurally corrupt. Surfaced, not hidden. */
  anomalies: { orphans: string[]; cyclic: string[] };
  /**
   * Proposals awaiting a decision. An open loop like any other, and the one
   * phase 2b created and left off this surface.
   */
  undecidedProposals: number;
}

/**
 * Everything the resume view needs, in one call.
 *
 * `now` is a parameter rather than a call to `new Date()` inside, so the
 * caller can pin it and the whole screen renders against a single instant.
 * Reading the clock separately per section would let a row be "0 days overdue"
 * in one region and "1 day" in another on the same paint.
 */
export async function getResumeData(
  supabase: Client,
  project: Project,
  now: Date = new Date()
): Promise<ResumeData> {
  // Independent reads, so they overlap rather than queue. The two "latest"
  // probes are separate one-row queries rather than being derived from the
  // lists above, because the lists are capped and the newest row is not
  // guaranteed to be inside the cap once filters are applied.
  const [workItems, recentEntries, recentDecisions, latestEntryAt, latestStatusAt, undecidedProposals] =
    await Promise.all([
      listWorkItems(supabase, project.id),
      listEntries(supabase, project.id, { limit: 8 }),
      listEntries(supabase, project.id, { kinds: ['decision'], limit: 5 }),
      getLatestEntryAt(supabase, project.id),
      getLatestStatusChangeAt(supabase, project.id),
      countPendingProposals(supabase, project.id),
    ]);

  const { roots, orphans, cyclic } = buildTree(workItems);
  const progress = computeProgress(workItems);

  // Whole-project progress sums the roots rather than averaging their ratios:
  // averaging would let a root holding one task outweigh a root holding forty.
  const overall = roots.reduce<Progress>(
    (acc, root) => {
      const p = progress.get(root.id);
      if (!p) return acc;
      const done = acc.done + p.done;
      const total = acc.total + p.total;
      return { done, total, ratio: total === 0 ? 0 : done / total };
    },
    { done: 0, total: 0, ratio: 0 }
  );

  const waiting = wokenItems(workItems, now);

  // Blocked items already appear under "waiting" when their date has passed,
  // and repeating them here would make the screen argue with itself.
  const waitingIds = new Set(waiting.map((w) => w.id));
  const open = workItems
    .filter((item) => !waitingIds.has(item.id))
    .filter((item) => item.status === 'open' || item.status === 'doing')
    .sort((a, b) => {
      // Questions first: an unanswered question blocks more than a task.
      if (a.kind !== b.kind) return a.kind === 'question' ? -1 : 1;
      // Then work already in progress, since resuming beats starting.
      if (a.status !== b.status) return a.status === 'doing' ? -1 : 1;
      return a.order_index - b.order_index || (a.id < b.id ? -1 : 1);
    });

  // The later of the two: recording a note and moving an item to blocked are
  // both evidence the project was touched.
  //
  // Compared as parsed instants, not as strings. PostgREST renders timestamptz
  // with an explicit offset ("+00:00"), and a lexicographic comparison across
  // two different offsets silently returns the wrong one, which would put the
  // absence figure, the single loudest number on the screen, out by hours.
  const lastActivityAt = [latestEntryAt, latestStatusAt]
    .filter((value): value is string => value !== null)
    .reduce<string | null>((latest, value) => {
      if (latest === null) return value;
      return Date.parse(value) > Date.parse(latest) ? value : latest;
    }, null);

  return {
    project,
    absence: describeAbsence(lastActivityAt ? new Date(lastActivityAt) : null, now),
    lastActivityAt,
    waiting,
    open,
    recentEntries,
    recentDecisions,
    tree: roots,
    progress,
    overall,
    anomalies: { orphans, cyclic },
    undecidedProposals,
  };
}

/**
 * Orientation, not retrieval.
 *
 * The reflex design is to embed everything and stuff the top-k into context.
 * That is the wrong shape for a single project, which is small: hundreds of
 * entries, dozens of work items. What an agent actually lacks is a map — the
 * shape of the work and the decisions already taken — so it can decide what
 * to pull. Detail arrives through tools, iteratively.
 *
 * This matters most for the question the phase exists to answer: "why did I
 * abandon that approach?" You cannot phrase that query well, so a single
 * similarity search over your bad phrasing fails. An agent that can read the
 * decision list, spot the candidate, and pull its neighbours succeeds.
 */

export type WorkItemStatus = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

export interface SkeletonProject {
  title: string;
  kind: string;
  brief: string | null;
}

export interface SkeletonWorkItem {
  id: string;
  parent_id: string | null;
  title: string;
  status: WorkItemStatus;
  kind: 'task' | 'question';
}

export interface SkeletonEntry {
  id: string;
  title: string | null;
  occurred_at: string;
}

export interface SkeletonInput {
  project: SkeletonProject;
  workItems: SkeletonWorkItem[];
  decisions: SkeletonEntry[];
}

export interface SkeletonOptions {
  /** Stated budget. Truncation is by recency and is always announced. */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 12_000;

function renderTree(items: SkeletonWorkItem[]): string[] {
  const byParent = new Map<string | null, SkeletonWorkItem[]>();
  for (const item of items) {
    const siblings = byParent.get(item.parent_id) ?? [];
    siblings.push(item);
    byParent.set(item.parent_id, siblings);
  }

  const lines: string[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const item of byParent.get(parent) ?? []) {
      lines.push(`${'  '.repeat(depth)}- [${item.status}] ${item.title}`);
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return lines;
}

export function buildSkeleton(input: SkeletonInput, options: SkeletonOptions = {}): string {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const live = input.workItems.filter((w) => w.status !== 'dropped');
  const tasks = live.filter((w) => w.kind === 'task');
  const questions = live.filter((w) => w.kind === 'question' && w.status !== 'done');

  const decisions = [...input.decisions].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const sections: string[] = [
    `# ${input.project.title} (${input.project.kind})`,
    input.project.brief ? `\n${input.project.brief}` : '',
    `\n## Work items\n${renderTree(tasks).join('\n') || '(none)'}`,
    `\n## Open questions\n${questions.map((q) => `- ${q.title}`).join('\n') || '(none)'}`,
    `\n## Decisions on record\n${decisions.map((d) => `- ${d.title ?? '(untitled)'}`).join('\n') || '(none)'}`,
  ];

  const full = sections.filter(Boolean).join('\n');
  if (full.length <= maxChars) return full;

  const notice = '\n\n[skeleton truncated by recency — use the tools to pull older detail]';
  return `${full.slice(0, Math.max(0, maxChars - notice.length))}${notice}`;
}

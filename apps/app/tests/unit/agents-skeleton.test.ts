import { describe, expect, it } from 'vitest';

import { buildSkeleton, type SkeletonInput } from '@/lib/agents/skeleton';

const base: SkeletonInput = {
  project: { title: 'Custom EV bike', kind: 'build', brief: 'A commuter build.' },
  workItems: [
    { id: 'w1', parent_id: null, title: 'Battery pack', status: 'doing', kind: 'task' },
    { id: 'w2', parent_id: 'w1', title: 'Cell selection', status: 'done', kind: 'task' },
    { id: 'w3', parent_id: null, title: 'Which BMS?', status: 'open', kind: 'question' },
  ],
  decisions: [{ id: 'e1', title: '18650 over 21700', occurred_at: '2026-03-02T10:00:00Z' }],
};

describe('buildSkeleton', () => {
  it('names the project and its kind', () => {
    const s = buildSkeleton(base);
    expect(s).toContain('Custom EV bike');
    expect(s).toContain('build');
  });

  it('nests work items under their parent with status', () => {
    const s = buildSkeleton(base);
    expect(s).toMatch(/- \[doing\] Battery pack/);
    expect(s).toMatch(/ {2}- \[done\] Cell selection/);
  });

  it('lists open questions separately from tasks', () => {
    const s = buildSkeleton(base);
    const questions = s.slice(s.indexOf('Open questions'));
    expect(questions).toContain('Which BMS?');
  });

  it('lists decision titles so the agent can spot a candidate to pull', () => {
    expect(buildSkeleton(base)).toContain('18650 over 21700');
  });

  it('omits dropped work items', () => {
    const s = buildSkeleton({
      ...base,
      workItems: [
        { id: 'w9', parent_id: null, title: 'Abandoned idea', status: 'dropped', kind: 'task' },
      ],
    });
    expect(s).not.toContain('Abandoned idea');
  });

  it('truncates by recency and says so, rather than silently dropping context', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: `e${i}`,
      title: `Decision number ${i}`,
      occurred_at: `2026-01-01T00:00:0${i % 10}Z`,
    }));
    const s = buildSkeleton({ ...base, decisions: many }, { maxChars: 800 });
    expect(s.length).toBeLessThanOrEqual(800);
    expect(s).toContain('truncated');
  });

  it('handles an empty project without throwing', () => {
    const s = buildSkeleton({
      project: { title: 'Empty', kind: 'learn', brief: null },
      workItems: [],
      decisions: [],
    });
    expect(s).toContain('Empty');
  });
});

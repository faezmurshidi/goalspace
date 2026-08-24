import { describe, expect, it } from 'vitest';

import { groupCitations, resolveCitations } from '@/lib/proposals/citations';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('groupCitations', () => {
  it('groups ids by the table they must be found in', () => {
    const grouped = groupCitations([
      { type: 'entry', id: A },
      { type: 'entry', id: B },
      { type: 'document', id: A },
    ]);
    expect(grouped.entries).toEqual([A, B]);
    expect(grouped.documents).toEqual([A]);
    expect(grouped.work_items).toEqual([]);
  });

  it('de-duplicates repeated ids', () => {
    // A model citing the same entry three times must not cost three lookups.
    const grouped = groupCitations([
      { type: 'entry', id: A },
      { type: 'entry', id: A },
    ]);
    expect(grouped.entries).toEqual([A]);
  });
});

describe('resolveCitations', () => {
  const stub = (present: Record<string, string[]>) => ({
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: ids.filter((id) => (present[table] ?? []).includes(id)).map((id) => ({ id })),
              error: null,
            }),
          }),
        }),
      };
    },
  });

  it('passes when every cited id exists in the project', async () => {
    const result = await resolveCitations(
      stub({ entries: [A] }) as never,
      'project-1',
      [{ type: 'entry', id: A }]
    );
    expect(result.ok).toBe(true);
  });

  it('fails and names the ids that did not resolve', async () => {
    // A model that invents a citation must get an error it can act on, not a
    // stored proposal that cites nothing. Fabricated provenance is worse than
    // none, because it is trusted.
    const result = await resolveCitations(
      stub({ entries: [A] }) as never,
      'project-1',
      [{ type: 'entry', id: A }, { type: 'entry', id: B }]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual([{ type: 'entry', id: B }]);
  });

  it('passes trivially on an empty citation list', async () => {
    // Not every proposal draws on something specific. An empty list is honest;
    // a fabricated one is not.
    const result = await resolveCitations(stub({}) as never, 'project-1', []);
    expect(result.ok).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';

/** Minimal query-builder stub: records what was asked for, returns fixed rows. */
function stubSupabase(rows: unknown[]) {
  const calls: Array<{ table?: string; rpc?: string; filters: Record<string, unknown> }> = [];
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    order: chain,
    limit: chain,
    in: (col: string, val: unknown) => {
      calls.at(-1)!.filters[col] = val;
      return builder;
    },
    eq: (col: string, val: unknown) => {
      calls.at(-1)!.filters[col] = val;
      return builder;
    },
    then: (resolve: (r: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  });
  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push({ table, filters: {} });
        return builder;
      },
      rpc: (rpc: string, args: Record<string, unknown>) => {
        calls.push({ rpc, filters: args });
        return Promise.resolve({ data: rows, error: null });
      },
    } as never,
  };
}

const ctx = (client: never): ToolContext => ({ supabase: client, projectId: 'proj-1' });

describe('handlers are project-scoped by context', () => {
  it('search_repo passes the context project id, not one from args', async () => {
    const s = stubSupabase([{ source_type: 'entry', source_id: 'e1' }]);
    await HANDLERS.search_repo(ctx(s.client), { query: 'battery', limit: 20 } as never);
    expect(s.calls[0].rpc).toBe('search_repo');
    expect(s.calls[0].filters.p_project_id).toBe('proj-1');
  });

  it('list_entries filters by the context project id', async () => {
    const s = stubSupabase([]);
    await HANDLERS.list_entries(ctx(s.client), { limit: 50 } as never);
    expect(s.calls[0].filters.project_id).toBe('proj-1');
  });

  it('ignores a project_id smuggled into args', async () => {
    const s = stubSupabase([]);
    await HANDLERS.list_entries(ctx(s.client), { limit: 50, project_id: 'someone-else' } as never);
    expect(s.calls[0].filters.project_id).toBe('proj-1');
  });

  it('read_document scopes by project as well as id', async () => {
    const s = stubSupabase([]);
    await HANDLERS.read_document(ctx(s.client), { id: 'doc-1' } as never);
    expect(s.calls[0].filters.project_id).toBe('proj-1');
    expect(s.calls[0].filters.id).toBe('doc-1');
  });
});

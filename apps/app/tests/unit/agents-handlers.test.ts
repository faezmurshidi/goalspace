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

// The provenance fields exist for the propose_* handlers; the read handlers
// under test here ignore them, but the context is one shape for both groups.
const ctx = (client: never): ToolContext => ({
  supabase: client,
  projectId: 'proj-1',
  ownerId: 'owner-1',
  agentId: 'agent-1',
  runId: 'run-1',
  documentVersions: new Map<string, string>(),
});

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

  it('read_entry scopes by project as well as id', async () => {
    // Same rule as read_document: the model chooses what to ask for, never
    // whose. RLS would refuse another project's row anyway; scoping here means
    // a confused model gets nothing back instead of an error.
    const s = stubSupabase([]);
    await HANDLERS.read_entry(ctx(s.client), { id: 'entry-1' } as never);
    expect(s.calls[0].table).toBe('entries');
    expect(s.calls[0].filters.project_id).toBe('proj-1');
    expect(s.calls[0].filters.id).toBe('entry-1');
  });

  it('refuses a work_item_id that does not exist rather than returning nothing', async () => {
    // The silent zero this closes: filtering on a work item that is not there
    // is a legal query with an empty result, so a model that guessed the id
    // reads "0 rows" as "the record is empty" and proposes from nothing.
    // Observed three times before it was diagnosed — the intake Planner, and
    // again through delegation.
    //
    // Its own stub rather than the shared one, because that one answers every
    // maybeSingle with a row — which is exactly the lookup under test.
    const absent = {
      from: () => ({
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        }),
      }),
    } as never;

    await expect(
      HANDLERS.list_entries(ctx(absent), { work_item_id: 'made-up', limit: 50 } as never)
    ).rejects.toThrow(/No work item/);
  });
});

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

  it('drops a work_item_id that does not exist and returns the whole log', async () => {
    // Three behaviours have been tried here and only this one survives contact
    // with a model.
    //
    // Returning the empty result is a legal query with a silent zero: a model
    // that guessed the id reads it as "the record is empty" and proposes from
    // nothing. Observed three times.
    //
    // Throwing fixed that and introduced a worse failure, which only appeared
    // live: with no entries to work from, the model guesses again. Twice
    // observed, twelve rejected calls each — and on the second run the refusal
    // named the real ids and stated outright that the project had none, and it
    // guessed twelve more times.
    //
    // So the call succeeds, the filter is dropped, and the note says so. The
    // model gets something to work from, and the result cannot be mistaken for
    // a filtered one.
    const result = (await HANDLERS.list_entries(
      absentWorkItem([{ id: 'e-1', body: 'The tailstock lifts 4 thou.' }]),
      { work_item_id: 'made-up', limit: 50 } as never
    )) as { note: string; entries: unknown[] };

    expect(result.entries).toHaveLength(1);
    expect(result.note).toContain('made-up');
    expect(result.note).toMatch(/ignored/i);
  });

  it('does not apply the invented filter to the query', async () => {
    // The note would be a lie if the filter were still applied — the model
    // would be told it has the whole log while holding a filtered subset, which
    // is the silent zero wearing a different hat.
    const ctxWithLog = absentWorkItem([{ id: 'e-1' }, { id: 'e-2' }]);
    const result = (await HANDLERS.list_entries(ctxWithLog, {
      work_item_id: 'made-up',
      limit: 50,
    } as never)) as { entries: unknown[] };

    expect(result.entries).toHaveLength(2);
    expect(ctxWithLog.appliedFilters).not.toContain('work_item_id');
  });

  it('returns a plain array when nothing was dropped', async () => {
    // The shape changes only in the anomalous case. A caller reading a normal
    // result must not have to unwrap it.
    const s = stubSupabase([{ id: 'e-1' }]);
    const result = await HANDLERS.list_entries(ctx(s.client), { limit: 50 } as never);
    expect(Array.isArray(result)).toBe(true);
  });
});

/**
 * A client whose work-item lookup finds nothing, and whose entries query
 * returns `entries`. `appliedFilters` records which columns the entries query
 * was actually filtered on, so a test can prove the invented filter was
 * dropped rather than merely that the note claims it was.
 */
function absentWorkItem(entries: Record<string, unknown>[]) {
  const appliedFilters: string[] = [];

  const entriesQuery: Record<string, unknown> = {
    eq: (column: string) => {
      appliedFilters.push(column);
      return entriesQuery;
    },
    in: () => entriesQuery,
    order: () => entriesQuery,
    limit: () => entriesQuery,
    then: (resolve: (v: unknown) => unknown) => resolve({ data: entries, error: null }),
  };

  const client = {
    from: (table: string) => {
      if (table === 'work_items') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
          }),
        };
      }
      return { select: () => entriesQuery };
    },
  } as never;

  return Object.assign(ctx(client), { appliedFilters });
}

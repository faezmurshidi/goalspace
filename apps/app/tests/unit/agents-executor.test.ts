import { describe, expect, it, vi } from 'vitest';

import { dispatchToolCall, type RunContext } from '@/lib/agents/executor';
import type { HANDLERS } from '@/lib/agents/tools/handlers';

/** Captures every agent_tool_calls insert without a database. */
function recordingSupabase() {
  const inserted: Record<string, unknown>[] = [];
  return {
    inserted,
    client: {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          if (table === 'agent_tool_calls') inserted.push(row);
          return Promise.resolve({ error: null });
        },
      }),
    } as never,
  };
}

function context(allowlist: readonly string[], client: never): RunContext {
  return {
    supabase: client,
    projectId: 'proj-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
    documentVersions: new Map<string, string>(),
    allowlist,
  };
}

const asHandlers = (h: Record<string, unknown>) => h as unknown as typeof HANDLERS;

describe('dispatchToolCall — allowlist enforcement', () => {
  it('runs a handler that is both in the registry and allowlisted', async () => {
    const s = recordingSupabase();
    const searchRepo = vi.fn().mockResolvedValue([{ source_id: 'e1' }]);
    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client),
      'search_repo',
      { query: 'battery' },
      asHandlers({ search_repo: searchRepo })
    );
    expect(outcome).toEqual({ ok: true, result: [{ source_id: 'e1' }] });
    expect(searchRepo).toHaveBeenCalledOnce();
  });

  it('NEVER reaches the handler for a tool outside the allowlist', async () => {
    // The core property. A repo-read agent that emits read_document while its
    // allowlist holds only search_repo must not read the document.
    const s = recordingSupabase();
    const readDocument = vi.fn();
    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client),
      'read_document',
      { id: 'doc-1' },
      asHandlers({ search_repo: vi.fn(), read_document: readDocument })
    );
    expect(readDocument).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });

  it('rejects a tool that is not in the registry at all', async () => {
    // web_search does not exist in phase 2a. A model that emits it gets an
    // error result, not an execution.
    const s = recordingSupabase();
    const outcome = await dispatchToolCall(
      context(['search_repo', 'web_search'], s.client),
      'web_search',
      { q: 'x' },
      asHandlers({})
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toMatch(/not available/i);
  });

  it('records a rejected call as a failed tool call', async () => {
    const s = recordingSupabase();
    await dispatchToolCall(
      context(['search_repo'], s.client),
      'read_document',
      { id: 'doc-1' },
      asHandlers({})
    );
    expect(s.inserted).toHaveLength(1);
    expect(s.inserted[0]).toMatchObject({
      run_id: 'run-1',
      project_id: 'proj-1',
      owner_id: 'owner-1',
      tool: 'read_document',
      ok: false,
    });
  });

  it('records the arguments of a rejected call, so the trace shows what was attempted', async () => {
    const s = recordingSupabase();
    await dispatchToolCall(
      context(['search_repo'], s.client),
      'read_document',
      { id: 'doc-42' },
      asHandlers({})
    );
    expect(s.inserted[0].args).toEqual({ id: 'doc-42' });
  });

  it('records a successful call as ok', async () => {
    const s = recordingSupabase();
    await dispatchToolCall(
      context(['search_repo'], s.client),
      'search_repo',
      { query: 'x' },
      asHandlers({ search_repo: vi.fn().mockResolvedValue([]) })
    );
    expect(s.inserted[0]).toMatchObject({ tool: 'search_repo', ok: true });
  });

  it('returns a handler failure to the model as an error result rather than aborting', async () => {
    const s = recordingSupabase();
    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client),
      'search_repo',
      { query: 'x' },
      asHandlers({ search_repo: vi.fn().mockRejectedValue(new Error('boom')) })
    );
    expect(outcome).toEqual({ ok: false, error: 'boom' });
    expect(s.inserted[0]).toMatchObject({ ok: false });
  });

  it('rejects an allowlist entry that is not a registry tool even if the handler exists', async () => {
    // Defence in depth: a handler must not be reachable purely because
    // someone typed its name into agent.tools.
    const s = recordingSupabase();
    const ghost = vi.fn();
    const outcome = await dispatchToolCall(
      context(['ghost_tool'], s.client),
      'ghost_tool',
      {},
      asHandlers({ ghost_tool: ghost })
    );
    expect(ghost).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });
});

describe('dispatchToolCall passes the whole context through', () => {
  // The regression that shipped: the ToolContext is built field by field, and
  // `delegate` and `conversationId` were added to RunContext without being
  // added here. Both arrived as undefined, so ask_agent and record_entry threw
  // on their first live run — after a paid model call had already been made.
  //
  // Asserted through dispatchToolCall rather than by calling a handler
  // directly, because calling directly is what hid it: the handler tests build
  // their own context and never exercise the projection.
  it('carries every ToolContext field a handler may need', async () => {
    let seen: Record<string, unknown> | null = null;

    const ctx = {
      supabase: null as never,
      projectId: 'proj-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      runId: 'run-1',
      allowlist: ['search_repo'],
      documentVersions: new Map<string, string>(),
      delegate: async () => ({ ok: true as const, text: 'delegated' }),
      conversationId: 'conv-1',
    };
    // recordToolCall writes through ctx.supabase, which is null here; the
    // assertion is on what the handler received, so a failed write is fine.
    ctx.supabase = { from: () => ({ insert: async () => ({}) }) } as never;

    await dispatchToolCall(ctx, 'search_repo', { query: 'x' }, {
      async search_repo(received: Record<string, unknown>) {
        seen = received;
        return [];
      },
    } as never);

    expect(seen).not.toBeNull();
    expect(seen!.conversationId).toBe('conv-1');
    expect(typeof seen!.delegate).toBe('function');
    expect(seen!.documentVersions).toBe(ctx.documentVersions);
  });
});

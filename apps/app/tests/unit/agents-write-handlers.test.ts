import { describe, expect, it } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, REPO_READ, WRITE_TOOLS } from '@/lib/agents/tools/registry';

const UUID = '11111111-1111-4111-8111-111111111111';

function contextWith(
  inserted: unknown[],
  citable: string[] = [],
  currentUpdatedAt = '2026-08-21T09:00:00.000Z'
): ToolContext {
  return {
    supabase: {
      from(table: string) {
        if (table === 'proposals') {
          return {
            insert: (row: unknown) => {
              inserted.push(row);
              return {
                select: () => ({ single: async () => ({ data: { id: UUID }, error: null }) }),
              };
            },
          };
        }
        const row = { id: UUID, title: 'Doc', body: 'Body', updated_at: currentUpdatedAt };
        // read_document awaits the builder itself after two .eq() calls, so the
        // terminal object has to be thenable as well as offering maybeSingle.
        const terminal = {
          maybeSingle: async () => ({ data: row, error: null }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: [row], error: null }),
        };
        return {
          select: () => ({
            eq: () => ({
              in: async (_c: string, ids: string[]) => ({
                data: ids.filter((id) => citable.includes(id)).map((id) => ({ id })),
                error: null,
              }),
              eq: () => terminal,
            }),
          }),
        };
      },
    } as never,
    projectId: 'project-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
    documentVersions: new Map<string, string>(),
  };
}

describe('write tools in the registry', () => {
  it('marks every proposal tool as proposing and not external', () => {
    // 'proposes' exactly, not merely truthy. record_entry also writes, and
    // WRITE_TOOLS is the proposal group — the distinction the union exists to
    // make, and the one the agents page states to the owner.
    for (const name of WRITE_TOOLS) {
      expect(REGISTRY[name].writes).toBe('proposes');
      expect(REGISTRY[name].external).toBe(false);
    }
  });

  it('keeps repo-read free of every write tool', () => {
    // An agent described as reading only must stay that way. The Critic is
    // defined against REPO_READ, so a write tool leaking in here would hand it
    // the ability to change the record.
    for (const name of WRITE_TOOLS) {
      expect(REPO_READ as readonly string[]).not.toContain(name);
    }
  });
});

describe('propose_entry', () => {
  it('writes a proposal, never an entry', async () => {
    const inserted: unknown[] = [];
    const result = await HANDLERS.propose_entry(contextWith(inserted), {
      payload: { kind: 'note', body: 'The servo arrived damaged.' },
      rationale: 'The session entry mentions it but nothing records the outcome.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
    const row = inserted[0] as Record<string, unknown>;
    expect(row.kind).toBe('entry');
    expect(row.status).toBeUndefined(); // the column default is 'pending'
    expect(row.owner_id).toBe('owner-1');
    expect(row.agent_id).toBe('agent-1');
    expect(row.run_id).toBe('run-1');
    expect(result).toMatchObject({ proposal_id: UUID });
  });

  it('carries occurred_at through, so a run can propose a backdated entry', async () => {
    // The tool schema omitted this at first, which silently made every proposed
    // entry land on the day it was proposed. The log orders by occurred_at, so
    // a session written up on Monday belongs on the Saturday it happened.
    const inserted: unknown[] = [];
    await HANDLERS.propose_entry(contextWith(inserted), {
      payload: {
        kind: 'session',
        body: 'Rewound the motor.',
        occurred_at: '2026-08-16T10:00:00.000Z',
      },
      rationale: 'The work happened on Saturday.',
      citations: [],
    } as never);

    const row = inserted[0] as { payload: { occurred_at?: string } };
    expect(row.payload.occurred_at).toBe('2026-08-16T10:00:00.000Z');
  });

  it('rejects a payload the capture form would reject', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_entry(contextWith(inserted), {
        payload: { kind: 'rambling', body: 'x' },
        rationale: 'because',
        citations: [],
      } as never)
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it('rejects a citation that does not resolve, storing nothing', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_entry(contextWith(inserted, []), {
        payload: { kind: 'note', body: 'Something' },
        rationale: 'because',
        citations: [{ type: 'entry', id: UUID }],
      } as never)
    ).rejects.toThrow(/citation/i);
    expect(inserted).toHaveLength(0);
  });
});

describe('propose_document_edit', () => {
  it('refuses to propose an edit to a document this run has not read', async () => {
    // An edit has to be written against a version the agent actually saw.
    // Without a read there is no such version, and inventing one is what the
    // whole staleness mechanism exists to prevent.
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_document_edit(contextWith(inserted, [UUID]), {
        payload: { id: UUID, body: 'Rewritten' },
        rationale: 'Tightens the summary.',
        citations: [],
      } as never)
    ).rejects.toThrow(/read_document/);
    expect(inserted).toHaveLength(0);
  });

  it('stamps the version read_document returned, not the version now', async () => {
    // The race this closes: the agent reads version X, the owner saves version
    // Y, then the agent proposes. Stamping Y would make the edit — written
    // against X — look current, and accepting it would silently overwrite the
    // owner's work instead of superseding.
    const inserted: unknown[] = [];
    const ctx = contextWith(inserted, [UUID], '2026-08-21T00:00:00.000Z');

    await HANDLERS.read_document(ctx, { id: UUID } as never);

    // The owner saves while the agent is still composing. Same `inserted`
    // array, so the proposal still lands where the assertions look for it.
    ctx.supabase = contextWith(inserted, [UUID], '2026-08-21T09:00:00.000Z').supabase;

    await HANDLERS.propose_document_edit(ctx, {
      payload: { id: UUID, body: 'Rewritten' },
      rationale: 'Tightens the summary.',
      citations: [{ type: 'document', id: UUID }],
    } as never);

    const row = inserted[0] as { payload: { base_updated_at: string }; target_id: string };
    expect(row.payload.base_updated_at).toBe('2026-08-21T00:00:00.000Z');
    expect(row.target_id).toBe(UUID);
  });
});

describe('propose_document', () => {
  it('stores a proposal, never a document, with no target', async () => {
    const inserted: unknown[] = [];
    const result = await HANDLERS.propose_document(contextWith(inserted), {
      payload: { title: 'Harmonic constituents', body: 'Five, for the Solent.' },
      rationale: 'The decision is spread across four entries and nowhere summarised.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
    const row = inserted[0] as Record<string, unknown>;
    expect(row.kind).toBe('document');
    // target_id names the document being edited. There is not one yet.
    expect(row.target_id).toBeNull();
    expect(row.owner_id).toBe('owner-1');
    expect(row.agent_id).toBe('agent-1');
    expect(row.run_id).toBe('run-1');
    expect(result).toMatchObject({ proposal_id: UUID });
  });

  it('rejects a payload the create form would reject, storing nothing', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_document(contextWith(inserted), {
        payload: { title: '', body: 'A document with no name.' },
        rationale: 'because',
        citations: [],
      } as never)
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it('rejects a citation that does not resolve, storing nothing', async () => {
    // The failure this catches is the one that recurred through phase 2c: an
    // agent naming an id it never saw. A stored document citing invented
    // entries looks better evidenced than one citing none.
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_document(contextWith(inserted, []), {
        payload: { title: 'Harmonic constituents', body: 'Five.' },
        rationale: 'because',
        citations: [{ type: 'entry', id: UUID }],
      } as never)
    ).rejects.toThrow(/citation/i);
    expect(inserted).toHaveLength(0);
  });

  it('does not require the document to have been read first', async () => {
    // propose_document_edit does, because an edit is written against a version.
    // A create has no prior version, so demanding a read would be demanding an
    // id that cannot exist — the shape of bug that cost phase 2c three rounds.
    const inserted: unknown[] = [];
    const ctx = contextWith(inserted);
    expect(ctx.documentVersions.size).toBe(0);

    await HANDLERS.propose_document(ctx, {
      payload: { title: 'Bearing selection', body: 'Ceramic, for the salt.' },
      rationale: 'Nothing records why ceramic.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
  });
});

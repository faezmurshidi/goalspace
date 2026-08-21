import { describe, expect, it } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, REPO_READ, WRITE_TOOLS } from '@/lib/agents/tools/registry';

const UUID = '11111111-1111-4111-8111-111111111111';

function contextWith(inserted: unknown[], citable: string[] = []): ToolContext {
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
        return {
          select: () => ({
            eq: () => ({
              in: async (_c: string, ids: string[]) => ({
                data: ids.filter((id) => citable.includes(id)).map((id) => ({ id })),
                error: null,
              }),
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: UUID, updated_at: '2026-08-21T00:00:00.000Z' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      },
    } as never,
    projectId: 'project-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
  };
}

describe('write tools in the registry', () => {
  it('marks every write tool as writing and not external', () => {
    for (const name of WRITE_TOOLS) {
      expect(REGISTRY[name].writes).toBe(true);
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
  it('stamps the document’s current updated_at as the edit base', async () => {
    // The agent does not supply this — it is read from the row at propose
    // time, so the model cannot claim to have based its edit on a newer
    // version than it actually read.
    const inserted: unknown[] = [];
    await HANDLERS.propose_document_edit(contextWith(inserted, [UUID]), {
      payload: { id: UUID, body: 'Rewritten' },
      rationale: 'Tightens the summary.',
      citations: [{ type: 'document', id: UUID }],
    } as never);

    const row = inserted[0] as { payload: { base_updated_at: string }; target_id: string };
    expect(row.payload.base_updated_at).toBe('2026-08-21T00:00:00.000Z');
    expect(row.target_id).toBe(UUID);
  });
});

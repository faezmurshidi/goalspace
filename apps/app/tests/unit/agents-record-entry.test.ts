import { describe, expect, it } from 'vitest';

import { SEEDED_TEMPLATES } from '@/lib/agents/templates';
import { REGISTRY } from '@/lib/agents/tools/registry';
import { unresolvedSources } from '@/lib/agents/tools/sources';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('unresolvedSources', () => {
  it('accepts ids the owner actually wrote', () => {
    expect(unresolvedSources([A, B], new Set([A, B, C]))).toEqual([]);
  });

  it('names an id that is not in the allowed set', () => {
    // The allowed set is this conversation's user turns. An id outside it is an
    // assistant turn, another conversation's message, or an invention — and the
    // tool cannot tell which, nor does it need to.
    expect(unresolvedSources([A, C], new Set([A, B]))).toEqual([C]);
  });

  it('rejects an empty citation list', () => {
    // Silence is not consent. A record_entry with no source is exactly the
    // agent authoring an entry, which is what the design forbids — so the empty
    // case must not fall through as "nothing to check, therefore fine".
    expect(unresolvedSources([], new Set([A]))).toEqual(['(none cited)']);
  });

  it('reports every unresolved id, not just the first', () => {
    // The model gets one chance to correct itself. Naming one id at a time
    // turns that into several round trips at the owner's expense.
    expect(unresolvedSources([B, C], new Set([A]))).toEqual([B, C]);
  });
});

describe('record_entry in the registry', () => {
  it('is categorised as recording, not proposing', () => {
    expect(REGISTRY.record_entry.writes).toBe('records');
    expect(REGISTRY.record_entry.external).toBe(false);
  });

  it('requires at least one source message', () => {
    const schema = REGISTRY.record_entry.inputSchema;
    const payload = { kind: 'note', title: null, body: 'Replaced the bearings.' };
    expect(schema.safeParse({ payload, source_message_ids: [] }).success).toBe(false);
    expect(schema.safeParse({ payload, source_message_ids: [A] }).success).toBe(true);
  });
});

describe('the Partner holds it', () => {
  it('can record, and still cannot propose', () => {
    const partner = SEEDED_TEMPLATES.find((t) => t.slug === 'partner')!;
    expect(partner.tools).toContain('record_entry');
    for (const name of partner.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes, name).not.toBe('proposes');
    }
  });

  it('is the only template that can record', () => {
    const holders = SEEDED_TEMPLATES.filter((t) => t.tools.includes('record_entry')).map(
      (t) => t.slug
    );
    expect(holders).toEqual(['partner']);
  });
});

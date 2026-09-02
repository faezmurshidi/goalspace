import { describe, expect, it } from 'vitest';

import { citationsSchema, payloadSchemaFor } from '@/lib/schemas/proposal';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('citationsSchema', () => {
  it('accepts an empty list', () => {
    expect(citationsSchema.parse([])).toEqual([]);
  });

  it('accepts the three citable types', () => {
    const cites = [
      { type: 'entry', id: UUID },
      { type: 'work_item', id: UUID },
      { type: 'document', id: UUID },
    ];
    expect(citationsSchema.parse(cites)).toHaveLength(3);
  });

  it('rejects a type that is not citable', () => {
    // A URL is not citable in this phase — proposals.citations resolves ids
    // inside the project, and web_search does not exist yet.
    expect(citationsSchema.safeParse([{ type: 'url', id: UUID }]).success).toBe(false);
  });

  it('rejects an id that is not a uuid', () => {
    expect(citationsSchema.safeParse([{ type: 'entry', id: 'e1' }]).success).toBe(false);
  });
});

describe('payloadSchemaFor', () => {
  it('validates an entry payload with the schema the capture form uses', () => {
    const parsed = payloadSchemaFor('entry').safeParse({
      kind: 'note',
      body: 'Something happened',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an entry payload with an unknown kind', () => {
    expect(payloadSchemaFor('entry').safeParse({ kind: 'rambling', body: 'x' }).success).toBe(
      false
    );
  });

  it('validates a work item payload', () => {
    expect(payloadSchemaFor('work_item').safeParse({ title: 'Order the servo' }).success).toBe(
      true
    );
  });

  it('requires base_updated_at on a document edit', () => {
    // Without it there is no way to tell that the document moved on since the
    // agent read it, and the proposal would apply stale content over newer work.
    expect(payloadSchemaFor('document_edit').safeParse({ id: UUID, body: 'New' }).success).toBe(
      false
    );
    const withBase = {
      id: UUID,
      body: 'New',
      base_updated_at: '2026-08-21T00:00:00.000Z',
    };
    expect(payloadSchemaFor('document_edit').safeParse(withBase).success).toBe(true);
  });
});

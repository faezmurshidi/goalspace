import { describe, expect, it } from 'vitest';

import { createDocumentSchema, updateDocumentSchema } from '@/lib/schemas/document';

describe('createDocumentSchema', () => {
  it('requires a title', () => {
    expect(createDocumentSchema.safeParse({ body: 'text' }).success).toBe(false);
  });

  it('trims the title and rejects one that is only whitespace', () => {
    // requiredText trims before checking length, so "   " is not a title.
    expect(createDocumentSchema.safeParse({ title: '   ', body: '' }).success).toBe(false);
    const parsed = createDocumentSchema.parse({ title: '  Spec  ', body: '' });
    expect(parsed.title).toBe('Spec');
  });

  it('defaults an absent body to empty rather than null', () => {
    // documents.body is `not null default ''`; null would be rejected by the
    // database after passing validation, which is the worst ordering.
    expect(createDocumentSchema.parse({ title: 'Spec' }).body).toBe('');
  });

  it('rejects a body beyond the column budget', () => {
    const tooLong = 'x'.repeat(200_001);
    expect(createDocumentSchema.safeParse({ title: 'Spec', body: tooLong }).success).toBe(false);
  });
});

describe('updateDocumentSchema', () => {
  it('requires the id', () => {
    expect(updateDocumentSchema.safeParse({ title: 'Spec' }).success).toBe(false);
  });

  it('accepts a title-only or body-only edit', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(updateDocumentSchema.safeParse({ id, title: 'New' }).success).toBe(true);
    expect(updateDocumentSchema.safeParse({ id, body: 'New body' }).success).toBe(true);
  });
});

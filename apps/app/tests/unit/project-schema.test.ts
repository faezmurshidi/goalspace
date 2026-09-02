import { describe, expect, it } from 'vitest';

import { projectStatuses } from '@/lib/schemas/common';
import { deleteProjectSchema, updateProjectSchema } from '@/lib/schemas/project';

const id = '11111111-1111-4111-8111-111111111111';

describe('updateProjectSchema', () => {
  // The schema already existed with no test. These pin the behaviour the
  // settings form depends on before that form is written against it.
  const valid = {
    id,
    title: 'Desktop companion robot',
    brief: 'Sits on a desk.',
    status: 'active',
  };

  it('accepts a well-formed update', () => {
    expect(updateProjectSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty brief', () => {
    // projects.brief is nullable and optionalText trims, so empty is a
    // legitimate value rather than a missing one.
    expect(updateProjectSchema.safeParse({ ...valid, brief: '' }).success).toBe(true);
  });

  it('rejects a blank title when one is supplied', () => {
    expect(updateProjectSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
  });

  it('rejects a status outside the column’s check constraint', () => {
    expect(updateProjectSchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false);
  });

  it('accepts every status the database allows, from the shared list', () => {
    // Iterating the same tuple the column's constraint was written from means
    // this test fails if the two ever diverge.
    for (const status of projectStatuses) {
      expect(updateProjectSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it('drops a slug — a project’s slug is its identity, not a setting', () => {
    const parsed = updateProjectSchema.safeParse({ ...valid, slug: 'renamed' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'slug' in parsed.data).toBe(false);
  });

  it('requires the id, which names the row to update', () => {
    const { id: _omitted, ...withoutId } = valid;
    expect(updateProjectSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe('deleteProjectSchema', () => {
  it('requires the typed confirmation', () => {
    expect(deleteProjectSchema.safeParse({ confirmSlug: '' }).success).toBe(false);
    expect(deleteProjectSchema.safeParse({ confirmSlug: 'robot' }).success).toBe(true);
  });
});

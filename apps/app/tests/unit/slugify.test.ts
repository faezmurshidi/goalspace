import { describe, expect, it } from 'vitest';

import { slugify, slugSchema } from '@/lib/schemas/common';

describe('slugify', () => {
  it('lowercases and hyphenates a plain title', () => {
    expect(slugify('Bandsaw Mill Build')).toBe('bandsaw-mill-build');
  });

  it('collapses runs of punctuation and spaces into one hyphen', () => {
    expect(slugify('Frame   geometry -- v3!!')).toBe('frame-geometry-v3');
  });

  it('does not leave a leading or trailing hyphen', () => {
    expect(slugify('  ...Welding notes...  ')).toBe('welding-notes');
  });

  it('strips accents from Latin text rather than dropping the letters', () => {
    // Malay is Latin-script, but borrowed and place names carry accents.
    expect(slugify('Réparation Café')).toBe('reparation-cafe');
  });

  it('keeps non-Latin scripts instead of reducing them to nothing', () => {
    // The interface serves zh. A naive [^a-z0-9] filter would turn this
    // title into the empty string and every Chinese project would collide on
    // the same fallback slug.
    expect(slugify('学习目标')).toBe('学习目标');
  });

  it('returns null when nothing usable survives', () => {
    // The caller decides the fallback; silently persisting '' would violate
    // the slug format and break the project URL.
    expect(slugify('!!!')).toBeNull();
    expect(slugify('   ')).toBeNull();
    expect(slugify('')).toBeNull();
  });

  it('caps length without leaving a trailing hyphen behind', () => {
    const slug = slugify('a'.repeat(60) + ' ' + 'b'.repeat(30));

    expect(slug).not.toBeNull();
    expect(slug!.length).toBeLessThanOrEqual(64);
    expect(slug!.endsWith('-')).toBe(false);
  });

  it('produces output the slug schema accepts', () => {
    for (const title of ['Bandsaw Mill Build', 'Réparation Café', 'Frame -- v3']) {
      expect(slugSchema.safeParse(slugify(title)).success).toBe(true);
    }
  });

  it('keeps digits', () => {
    expect(slugify('Sprint 3 retrospective')).toBe('sprint-3-retrospective');
  });
});

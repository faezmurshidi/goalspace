import { describe, expect, it } from 'vitest';

import en from '../src/locales/en.json';
import ms from '../src/locales/ms.json';
import zh from '../src/locales/zh.json';

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  );
}

const locales = { en, ms, zh } as const;

describe('locale parity', () => {
  it.each(['ms', 'zh'] as const)('%s carries exactly the keys en does', (name) => {
    const expected = new Set(flatten(locales.en));
    const actual = new Set(flatten(locales[name]));

    // Reported as sorted arrays rather than a boolean: a failure should name
    // the key to add, not merely assert that one is missing somewhere.
    expect({
      missing: [...expected].filter((k) => !actual.has(k)).sort(),
      extra: [...actual].filter((k) => !expected.has(k)).sort(),
    }).toEqual({ missing: [], extra: [] });
  });

  it('has no empty strings, which read as a missing translation', () => {
    for (const [name, bundle] of Object.entries(locales)) {
      const blanks = flatten(bundle).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], bundle);
        return typeof value === 'string' && value.trim() === '';
      });
      expect({ locale: name, blanks }).toEqual({ locale: name, blanks: [] });
    }
  });
});

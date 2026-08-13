import { describe, expect, it } from 'vitest';

describe('harness', () => {
  it('runs and resolves the @ alias', async () => {
    const { cn } = await import('@goalspace/ui');
    expect(cn('a', 'b')).toBe('a b');
  });
});

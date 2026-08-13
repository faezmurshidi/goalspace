import { describe, expect, it } from 'vitest';
import { daysBetween, formatElapsed } from '@/lib/duration';

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-03-14', '2026-04-06')).toBe(23);
  });

  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-03-14', '2026-03-14')).toBe(0);
  });

  it('never returns a negative number', () => {
    expect(daysBetween('2026-04-06', '2026-03-14')).toBe(0);
  });

  it('is unaffected by timezone, counting calendar days in UTC', () => {
    expect(daysBetween('2026-03-14', '2026-03-15')).toBe(1);
  });

  it('crosses a leap day correctly', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('formatElapsed', () => {
  it('reports days below 60', () => {
    expect(formatElapsed(23)).toEqual({ value: '23', unit: 'days' });
  });

  it('uses the singular unit for one day', () => {
    expect(formatElapsed(1)).toEqual({ value: '1', unit: 'day' });
  });

  it('reports months from 60 days', () => {
    expect(formatElapsed(90)).toEqual({ value: '3', unit: 'months' });
  });

  it('reports years from 730 days', () => {
    expect(formatElapsed(800)).toEqual({ value: '2', unit: 'years' });
  });

  it('handles zero without a unit mismatch', () => {
    expect(formatElapsed(0)).toEqual({ value: '0', unit: 'days' });
  });
});

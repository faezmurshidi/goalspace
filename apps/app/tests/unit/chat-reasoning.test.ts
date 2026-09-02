import { describe, expect, it } from 'vitest';

import { reasoningFrom } from '@/lib/chat/reasoning';

describe('reasoningFrom', () => {
  it('joins several segments into one block', () => {
    // A model may emit reasoning in pieces. Rendered separately they would be a
    // row of indicators that each say nothing.
    expect(
      reasoningFrom([
        { type: 'reasoning', text: 'M4 matters in shallow water.' },
        { type: 'text', text: 'Yes, include it.' },
        { type: 'reasoning', text: 'The Dyfi is shallow.' },
      ])
    ).toBe('M4 matters in shallow water.\n\nThe Dyfi is shallow.');
  });

  it('returns empty for a model that does not reason', () => {
    // gpt-4o-mini emits none, which the other four agents run on. Empty is the
    // whole of handling that case: the caller renders nothing.
    expect(reasoningFrom([{ type: 'text', text: 'Answer.' }])).toBe('');
    expect(reasoningFrom([])).toBe('');
    expect(reasoningFrom(undefined)).toBe('');
  });

  it('drops blank segments rather than rendering an empty disclosure', () => {
    expect(reasoningFrom([{ type: 'reasoning', text: '   ' }])).toBe('');
  });

  it('survives malformed parts', () => {
    expect(reasoningFrom([null, 'reasoning', { type: 'reasoning' }])).toBe('');
  });
});

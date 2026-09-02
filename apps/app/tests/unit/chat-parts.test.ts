import { describe, expect, it } from 'vitest';

import { textFromParts } from '@/lib/chat/parts';

describe('textFromParts', () => {
  it('joins the text parts in order', () => {
    expect(
      textFromParts([
        { type: 'text', text: 'Recorded. ' },
        { type: 'text', text: 'Anything else?' },
      ])
    ).toBe('Recorded. Anything else?');
  });

  it('ignores tool parts', () => {
    // content holds what was said. A turn that was entirely a tool call has no
    // prose, and describing the call there would put a rendering of a tool into
    // a column meant for words.
    expect(
      textFromParts([
        { type: 'tool-record_entry', state: 'approval-requested', input: {} },
        { type: 'text', text: 'Shall I?' },
      ])
    ).toBe('Shall I?');
  });

  it('returns empty for a turn with no prose at all', () => {
    expect(textFromParts([{ type: 'tool-ask_agent', output: { proposals: 2 } }])).toBe('');
    expect(textFromParts([])).toBe('');
    expect(textFromParts(undefined)).toBe('');
  });

  it('survives malformed parts', () => {
    expect(textFromParts([null, 'text', { type: 'text' }, { text: 'orphan' }])).toBe('');
  });
});

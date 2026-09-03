import { describe, expect, it } from 'vitest';

import { silentTurnFrom } from '@/lib/chat/silent-turn';

describe('silentTurnFrom', () => {
  it('returns null when the turn said something', () => {
    expect(silentTurnFrom([{ type: 'text', text: 'Here is what the record says.' }])).toBeNull();
  });

  it('reports a turn that only made tool calls, with how many', () => {
    // The live failure: twelve steps of rejected calls, no prose, and a
    // speaker label above blank space.
    const parts = [
      { type: 'step-start' },
      { type: 'tool-list_entries', state: 'output-available' },
      { type: 'tool-list_entries', state: 'output-available' },
      { type: 'tool-propose_document', state: 'output-available' },
    ];
    expect(silentTurnFrom(parts)).toEqual({ toolCalls: 3 });
  });

  it('reports a turn with no parts at all', () => {
    expect(silentTurnFrom([])).toEqual({ toolCalls: 0 });
    expect(silentTurnFrom(undefined)).toEqual({ toolCalls: 0 });
  });

  it('treats whitespace-only text as having said nothing', () => {
    // It renders as blank, so it is blank. The owner cannot tell the
    // difference and neither should this.
    expect(silentTurnFrom([{ type: 'text', text: '   \n ' }])).toEqual({ toolCalls: 0 });
  });

  it('does not call a turn silent when it is waiting on an approval', () => {
    // An approval is a control the owner has to answer. A turn carrying one is
    // showing them something, even with no prose around it.
    const parts = [{ type: 'tool-record_entry', state: 'approval-requested' }];
    expect(silentTurnFrom(parts)).toBeNull();
  });

  it('still counts a turn carrying only reasoning as silent', () => {
    // Reasoning is folded away by default, so the turn reads as blank on the
    // page even though the part is there.
    expect(silentTurnFrom([{ type: 'reasoning', text: 'Thinking about it.' }])).toEqual({
      toolCalls: 0,
    });
  });

  it('ignores malformed parts rather than throwing', () => {
    // Parts come from a jsonb column written by an older build.
    expect(silentTurnFrom([null, 'nonsense', { noType: true }, { type: 42 }])).toEqual({
      toolCalls: 0,
    });
  });
});

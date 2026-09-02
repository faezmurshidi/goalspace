import { describe, expect, it } from 'vitest';

import { dedupeProposedItems } from '@/lib/intake/dedupe';

const item = (id: string, title: string) => ({ id, title, kind: 'task', rationale: 'Because.' });

describe('dedupeProposedItems', () => {
  it('keeps the first of two items with the same title', () => {
    // Observed live: the Planner proposed "Test Siraya Tech Sculpt Ultra-White
    // resin in heated enclosure" twice, with identical rationale. A prompt
    // asking it not to is not a control; this is.
    const { kept, dropped } = dedupeProposedItems([
      item('a', 'Test resin in enclosure'),
      item('b', 'Set up printer'),
      item('c', 'Test resin in enclosure'),
    ]);

    expect(kept.map((i) => i.id)).toEqual(['a', 'b']);
    expect(dropped).toEqual(['c']);
  });

  it('ignores case and surrounding whitespace when comparing', () => {
    const { kept, dropped } = dedupeProposedItems([
      item('a', 'Order the heater'),
      item('b', '  order the HEATER '),
    ]);

    expect(kept).toHaveLength(1);
    expect(dropped).toEqual(['b']);
  });

  it('leaves genuinely distinct items alone', () => {
    // The guard must not collapse two real items that merely start alike.
    const { kept, dropped } = dedupeProposedItems([
      item('a', 'Test resin A'),
      item('b', 'Test resin B'),
    ]);

    expect(kept).toHaveLength(2);
    expect(dropped).toEqual([]);
  });
});

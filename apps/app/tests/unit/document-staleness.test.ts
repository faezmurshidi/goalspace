import { describe, expect, it } from 'vitest';

import { staleCounts } from '@/lib/documents/staleness';

const doc = (id: string, mark: string | null) => ({ id, synthesised_through: mark });

describe('staleCounts', () => {
  it('counts the entries that happened after the mark', () => {
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z')],
      ['2026-08-09T00:00:00.000Z', '2026-08-11T00:00:00.000Z', '2026-08-12T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(2);
  });

  it('omits a document with no mark rather than counting zero', () => {
    // A hand-written document never claimed to synthesise anything. Present
    // with zero would let a caller render "0 entries since this was written"
    // against a document that was never written from the log at all.
    const counts = staleCounts([doc('a', null)], ['2026-08-11T00:00:00.000Z']);
    expect(counts.has('a')).toBe(false);
  });

  it('does not count an entry exactly on the mark', () => {
    // The mark IS that entry's occurred_at — the document was written from it,
    // so it is read, not outstanding.
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z')],
      ['2026-08-10T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(0);
  });

  it('gives a document caught up with the log a count of zero', () => {
    // Zero is a real answer and must be distinguishable from absent: this
    // document did claim to synthesise, and is current.
    const counts = staleCounts(
      [doc('a', '2026-08-20T00:00:00.000Z')],
      ['2026-08-10T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(0);
  });

  it('compares instants, not strings', () => {
    // Postgres renders timestamptz as `2026-08-10 00:00:00+00` while an ISO
    // string carries a `Z`. Compared as text, every mark looks older than
    // every entry and the count is always the whole log.
    const counts = staleCounts(
      [doc('a', '2026-08-10 00:00:00+00')],
      ['2026-08-09T23:00:00.000Z', '2026-08-10T01:00:00.000Z']
    );
    expect(counts.get('a')).toBe(1);
  });

  it('counts each document against the same log', () => {
    const counts = staleCounts(
      [doc('a', '2026-08-10T00:00:00.000Z'), doc('b', '2026-08-01T00:00:00.000Z'), doc('c', null)],
      ['2026-08-05T00:00:00.000Z', '2026-08-15T00:00:00.000Z']
    );
    expect(counts.get('a')).toBe(1);
    expect(counts.get('b')).toBe(2);
    expect(counts.has('c')).toBe(false);
  });

  it('handles an empty log and no documents', () => {
    expect(staleCounts([doc('a', '2026-08-10T00:00:00.000Z')], []).get('a')).toBe(0);
    expect(staleCounts([], ['2026-08-10T00:00:00.000Z']).size).toBe(0);
  });

  it('ignores an unparseable mark rather than counting the whole log against it', () => {
    // Failing closed: a bad mark is not evidence that everything is unread.
    // Rendering "412 entries since this was written" would be worse than
    // rendering nothing.
    expect(staleCounts([doc('a', 'not a date')], ['2026-08-10T00:00:00.000Z']).has('a')).toBe(
      false
    );
  });
});

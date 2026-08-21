import { describe, expect, it } from 'vitest';

import { isSuperseded } from '@/lib/proposals/apply';

describe('isSuperseded', () => {
  it('is false when the document has not moved since the agent read it', () => {
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21T00:00:00.000Z')).toBe(false);
  });

  it('is true when the document changed after the proposal was generated', () => {
    // Applying here would overwrite whatever the owner wrote in between, which
    // is the one failure the revision system cannot make good on: the owner
    // would have to notice before they could undo.
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21T09:00:00.000Z')).toBe(true);
  });

  it('compares instants, not strings', () => {
    // Postgres renders timestamptz with a +00 offset, not a Z suffix. String
    // comparison would call these two different and supersede every edit.
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21 00:00:00+00')).toBe(false);
  });

  it('treats an unparseable base as superseded', () => {
    // Fail closed. A base we cannot read is not evidence that applying is safe.
    expect(isSuperseded('not a date', '2026-08-21T00:00:00.000Z')).toBe(true);
  });
});

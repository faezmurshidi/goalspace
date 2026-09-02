import { describe, expect, it } from 'vitest';

import { changeStatusSchema } from '@/lib/schemas/work-item';

const ID = '11111111-1111-4111-8111-111111111111';

describe('changeStatusSchema', () => {
  it('accepts a note on a reopening, not only on a closure', () => {
    // The rule this replaces allowed a note only on a move to done, on the
    // reasoning that a note attached to a reopening would claim to have closed
    // something still open. That reasoning was about the link, not the entry:
    // "the flange arrived, six weeks late" is what the log exists to hold, and
    // unblocking had nowhere to put it.
    for (const status of ['open', 'doing', 'blocked', 'done', 'dropped'] as const) {
      const parsed = changeStatusSchema.safeParse({
        id: ID,
        status,
        statusEntryBody: 'The flange arrived, six weeks late.',
        ...(status === 'blocked' ? {} : {}),
      });
      expect(parsed.success, status).toBe(true);
    }
  });

  it('still refuses a wake date on anything but blocked', () => {
    // Unchanged and load-bearing: a wake date left on a finished item
    // resurfaces it on the resume view as something still being waited on,
    // long after it stopped mattering.
    const parsed = changeStatusSchema.safeParse({
      id: ID,
      status: 'done',
      wake_at: '2026-10-01T00:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a wake date on blocked', () => {
    const parsed = changeStatusSchema.safeParse({
      id: ID,
      status: 'blocked',
      wake_at: '2026-10-01T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts clearing the wake date when leaving blocked', () => {
    // Null is how the wake date is cleared, and it must stay legal on a status
    // that could not carry a date.
    const parsed = changeStatusSchema.safeParse({ id: ID, status: 'open', wake_at: null });
    expect(parsed.success).toBe(true);
  });
});

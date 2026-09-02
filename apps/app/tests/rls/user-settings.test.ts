import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getUserSettings, updateUserSettings } from '@/lib/db/user-settings';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
// A dedicated third user for the defaults case, so it does not depend on
// whether it runs before or after `updateUserSettings` has touched alice's
// row — sharing a user with the update case is the D1 mistake in mirror
// image (see task-4-brief.md).
let carol: TestUser | undefined;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`settings-alice-${Date.now()}@example.test`);
  bob = await createTestUser(`settings-bob-${Date.now()}@example.test`);
  carol = await createTestUser(`settings-carol-${Date.now()}@example.test`);
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
  if (carol) await deleteTestUser(carol.id);
});

describe('getUserSettings', () => {
  it('returns the row the signup trigger created, with column defaults', async () => {
    const settings = await getUserSettings(carol!.client as never, carol!.id);
    expect(settings.theme).toBe('system');
    expect(settings.locale).toBe('en');
    expect(settings.time_zone).toBe('UTC');
    expect(settings.email_notifications).toBe(true);
  });
});

describe('updateUserSettings', () => {
  it('changes all four fields', async () => {
    const updated = await updateUserSettings(client(), {
      userId: alice!.id,
      values: {
        theme: 'dark',
        locale: 'ms',
        time_zone: 'Asia/Kuala_Lumpur',
        email_notifications: false,
      },
    });
    expect(updated?.theme).toBe('dark');
    expect(updated?.locale).toBe('ms');
    expect(updated?.time_zone).toBe('Asia/Kuala_Lumpur');
    expect(updated?.email_notifications).toBe(false);
  });

  it('cannot be read by a second user', async () => {
    // Confirmed directly, with alice's own client, rather than trusting that
    // the earlier "changes all four fields" test ran first in this file.
    // Without this, deleting or reordering that test would leave alice's row
    // holding its own column defaults, and the assertions below would then
    // pass vacuously — matching "system"/"en"/"UTC"/true whether RLS refused
    // bob or not. Same fix as the dedicated `carol` user above, applied here
    // to the read case instead of the defaults case.
    const aliceOwn = await getUserSettings(client(), alice!.id);
    expect(aliceOwn.theme).toBe('dark');
    expect(aliceOwn.locale).toBe('ms');
    expect(aliceOwn.time_zone).toBe('Asia/Kuala_Lumpur');
    expect(aliceOwn.email_notifications).toBe(false);

    // Bob's client, but ALICE's userId, so the function's own .eq('user_id')
    // filter cannot be what hides this row — RLS has to be, via
    // user_settings_select. Passing bob's own id would find bob's own row (or
    // its defaults) and prove nothing about isolation.
    const asBob = await getUserSettings(bob!.client as never, alice!.id);
    // RLS makes alice's row invisible to bob, so getUserSettings falls back to
    // the same "missing row" defaults it uses for a pre-trigger account — not
    // alice's actual 'dark' / 'ms' / 'Asia/Kuala_Lumpur' / false, which the
    // previous test just wrote.
    expect(asBob.theme).toBe('system');
    expect(asBob.locale).toBe('en');
    expect(asBob.time_zone).toBe('UTC');
    expect(asBob.email_notifications).toBe(true);
  });

  it('cannot be written by a second user, and alice’s row is unchanged afterwards', async () => {
    // Again, bob's client with ALICE's userId, so RLS's update policy is what
    // refuses the write, not the explicit .eq('user_id') filter.
    const before = await getUserSettings(client(), alice!.id);

    const updated = await updateUserSettings(bob!.client as never, {
      userId: alice!.id,
      values: {
        theme: 'light',
        locale: 'zh',
        time_zone: 'Europe/London',
        email_notifications: true,
      },
    });
    expect(updated).toBeNull();

    const after = await getUserSettings(client(), alice!.id);
    expect(after.theme).toBe(before.theme);
    expect(after.locale).toBe(before.locale);
    expect(after.time_zone).toBe(before.time_zone);
    expect(after.email_notifications).toBe(before.email_notifications);
  });
});

import { describe, expect, it } from 'vitest';

import { locales } from '@goalspace/i18n';
import { THEMES } from '@/lib/settings/preference-cookies';
import { updateAccountSettingsSchema } from '@/lib/schemas/user-settings';

const valid = {
  theme: 'dark',
  locale: 'en',
  time_zone: 'Asia/Kuala_Lumpur',
  email_notifications: true,
};

describe('updateAccountSettingsSchema', () => {
  it('accepts a well-formed set of preferences', () => {
    expect(updateAccountSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts every shipped theme', () => {
    for (const theme of THEMES) {
      expect(updateAccountSettingsSchema.safeParse({ ...valid, theme }).success).toBe(true);
    }
  });

  it('rejects an unknown theme', () => {
    expect(updateAccountSettingsSchema.safeParse({ ...valid, theme: 'solarized' }).success).toBe(
      false
    );
  });

  it('accepts every shipped locale', () => {
    for (const locale of locales) {
      expect(updateAccountSettingsSchema.safeParse({ ...valid, locale }).success).toBe(true);
    }
  });

  it('rejects a locale this app does not ship', () => {
    expect(updateAccountSettingsSchema.safeParse({ ...valid, locale: 'fr' }).success).toBe(false);
  });

  it('accepts a real IANA time zone', () => {
    for (const time_zone of ['UTC', 'Asia/Kuala_Lumpur', 'Europe/London', 'America/New_York']) {
      expect(updateAccountSettingsSchema.safeParse({ ...valid, time_zone }).success).toBe(true);
    }
  });

  it('rejects an invented time zone', () => {
    expect(
      updateAccountSettingsSchema.safeParse({ ...valid, time_zone: 'Mordor/Barad_Dur' }).success
    ).toBe(false);
  });

  it('accepts email_notifications set to false, not treating it as absent', () => {
    // Same trap as D1's zero-dollar cap: a falsy value is a real setting, and
    // `z.boolean()` without a default must not turn a `false` into a missing
    // field.
    const result = updateAccountSettingsSchema.safeParse({ ...valid, email_notifications: false });
    expect(result.success).toBe(true);
    expect(result.success && result.data.email_notifications).toBe(false);
  });

  it('rejects a missing email_notifications rather than defaulting it', () => {
    const { email_notifications: _omit, ...rest } = valid;
    expect(updateAccountSettingsSchema.safeParse(rest).success).toBe(false);
  });
});

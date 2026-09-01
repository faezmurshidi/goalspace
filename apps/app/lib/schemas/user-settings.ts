import { z } from 'zod';

import { locales } from '@goalspace/i18n';
import { THEMES, isSupportedTimeZone, type ThemePreference } from '@/lib/settings/preference-cookies';

/**
 * Account-wide preferences: theme, language, time zone, email notifications.
 *
 * Shared by the settings form and `updateAccountSettingsAction`, the same
 * split every other schema in this directory follows: one validation path so
 * the two cannot silently accept different things.
 */

/**
 * `THEMES` is deliberately typed as `readonly ThemePreference[]`, not a
 * literal tuple — see `preference-cookies.ts` — because it also backs a
 * runtime `.includes()` check. `z.enum` needs a tuple type, so this narrows
 * it back rather than adding a second, hand-copied list of theme names.
 */
const themeSchema = z.enum(THEMES as readonly [ThemePreference, ...ThemePreference[]]);

/**
 * The locale list comes from `packages/i18n`, which is also where the
 * database CHECK on `user_settings.locale` was copied from
 * (20260829000100_user_settings_and_month_to_date.sql). Building the enum
 * from that tuple, rather than writing the three codes out again, keeps this
 * schema from becoming a third copy that can drift from either the CHECK or
 * the shipped translations.
 */
const localeSchema = z.enum(locales);

/**
 * Validated with `isSupportedTimeZone`, not a list — the IANA database is
 * maintained outside this repo and gains zones on its own schedule, so a
 * hardcoded list here would eventually reject a legitimate zone (see
 * `isSupportedTimeZone`'s own comment, and the migration comment on
 * `user_settings.time_zone`, which is why that column carries no CHECK).
 */
const timeZoneSchema = z.string().refine(isSupportedTimeZone, {
  message: 'Not a recognised time zone.',
});

export const updateAccountSettingsSchema = z.object({
  theme: themeSchema,
  locale: localeSchema,
  time_zone: timeZoneSchema,
  // Explicit boolean, not `.optional()` or a truthy check: `false` is a real,
  // common choice ("turn notifications off"), not an absent value. Treating
  // it as absent is the same class of bug D1 had with a zero-dollar spend
  // cap being read as "no cap configured".
  email_notifications: z.boolean(),
});

export type UpdateAccountSettingsValues = z.output<typeof updateAccountSettingsSchema>;

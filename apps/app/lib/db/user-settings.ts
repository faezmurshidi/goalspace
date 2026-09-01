import type { SupabaseClient } from '@supabase/supabase-js';

import { defaultLocale } from '@goalspace/i18n';
import type { Database, Tables } from '@/types/supabase';
import type { UpdateAccountSettingsValues } from '@/lib/schemas/user-settings';
import { parseTheme, parseTimeZone } from '@/lib/settings/preference-cookies';

type Client = SupabaseClient<Database>;

export type UserSettings = Tables<'user_settings'>;

const USER_SETTINGS_COLUMNS =
  'id, user_id, theme, locale, time_zone, email_notifications, created_at, updated_at';

/**
 * The `user_settings` column defaults, for an account whose row does not
 * exist.
 *
 * `on_auth_user_created` inserts the row in the same transaction as the auth
 * record for every account created since 20260814000100_users_profile_trigger
 * (with a one-off backfill for everyone before it, at the same migration's
 * line 173), so this only fires for an account that predates both. It is not
 * this function's job to create the row — `getUserSettings` reads rather than
 * upserts — so these values mirror the column defaults instead of being read
 * back from an insert, unlike `getBudget`.
 *
 * `parseTheme`/`parseTimeZone` are reused for the theme and time zone rather
 * than repeating 'system' and 'UTC' as bare literals a third time: those
 * functions already encode "what a missing preference falls back to", which
 * is exactly this case.
 *
 * `created_at` and `updated_at` are not meaningful for a row that does not
 * exist, and neither is `id` — `updateUserSettings` addresses rows by
 * `user_id`, never by `id`. `id` is deliberately the nil UUID rather than
 * `userId`: a nil UUID cannot be mistaken for a real row's primary key if
 * this value ever escapes this function, whereas `userId` is a value that
 * genuinely does identify something (the account) and so would read as
 * meaningful identity when it is not. This value is not a real row id and
 * never will be.
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

function defaultUserSettings(userId: string): UserSettings {
  const now = new Date().toISOString();
  return {
    id: NIL_UUID,
    user_id: userId,
    theme: parseTheme(undefined),
    locale: defaultLocale,
    time_zone: parseTimeZone(undefined),
    email_notifications: true,
    created_at: now,
    updated_at: now,
  };
}

/**
 * One user's account preferences.
 *
 * Reads rather than upserts. RLS (`user_settings_select`) restricts this to
 * the caller's own row, so a caller reading another user's `userId` gets no
 * row back — indistinguishable here from a genuinely missing one, and both
 * fall back to `defaultUserSettings` rather than throwing: a settings page
 * that 500s is a worse failure than one that shows defaults.
 */
export async function getUserSettings(supabase: Client, userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(USER_SETTINGS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? defaultUserSettings(userId);
}

/**
 * Update all four account preferences.
 *
 * Filtered on `user_id`, matching `updateProject` and `updateBudget`: RLS
 * (`user_settings_update`) already refuses another user's row, but stating
 * ownership here means the function returns null on a refusal rather than
 * depending on a policy to raise, and null is what lets the caller — and the
 * RLS tests — distinguish "refused" from "changed".
 */
export async function updateUserSettings(
  supabase: Client,
  { userId, values }: { userId: string; values: UpdateAccountSettingsValues }
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .update(values)
    .eq('user_id', userId)
    .select(USER_SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

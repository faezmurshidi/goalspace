import { parseTimeZone } from '@/lib/settings/preference-cookies';

/**
 * The zone list the settings page offers.
 *
 * `Intl.supportedValuesOf('timeZone')` does **not** include `'UTC'` — it
 * returns 418 canonical IANA location zones on this runtime, starting at
 * `Africa/Abidjan`. But `'UTC'` is both the `user_settings.time_zone` column
 * default and what `parseTimeZone` falls back to, so it is the stored value
 * for every account that has never chosen a zone.
 *
 * Without it in the list a `<select>` has no option matching the stored value,
 * so the browser selects the first one instead: every such account saw
 * `Africa/Abidjan` presented as their time zone, and saving the form without
 * touching the field silently rewrote `UTC` to it. Found in the browser pass —
 * no test in this repo can see a `<select>` resolve its own value.
 *
 * The fallback is derived from `parseTimeZone(undefined)` rather than
 * restated as the literal `'UTC'` — `lib/db/user-settings.ts`'s
 * `defaultUserSettings` already does this for the same reason: one definition
 * of "what a missing time zone falls back to", not several that happen to
 * agree today.
 *
 * The fallback goes first because it is the default rather than because of
 * where it sorts. The `includes` guard is for a future ICU that adds it:
 * appending unconditionally would then offer it twice.
 */
export function timeZoneOptions(): string[] {
  const fallback = parseTimeZone(undefined);
  const zones = Intl.supportedValuesOf('timeZone');
  return zones.includes(fallback) ? zones : [fallback, ...zones];
}

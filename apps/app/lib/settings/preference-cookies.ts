/**
 * Preferences that must be known before the first paint.
 *
 * The durable copy of each lives in `user_settings`. These cookies are the
 * request-time copy, and they exist because `app/layout.tsx` is the root layout
 * for the whole app — including `/login` and `/auth`, where there is no session
 * to read settings with. Querying the database there would mean a round-trip on
 * every request, authenticated or not, to answer a question that has to be
 * settled before anything renders.
 *
 * The locale already works this way (`NEXT_LOCALE`); this is the same shape for
 * theme and time zone.
 */

export const THEME_COOKIE = 'goalspace.theme';
export const TIME_ZONE_COOKIE = 'goalspace.tz';

/** A year. These are preferences, not sessions. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Exported because three places need it: this parser, the account form's
 * select, and the header-rail theme menu. `header-rail.tsx` already carries a
 * hardcoded copy — replace it with this one rather than adding a third.
 *
 * `as const`, matching `REGISTRY_NAMES` in `lib/agents/tools/registry.ts` and
 * `proposalKinds` in `lib/schemas/proposal.ts`: it keeps the literal tuple
 * type `z.enum` needs (see `lib/schemas/user-settings.ts`), and does not
 * affect the `.includes()` check below, which already casts its argument.
 */
export const THEMES = ['light', 'dark', 'system'] as const;

/**
 * A cookie is client-writable, so every value here is untrusted input. An
 * unrecognised theme must land on the default rather than reaching next-themes,
 * which would put it on `<html>` as a class name.
 */
export function parseTheme(value: string | undefined): ThemePreference {
  return THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';
}

/**
 * Whether the running JavaScript engine recognises this zone.
 *
 * Asks `Intl` rather than consulting a list. The D1 migration left `time_zone`
 * unconstrained for exactly this reason: the IANA database is maintained
 * outside this repo and gains zones on its own schedule, so a copy kept here
 * would eventually reject a zone nobody chose to disallow.
 */
export function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function parseTimeZone(value: string | undefined): string {
  if (!value) return 'UTC';
  return isSupportedTimeZone(value) ? value : 'UTC';
}

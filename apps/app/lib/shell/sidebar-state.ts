/**
 * Whether the sidebar starts open.
 *
 * Read on the server from a cookie and written on the client, which is the
 * only way the first paint can match the stored state — deciding in an effect
 * means every navigation renders the wrong shell for a frame.
 *
 * Both halves live here so they cannot drift: a client writing `"0"` and a
 * server reading `"false"` produces a sidebar that silently forgets.
 */

export const SIDEBAR_COOKIE = 'goalspace.sidebar';

/** A year. The preference is not worth asking about twice. */
export const SIDEBAR_MAX_AGE = 60 * 60 * 24 * 365;

export function parseSidebarState(raw: string | undefined): boolean {
  // Anything unrecognised means open. The cookie is client-writable, and the
  // failure this guards is a collapsed shell the user cannot account for.
  return raw === 'false' ? false : true;
}

export function serializeSidebarState(open: boolean): string {
  return open ? 'true' : 'false';
}

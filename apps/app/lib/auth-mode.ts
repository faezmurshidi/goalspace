/**
 * Which tab `/login` opens on.
 *
 * The marketing site links straight to account creation, so the choice has to
 * survive a URL — and a URL is user-editable, which makes anything
 * unrecognized the default rather than an error.
 */
export type AuthMode = 'signin' | 'signup';

export function authModeFromParam(raw: string | null | undefined): AuthMode {
  return raw === 'signup' ? 'signup' : 'signin';
}

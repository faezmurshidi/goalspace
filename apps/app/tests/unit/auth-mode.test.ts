import { describe, expect, it } from 'vitest';

import { authModeFromParam } from '@/lib/auth-mode';

describe('authModeFromParam', () => {
  // The marketing site's "Sign up" has to land on the account-creation tab.
  // It used to point at /auth, which redirects to /login, which opened on
  // sign-in — so signing up meant a redirect and then a click.
  it('opens the create-account tab when asked for signup', () => {
    expect(authModeFromParam('signup')).toBe('signup');
  });

  it('opens sign-in when asked for signin', () => {
    expect(authModeFromParam('signin')).toBe('signin');
  });

  it('defaults to sign-in when absent', () => {
    expect(authModeFromParam(null)).toBe('signin');
    expect(authModeFromParam(undefined)).toBe('signin');
  });

  // The value comes off a URL anyone can edit, so anything unrecognized is
  // the default rather than a thrown error or an undefined mode.
  it('defaults to sign-in for an unrecognized value', () => {
    expect(authModeFromParam('register')).toBe('signin');
    expect(authModeFromParam('')).toBe('signin');
  });
});

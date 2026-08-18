'use client';

import { useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Button, Input, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { identifyUser, trackError, trackEvent } from '@/app/_lib/analytics';
import { safeInternalPath } from '@/lib/safe-redirect';
import { authModeFromParam, type AuthMode } from '@/lib/auth-mode';
import { createClient } from '@/utils/supabase/client';

type Pending = null | 'email' | 'google' | 'apple';

/**
 * Length is enforced on sign-up only, never on sign-in. An account created
 * under an older, shorter minimum must still be able to get in; validating
 * length on the sign-in form would lock those users out of their own record
 * with a message that blames their typing.
 */
const MIN_PASSWORD = 8;

/**
 * The callback redirects here with a code when it cannot finish, so those
 * codes have to render. Without this the user lands on an empty sign-in form
 * with no idea why they were sent back.
 */
const CALLBACK_ERRORS: Record<string, string> = {
  verification_failed: 'app.auth.errorCallbackFailed',
  server_configuration: 'app.auth.errorServerConfig',
};

export function AuthForm() {
  const { t } = useAppTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Initial value only: once the form is open, the tabs own the mode, so a
  // later render must not yank the user back to whatever the URL said.
  const [mode, setMode] = useState<AuthMode>(() => authModeFromParam(searchParams?.get('mode')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const hintId = useId();

  const returnUrl = safeInternalPath(
    searchParams?.get('returnUrl'),
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  );
  const callbackErrorKey = CALLBACK_ERRORS[searchParams?.get('error') ?? ''];
  const busy = pending !== null;

  // The form's own error wins: it describes what the user just tried, which is
  // more recent and more useful than why an earlier callback failed.
  const shownError = error ?? (callbackErrorKey ? t(callbackErrorKey) : null);

  function switchMode(next: AuthMode) {
    setMode(next);
    // Errors describe the attempt that produced them, not the form. Carrying
    // "that email and password do not match" across into the sign-up panel
    // would be nonsense.
    setError(null);
  }

  function validate(): string | null {
    if (!z.string().email().safeParse(email).success) {
      return t('app.auth.errorInvalidEmail');
    }
    if (mode === 'signup' && password.length < MIN_PASSWORD) {
      return t('app.auth.errorPasswordShort');
    }
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setPending('email');

    try {
      if (mode === 'signin') {
        trackEvent('login_attempt', { method: 'email' });
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        trackEvent('login_success', { method: 'email' });
        if (data.user) {
          identifyUser(data.user.id, {
            auth_method: 'email',
            last_login: new Date().toISOString(),
          });
        }
        router.push(returnUrl);
        router.refresh();
        return;
      }

      trackEvent('signup_attempt', { method: 'email' });
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) throw signUpError;

      // Supabase does not error when the address is already registered, to
      // avoid confirming to an attacker which addresses exist. It signals it
      // by returning a user with no identities instead.
      if (data.user && data.user.identities?.length === 0) {
        setError(t('app.auth.errorAccountExists'));
        return;
      }

      // No session means the project has email confirmation on, so the account
      // is not usable until the link is opened.
      if (!data.session) {
        setConfirmationSentTo(email);
        return;
      }

      trackEvent('signup_success', { method: 'email' });
      router.push(returnUrl);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown error';
      // Analytics never receives the address or the password. The old form
      // sent `email` on every failed login, which put user identifiers into a
      // third-party error stream for no diagnostic benefit.
      trackError('auth_error', mode === 'signin' ? 'Email login failed' : 'Email signup failed', {
        mode,
        error_message: message,
      });
      setError(
        mode === 'signin' ? t('app.auth.errorBadCredentials') : t('app.auth.errorGeneric')
      );
    } finally {
      setPending(null);
    }
  }

  async function onOAuth(provider: 'google' | 'apple') {
    if (busy) return;
    setError(null);
    setPending(provider);

    try {
      trackEvent('login_attempt', { method: provider });
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
        },
      });
      if (oauthError) throw oauthError;
      // Success redirects away, so nothing after this runs. `pending` is left
      // set on purpose: clearing it would flash the button back to its idle
      // label during the navigation.
    } catch (caught) {
      trackError('auth_error', `${provider} login failed`, {
        provider,
        error_message: caught instanceof Error ? caught.message : 'Unknown error',
      });
      // The old form logged this to the console and showed the user nothing,
      // so an unconfigured provider looked like a dead button.
      setError(
        t('app.auth.errorProvider', {
          provider: provider === 'google' ? 'Google' : 'Apple',
        })
      );
      setPending(null);
    }
  }

  if (confirmationSentTo) {
    return (
      <div className="border border-rule bg-paper p-8">
        <h2 className="text-title text-ink">{t('app.auth.checkEmailTitle')}</h2>
        <p className="mt-3 text-body text-ink-soft">
          {t('app.auth.checkEmailBody', { email: confirmationSentTo })}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-paper">
      {/* Mode switch. Two buttons rather than a tab widget: there is one form
          underneath, and duplicating the fields into two panels (as the
          previous version did) meant both panels shared a single form state
          while pretending to be independent. */}
      <div className="grid grid-cols-2">
        {(['signin', 'signup'] as const).map((value) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => switchMode(value)}
              className={cn(
                'label border-b-2 px-4 py-4 transition-colors',
                active
                  ? 'border-oxide text-ink'
                  : 'border-rule text-ink-soft hover:text-ink'
              )}
            >
              {value === 'signin' ? t('app.auth.signIn') : t('app.auth.createAccount')}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-8" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={emailId} className="label text-ink-soft">
            {t('app.auth.email')}
          </label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errorId : undefined}
            className="h-11 bg-paper text-body focus-visible:border-oxide"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={passwordId} className="label text-ink-soft">
            {t('app.auth.password')}
          </label>
          <Input
            id={passwordId}
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={cn(mode === 'signup' && hintId, shownError && errorId) || undefined}
            className="h-11 bg-paper text-body focus-visible:border-oxide"
          />
          {mode === 'signup' ? (
            <p id={hintId} className="label text-ink-soft">
              {t('app.auth.passwordHintNew')}
            </p>
          ) : null}
        </div>

        {/* Errors are inline and in label type per DESIGN.md, never colour
            alone. role="alert" so a screen reader hears the failure without
            having to go looking for it. */}
        {shownError ? (
          <p id={errorId} role="alert" className="label text-oxide">
            {shownError}
          </p>
        ) : null}

        {/* `bg-primary text-primary-foreground`, not `bg-oxide-deep
            text-paper`. Paper is the *ground* token and inverts with the
            theme, so hardcoding it put an oklch(0.18) label on an oklch(0.50)
            fill in dark mode: about 3:1, below AA. The semantic pair resolves
            to paper on light and ink on dark, staying legible in both.

            Hover shifts to ink per DESIGN.md, and flips the label to paper so
            the pairing survives the inversion too: light gives dark-on-light,
            dark gives light-on-dark. */}
        <Button
          type="submit"
          disabled={busy}
          className="label h-12 w-full bg-primary text-primary-foreground hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          {pending === 'email'
            ? mode === 'signin'
              ? t('app.auth.submittingSignIn')
              : t('app.auth.submittingSignUp')
            : mode === 'signin'
              ? t('app.auth.submitSignIn')
              : t('app.auth.submitSignUp')}
        </Button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-rule" />
          <span className="label text-ink-soft">{t('app.auth.dividerOr')}</span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOAuth('google')}
            className="label h-12 w-full border-rule-strong bg-paper text-ink hover:bg-paper-shade hover:text-ink disabled:opacity-60"
          >
            {t('app.auth.continueWithGoogle')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOAuth('apple')}
            className="label h-12 w-full border-rule-strong bg-paper text-ink hover:bg-paper-shade hover:text-ink disabled:opacity-60"
          >
            {t('app.auth.continueWithApple')}
          </Button>
        </div>
      </form>
    </div>
  );
}

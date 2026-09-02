'use client';

import { useId, useState, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations, locales } from '@goalspace/i18n';

import { updateAccountSettingsAction } from '@/app/(workspace)/actions';
import { THEMES, parseTheme, type ThemePreference } from '@/lib/settings/preference-cookies';
import type { UserSettings } from '@/lib/db/user-settings';

/**
 * Theme, language, time zone and email notifications — the account-wide
 * preferences that outlive any one project.
 *
 * Follows `projects/[slug]/settings/project-form.tsx`: `useTransition`,
 * `ActionResult` handling, a `try/catch` around the action for a rejected
 * (not merely failed) server action, and field errors rendered beside their
 * control.
 *
 * The time zone options come from `timeZones`, built on the server in
 * `page.tsx` — see that file's comment for why this component never calls
 * `Intl.supportedValuesOf` itself. Those options are raw IANA identifiers
 * (`Asia/Kuala_Lumpur`, `Europe/London`) and are rendered as-is: they are not
 * translated strings, only the field's label is.
 */
export function AccountForm({
  settings,
  timeZones,
}: {
  settings: UserSettings;
  timeZones: string[];
}) {
  const { t } = useAppTranslations();
  const { setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  // `theme` is `string` in the generated row type; `parseTheme` is the single
  // place that knows how to fall back if it is ever something else, rather
  // than an unchecked cast repeating that logic.
  const [theme, setThemeValue] = useState<ThemePreference>(parseTheme(settings.theme));
  const [locale, setLocale] = useState(settings.locale);
  const [timeZone, setTimeZone] = useState(settings.time_zone);
  const [emailNotifications, setEmailNotifications] = useState(settings.email_notifications);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const messageId = useId();
  const timeZoneErrorId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await updateAccountSettingsAction({
          theme,
          locale,
          time_zone: timeZone,
          email_notifications: emailNotifications,
        });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }

        // Updates the current tab immediately; the action above is what
        // persists it to the column and the cookie for the next request and
        // the next device.
        setTheme(theme);
        setMessage('app.account.saved');
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="account-theme" className="label text-ink-soft">
            {t('app.account.themeLabel')}
          </label>
          <select
            id="account-theme"
            value={theme}
            onChange={(e) => setThemeValue(e.target.value as ThemePreference)}
            className="label border border-rule-strong bg-paper px-3 py-2 text-ink"
          >
            {THEMES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`app.account.theme.${choice}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="account-locale" className="label text-ink-soft">
            {t('app.account.languageLabel')}
          </label>
          <select
            id="account-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="label border border-rule-strong bg-paper px-3 py-2 text-ink"
          >
            {locales.map((choice) => (
              <option key={choice} value={choice}>
                {t(`app.account.localeNames.${choice}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="account-time-zone" className="label text-ink-soft">
          {t('app.account.timeZoneLabel')}
        </label>
        <select
          id="account-time-zone"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          aria-invalid={fieldErrors.time_zone ? true : undefined}
          aria-describedby={fieldErrors.time_zone ? timeZoneErrorId : undefined}
          className="label w-full max-w-md border border-rule-strong bg-paper px-3 py-2 text-ink"
        >
          {/* Raw IANA identifiers, not translated strings — see this file's
              top comment and page.tsx. */}
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {fieldErrors.time_zone ? (
          <p id={timeZoneErrorId} role="alert" className="label text-oxide">
            {fieldErrors.time_zone.map((key) => t(key)).join(' ')}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
        />
        <span className="label text-ink-soft">{t('app.account.emailNotificationsLabel')}</span>
      </label>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.account.saving' : 'app.account.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : 'status'}
            className={cn('label min-w-0 flex-1', failed ? 'text-oxide' : 'text-ink-soft')}
          >
            {t(message)}
          </p>
        ) : null}
      </div>
    </form>
  );
}

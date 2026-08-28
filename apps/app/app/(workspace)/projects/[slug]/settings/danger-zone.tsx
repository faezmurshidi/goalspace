'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { deleteProjectAction } from '@/app/(workspace)/actions';

/**
 * The one irreversible action in the product. Deleting a project cascades to
 * every entry, work item, document, revision, agent, run, tool call,
 * proposal, and usage row it owns. There is no undo and no soft-delete, and
 * Storage objects do not cascade with it — only their rows do, which is why
 * `app.settings.deleteExplain` never claims uploaded files are removed.
 *
 * The typed-slug match below only gates the client's submit button; it is a
 * convenience, not the control. `deleteProjectAction` re-checks `confirmSlug`
 * server-side against the slug-resolved project, and that is what actually
 * stops a stray click. Neither check substitutes for the other, so both stay.
 *
 * No `confirm()`: a native dialog blocks the page and the spec calls for the
 * slug to be typed, not for a modal.
 */
export function DangerZone({ slug }: { slug: string }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [confirmSlug, setConfirmSlug] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const messageId = useId();
  const confirmInputId = useId();
  const confirmErrorId = useId();

  // Trimmed to match `requiredText`, which trims server-side: an untrimmed
  // comparison here would leave the button disabled on a trailing space with
  // no visible reason, while the server would have accepted it.
  const matches = confirmSlug.trim().length > 0 && confirmSlug.trim() === slug;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // Belt for a button that should already be disabled: the client match is
    // a convenience, so it is worth refusing to submit even if that state was
    // bypassed, rather than leaning entirely on the server check.
    if (!matches) return;

    setMessage(null);
    setFailed(false);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await deleteProjectAction(slug, { confirmSlug });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        // The project no longer exists, so staying on its settings page
        // would render a 404 nobody asked for.
        router.push('/');
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label border-b border-rule pb-2 text-ink-soft">
        {t('app.settings.dangerZone')}
      </h2>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="max-w-[65ch] text-body text-ink-soft">{t('app.settings.deleteExplain')}</p>

        <div className="flex flex-col gap-1">
          <label htmlFor={confirmInputId} className="label text-ink-soft">
            {t('app.settings.deleteConfirmLabel')}
          </label>
          <input
            id={confirmInputId}
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            autoComplete="off"
            aria-invalid={fieldErrors.confirmSlug ? true : undefined}
            aria-describedby={
              fieldErrors.confirmSlug ? confirmErrorId : failed ? messageId : undefined
            }
            className="w-full max-w-sm border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
          />
          {fieldErrors.confirmSlug ? (
            <p id={confirmErrorId} role="alert" className="label text-oxide">
              {fieldErrors.confirmSlug.map((key) => t(key)).join(' ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* This is the single most severe control in the product, and what
              marks it as such is not a colour — `bg-oxide-deep` here resolves
              to the exact same paint as the Save buttons on this page, since
              `--primary` is `--oxide-deep` and both `--primary-foreground`
              and `--destructive-foreground` share the same paper/ink
              inversion. The palette has no colour reserved for danger; this
              system separates by rule and ground, never by a new hue or a
              shadow. So the distinction is everything else: the heading
              above, the explanatory copy, the typed-slug gate that keeps the
              button disabled until it matches, and a hairline
              `border-rule-strong` around the control itself. */}
          <Button
            type="submit"
            disabled={!matches || pending}
            className="label shrink-0 rounded-none border border-rule-strong bg-oxide-deep text-destructive-foreground hover:bg-ink hover:text-paper disabled:opacity-60"
          >
            {t(pending ? 'app.settings.deleting' : 'app.settings.delete')}
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
    </section>
  );
}

'use client';

import { useState } from 'react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';

import { askPartnerAbout } from '@/lib/chat/ask-about';
import { changeStatusAction } from '@/app/(workspace)/actions';

type Mode = null | 'unblock' | 'snooze';

/**
 * The answers to the question a woken row is asking.
 *
 * A blocked item whose wake date has arrived is asking "is this still
 * blocked?", and that has more than one honest answer — unlike an open task,
 * which mostly wants finishing. The two commonest are here: it is unblocked, or
 * it is still blocked and should ask again later.
 *
 * Finished and dropped are deliberately absent. They are real answers and much
 * rarer, and the title still goes to the work tree for them. Six waiting rows
 * each carrying a full status control would make the quietest region of the
 * page the busiest.
 */
export function WaitingActions({
  slug,
  itemId,
  title,
}: {
  slug: string;
  itemId: string;
  title: string;
}) {
  const { t } = useAppTranslations();
  const [mode, setMode] = useState<Mode>(null);
  const [body, setBody] = useState('');
  const [wakeAt, setWakeAt] = useState(defaultSnooze());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result =
      mode === 'unblock'
        ? await changeStatusAction(slug, {
            id: itemId,
            status: 'open',
            // Recordable now. Why something stopped being blocked is the part
            // worth having in a year — "the flange arrived, six weeks late" —
            // and until statusEntryBody widened, it had nowhere to go.
            ...(body.trim() ? { statusEntryBody: body.trim() } : {}),
          })
        : await changeStatusAction(slug, {
            id: itemId,
            status: 'blocked',
            wake_at: new Date(`${wakeAt}T09:00:00`).toISOString(),
          });

    setBusy(false);
    if (result.ok) {
      setMode(null);
      setBody('');
    } else {
      // The text stays on failure, as everywhere else in this product.
      setError(t(result.message));
    }
  }

  if (mode === null) {
    return (
      <span className="flex shrink-0 gap-3">
        <button
          type="button"
          onClick={() => setMode('unblock')}
          className="label text-ink-soft hover:text-ink underline underline-offset-2"
        >
          {t('app.resume.unblock')}
        </button>
        <button
          type="button"
          onClick={() => setMode('snooze')}
          className="label text-ink-soft hover:text-ink underline underline-offset-2"
        >
          {t('app.resume.snooze')}
        </button>
        <button
          type="button"
          onClick={() => askPartnerAbout(t('app.resume.blockedDraft', { title }))}
          className="label text-ink-soft hover:text-ink underline underline-offset-2"
        >
          {t('app.resume.brainstorm')}
        </button>
      </span>
    );
  }

  return (
    <div className="w-full pb-3">
      {mode === 'unblock' ? (
        <Textarea
          autoFocus
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('app.resume.unblockPlaceholder')}
          aria-label={t('app.resume.unblock')}
          className="border-input bg-paper text-body text-ink"
        />
      ) : (
        <label className="label text-ink-soft flex flex-wrap items-center gap-3">
          {t('app.resume.snoozeUntil')}
          <input
            autoFocus
            type="date"
            value={wakeAt}
            onChange={(event) => setWakeAt(event.target.value)}
            className="label border-input bg-paper text-ink h-9 border px-2"
          />
        </label>
      )}

      {error ? (
        <p role="alert" className="label text-oxide mt-2">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={submit}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-9 px-4 disabled:opacity-60"
        >
          {mode === 'unblock' ? t('app.resume.unblockSubmit') : t('app.resume.snoozeSubmit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setMode(null);
            setError(null);
          }}
          className="label border-rule text-ink-soft h-9 px-4"
        >
          {t('app.resume.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * A week out, as the date input wants it.
 *
 * A default rather than a set of presets: "a week" is the common case and any
 * other interval is a guess about someone else's supplier. The input takes a
 * real date, so a six-week lead time is as easy to say as a week.
 */
function defaultSnooze(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

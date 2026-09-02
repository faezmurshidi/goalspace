'use client';

import { useState } from 'react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';

import { askPartnerAbout } from '@/lib/chat/ask-about';
import { changeStatusAction } from '@/app/(workspace)/actions';

/**
 * The act a row invites, offered where the row is.
 *
 * The resume view used to link every open item to the work tab, which is four
 * steps and two tabs away from the thing you almost always want on re-entry:
 * you now know the answer, and want it written down. The mechanism was already
 * here — closing an item with an entry writes `closed_by_entry_id`, tying the
 * closure to the log entry that caused it — and only the affordance was
 * missing.
 *
 * Always visible rather than revealed on hover. A hover-only control is
 * invisible to touch and to the keyboard, and the complaint this answers is
 * that the path was undiscoverable; hiding the fix behind a hover would repeat
 * the mistake in a quieter way.
 *
 * A question is answered and a task is finished. Same mechanism, different
 * verb, because they are different acts and the label should say which.
 */
export function RowActions({
  slug,
  itemId,
  title,
  isQuestion,
}: {
  slug: string;
  itemId: string;
  title: string;
  isQuestion: boolean;
}) {
  const { t } = useAppTranslations();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await changeStatusAction(slug, {
      id: itemId,
      status: 'done',
      // Optional on purpose, as in the work tree: requiring a note would turn
      // every closure into a writing task, and the predictable result is that
      // people stop closing things at all.
      ...(body.trim() ? { closingEntryBody: body.trim() } : {}),
    });

    setBusy(false);
    if (result.ok) {
      setOpen(false);
      setBody('');
    } else {
      // The text stays in the box on failure. Losing what was typed is the
      // worst failure this product has.
      setError(t(result.message));
    }
  }

  if (!open) {
    return (
      <span className="flex shrink-0 gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label text-ink-soft hover:text-ink underline underline-offset-2"
        >
          {isQuestion ? t('app.resume.answer') : t('app.resume.finish')}
        </button>
        {/* Both kinds, different verbs. A question wants an answer; an open
            task wants thinking through — how to approach it, what it depends
            on, whether it should be broken up. Same mechanism, and the verb is
            what tells the owner which conversation they are starting. */}
        <button
          type="button"
          onClick={() =>
            askPartnerAbout(
              isQuestion
                ? t('app.resume.askDraft', { title })
                : t('app.resume.brainstormDraft', { title })
            )
          }
          className="label text-ink-soft hover:text-ink underline underline-offset-2"
        >
          {isQuestion ? t('app.resume.askAbout') : t('app.resume.brainstorm')}
        </button>
      </span>
    );
  }

  return (
    <div className="w-full pb-3">
      <Textarea
        autoFocus
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={
          isQuestion ? t('app.resume.answerPlaceholder') : t('app.resume.finishPlaceholder')
        }
        aria-label={isQuestion ? t('app.resume.answer') : t('app.resume.finish')}
        className="border-input bg-paper text-body text-ink"
      />

      {error ? (
        <p role="alert" className="label text-oxide mt-2">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={close}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-9 px-4 disabled:opacity-60"
        >
          {isQuestion ? t('app.resume.answerSubmit') : t('app.resume.finishSubmit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setOpen(false);
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

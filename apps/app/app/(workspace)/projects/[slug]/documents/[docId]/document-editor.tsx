'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, cn } from '@goalspace/ui';

import { Markdown } from '@/components/docs/markdown';
import type { Document } from '@/lib/db/documents';
import { updateDocumentAction } from '@/app/(workspace)/actions';

/**
 * Every save is a compare-and-set against the version this editor loaded.
 *
 * Holding the version in state rather than re-reading it is the point: if an
 * accepted proposal or another tab moved the document while this one sat open,
 * the save is refused and the person is told, instead of their view of the
 * document silently replacing someone else's work.
 */
export function DocumentEditor({ slug, document }: { slug: string; document: Document }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [version, setVersion] = useState(document.updated_at);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Only the conflict failure gets an escape hatch: without it, the held
  // `version` never updates, so every later save would repeat the exact same
  // refusal and the person has no way out short of a hard reload.
  const [conflict, setConflict] = useState(false);
  // Which half of the body field is showing. Preview renders the current
  // draft, not the saved body, so it shows what a save would store.
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const messageId = useId();

  function save(overwrite: boolean) {
    setMessage(null);
    setFailed(false);

    startTransition(async () => {
      try {
        const result = await updateDocumentAction(
          slug,
          { id: document.id, title, body },
          version,
          overwrite
        );

        if (!result.ok) {
          // The fields are deliberately left alone. Unsaved text is the most
          // valuable thing on this screen and a failed save must not cost it.
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          setConflict(result.message === 'app.documents.conflict');
          return;
        }

        // Adopt the new version so a second save from this same open editor is
        // not treated as stale.
        setVersion(result.data.updatedAt);
        setMessage('app.documents.saved');
        setConflict(false);
        router.refresh();
      } catch {
        setFailed(true);
        setMessage('app.errors.generic');
        setConflict(false);
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="document-title" className="label text-ink-soft">
          {t('app.documents.titleLabel')}
        </label>
        <input
          id="document-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-describedby={failed ? messageId : undefined}
          className="border-rule-strong bg-paper text-title text-ink border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <label htmlFor="document-body" className="label text-ink-soft">
            {t('app.documents.bodyLabel')}
          </label>
          {/* Toggle buttons with aria-pressed rather than role="tab". They look
              like tabs, but the tab role carries an arrow-key contract from the
              APG, and a half-implemented one is worse for a keyboard user than
              a pattern that promises less and keeps its promise. */}
          <div className="flex" role="group" aria-label={t('app.documents.bodyLabel')}>
            {(['write', 'preview'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'label border-rule border px-3 py-1 transition-colors',
                  value === 'preview' && '-ml-px',
                  mode === value
                    ? 'border-rule-strong bg-paper-shade text-ink'
                    : 'bg-paper text-ink-soft hover:text-ink'
                )}
              >
                {t(`app.documents.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Both panels stay mounted and one is `hidden`, rather than swapping
            which is rendered. Unmounting the textarea would discard the
            browser's native undo stack for it, so a preview-and-back would
            silently cost the writer every ctrl-Z they had. */}
        <textarea
          id="document-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={20}
          hidden={mode !== 'write'}
          aria-describedby={failed ? messageId : undefined}
          className="border-rule-strong bg-paper text-body text-ink w-full max-w-[70ch] border p-3"
        />

        {/* Contents are gated on the mode, not just hidden. `hidden` stops the
            browser painting a subtree but not React rendering it, so without
            the gate every keystroke in write mode re-parsed the whole draft
            through remark and rehype to build a tree nobody could see — a cost
            that grows with the length of the document.

            The min-height is what keeps the Save button still: this panel when
            visible is as tall as the textarea it replaces. 20 rows x 0.9375rem
            x 1.55 line-height, plus p-3 either side, is a shade over 30rem. */}
        <div
          hidden={mode !== 'preview'}
          className="border-rule-strong bg-paper min-h-[30.5rem] w-full max-w-[70ch] border p-3"
        >
          {mode === 'preview' &&
            (body.trim() ? (
              <Markdown>{body}</Markdown>
            ) : (
              <p className="text-ink-soft">{t('app.documents.previewEmpty')}</p>
            ))}
        </div>
      </div>

      {/* Wraps because in the conflict state this row carries three things —
          Save, the explanation, and Overwrite. On a phone they do not fit on
          one line, and unwrapped the Overwrite button rendered off the right
          edge of the viewport: the one control that escapes a conflict was
          the one you could not reach. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.documents.saving' : 'app.documents.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : undefined}
            className={cn('label min-w-0 flex-1', failed ? 'text-oxide' : 'text-ink-soft')}
          >
            {t(message)}
          </p>
        ) : null}
        {conflict ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => save(true)}
            className="label shrink-0 rounded-none"
          >
            {t('app.documents.overwrite')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

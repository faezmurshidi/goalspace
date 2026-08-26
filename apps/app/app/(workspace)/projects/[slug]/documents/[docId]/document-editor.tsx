'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { updateDocumentAction } from '@/app/(workspace)/actions';
import type { Document } from '@/lib/db/documents';

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
          className="border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="document-body" className="label text-ink-soft">
          {t('app.documents.bodyLabel')}
        </label>
        <textarea
          id="document-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={20}
          aria-describedby={failed ? messageId : undefined}
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} className="label rounded-none">
          {t(pending ? 'app.documents.saving' : 'app.documents.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : undefined}
            className={cn('label', failed ? 'text-oxide' : 'text-ink-soft')}
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
            className="label rounded-none"
          >
            {t('app.documents.overwrite')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

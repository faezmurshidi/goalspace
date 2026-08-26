'use client';

import { useState, useTransition } from 'react';
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);

    startTransition(async () => {
      try {
        const result = await updateDocumentAction(slug, { id: document.id, title, body }, version);

        if (!result.ok) {
          // The fields are deliberately left alone. Unsaved text is the most
          // valuable thing on this screen and a failed save must not cost it.
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          return;
        }

        // Adopt the new version so a second save from this same open editor is
        // not treated as stale.
        setVersion(result.data.updatedAt);
        setMessage('app.documents.saved');
        router.refresh();
      } catch {
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
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
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} className="label rounded-none">
          {t(pending ? 'app.documents.saving' : 'app.documents.save')}
        </Button>
        {message ? (
          <span className={cn('label', failed ? 'text-danger' : 'text-ink-soft')}>
            {t(message)}
          </span>
        ) : null}
      </div>
    </form>
  );
}

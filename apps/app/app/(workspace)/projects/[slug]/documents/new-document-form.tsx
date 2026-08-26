'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { createDocumentAction } from '@/app/(workspace)/actions';

/**
 * Creating a document is one field, not a form page.
 *
 * A document earns its content by being written in; asking for a body up front
 * would put a blank page between the person and the thing they came to write.
 */
export function NewDocumentForm({ slug }: { slug: string }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await createDocumentAction(slug, { title, body: '' });
        if (!result.ok) {
          setError(result.message ?? 'app.errors.generic');
          return;
        }
        setTitle('');
        router.push(`/projects/${slug}/documents/${result.data.id}`);
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setError('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 items-center gap-2">
      <label htmlFor="new-document-title" className="sr-only">
        {t('app.documents.titleLabel')}
      </label>
      <input
        id="new-document-title"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('app.documents.new')}
        aria-describedby={error ? errorId : undefined}
        // min-w-0 so the input can shrink inside the flex row rather than
        // holding its intrinsic size and pushing the button off-screen.
        className="label min-w-0 flex-1 border border-rule bg-paper px-3 py-1.5 text-ink placeholder:text-ink-soft"
      />
      <Button
        type="submit"
        disabled={pending || !title.trim()}
        className="label shrink-0 rounded-none"
      >
        {t(pending ? 'app.documents.saving' : 'app.documents.new')}
      </Button>
      {error ? (
        <p id={errorId} role="alert" className="label text-oxide">
          {t(error)}
        </p>
      ) : null}
    </form>
  );
}

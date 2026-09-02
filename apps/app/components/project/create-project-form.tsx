'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Input, Textarea } from '@goalspace/ui';

import { projectKinds, type ProjectKind } from '@/lib/schemas/common';
import { createProjectAction } from '@/app/(workspace)/actions';

export function CreateProjectForm() {
  const { t } = useAppTranslations();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [kind, setKind] = useState<ProjectKind>('build');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const titleId = useId();
  const titleErrorId = useId();
  const briefId = useId();
  const kindId = useId();
  const errorId = useId();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setFieldErrors({});

    const result = await createProjectAction({ title, brief, kind });

    if (!result.ok) {
      setBusy(false);
      setError(t(result.message));
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    // Deliberately not clearing `busy` on success: the navigation below
    // replaces this screen, and re-enabling the button first lets an
    // impatient second click create a duplicate project.
    router.push(`/projects/${result.data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="border-rule bg-paper border p-8">
      <div className="flex flex-col gap-2">
        <label htmlFor={titleId} className="label text-ink-soft">
          {t('app.create.titleLabel')}
        </label>
        <Input
          id={titleId}
          autoFocus
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('app.create.titlePlaceholder')}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? titleErrorId : error ? errorId : undefined}
          className="bg-paper text-body text-ink placeholder:text-ink-soft h-11"
        />
        {/* Stored but never shown previously, so a per-field failure (a title
            over 120 characters, say) surfaced only as the generic message and
            the user could not tell which field to correct. */}
        {fieldErrors.title ? (
          <p id={titleErrorId} role="alert" className="label text-oxide">
            {fieldErrors.title.map((key) => t(key)).join(' ')}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor={kindId} className="label text-ink-soft">
          {t('app.create.kindLabel')}
        </label>
        <select
          id={kindId}
          value={kind}
          onChange={(event) => setKind(event.target.value as ProjectKind)}
          className="label border-input bg-paper text-ink h-11 border px-3"
        >
          {projectKinds.map((value) => (
            <option key={value} value={value}>
              {t(`app.project.kind${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor={briefId} className="label text-ink-soft">
          {t('app.create.briefLabel')}
        </label>
        <Textarea
          id={briefId}
          rows={3}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder={t('app.create.briefPlaceholder')}
          className="bg-paper text-body text-ink placeholder:text-ink-soft"
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="label text-oxide mt-6">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy || title.trim().length === 0}
        className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-8 h-12 w-full disabled:opacity-60"
      >
        {busy ? t('app.create.submitting') : t('app.create.submit')}
      </Button>
    </form>
  );
}

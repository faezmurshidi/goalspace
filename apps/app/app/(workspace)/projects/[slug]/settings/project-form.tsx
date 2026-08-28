'use client';

import { useId, useState, useTransition } from 'react';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { updateProjectAction } from '@/app/(workspace)/actions';
import { projectStatuses, type ProjectStatus } from '@/lib/schemas/common';
import type { Project } from '@/lib/db/projects';

/**
 * Title, brief and status — the fields that describe what the project is and
 * whether it is still open. Follows the pattern in
 * `agents/[agentId]/agent-editor.tsx`: `useTransition`, `ActionResult`
 * handling, a `try/catch` around the action for a rejected (not merely
 * failed) server action, and field errors rendered beside their control.
 */
export function ProjectForm({ slug, project }: { slug: string; project: Project }) {
  const { t } = useAppTranslations();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(project.title);
  const [brief, setBrief] = useState(project.brief ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const messageId = useId();
  const titleErrorId = useId();
  const briefErrorId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await updateProjectAction(slug, {
          id: project.id,
          title,
          brief,
          status,
        });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setMessage('app.settings.saved');
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
      <div className="flex flex-col gap-1">
        <label htmlFor="project-title" className="label text-ink-soft">
          {t('app.settings.titleLabel')}
        </label>
        <input
          id="project-title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={
            fieldErrors.title ? titleErrorId : failed ? messageId : undefined
          }
          className="border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
        />
        {fieldErrors.title ? (
          <p id={titleErrorId} role="alert" className="label text-oxide">
            {fieldErrors.title.map((key) => t(key)).join(' ')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="project-brief" className="label text-ink-soft">
          {t('app.settings.briefLabel')}
        </label>
        <textarea
          id="project-brief"
          rows={6}
          maxLength={2000}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          aria-invalid={fieldErrors.brief ? true : undefined}
          aria-describedby={fieldErrors.brief ? briefErrorId : undefined}
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
        {fieldErrors.brief ? (
          <p id={briefErrorId} role="alert" className="label text-oxide">
            {fieldErrors.brief.map((key) => t(key)).join(' ')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="project-status" className="label text-ink-soft">
            {t('app.settings.statusLabel')}
          </label>
          <select
            id="project-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="label border border-rule-strong bg-paper px-3 py-2 text-ink"
          >
            {projectStatuses.map((choice) => (
              <option key={choice} value={choice}>
                {t(`app.settings.status.${choice}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.settings.saving' : 'app.settings.save')}
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

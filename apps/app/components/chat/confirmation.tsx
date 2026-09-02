'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Button } from '@goalspace/ui';

import type { PendingEntry } from '@/lib/chat/approvals';

/**
 * The Partner asking before it writes.
 *
 * Shaped after AI SDK Elements' Confirmation, built on packages/ui rather than
 * vendored: the upstream component renders an alert-styled card with icons, and
 * this has to read as a page of the record with a question on it. Same
 * mechanism — `approval-requested` in, `addToolApprovalResponse` out.
 *
 * The whole payload is shown, not summarised. The point of the approval is that
 * the owner reads what will land; a truncated preview would return them to
 * trusting the agent's account of it, which is what this replaced.
 */
export function EntryConfirmation({
  entry,
  onDecide,
  busy,
}: {
  entry: PendingEntry;
  onDecide: (approved: boolean) => void;
  busy: boolean;
}) {
  const { t } = useAppTranslations();

  return (
    <div className="border-rule bg-paper-shade mt-3 border p-4">
      <p className="label text-ink-soft">
        {t('app.chat.confirmTitle', { kind: t(`app.entryKind.${entry.kind}`) })}
      </p>

      {entry.title ? <p className="text-title text-ink mt-2">{entry.title}</p> : null}
      <p className="prose-measure text-ink mt-1 whitespace-pre-line">{entry.body}</p>

      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={() => onDecide(true)}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-9 px-4 disabled:opacity-60"
        >
          {t('app.chat.confirmAccept')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onDecide(false)}
          className="label border-rule text-ink-soft h-9 px-4 disabled:opacity-60"
        >
          {t('app.chat.confirmReject')}
        </Button>
      </div>
    </div>
  );
}

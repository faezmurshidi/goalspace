'use client';

import { useState, useTransition } from 'react';
import { Button } from '@goalspace/ui';

import { useAppTranslations } from '@goalspace/i18n';
import { acceptProposalAction, rejectProposalAction } from '@/app/(workspace)/actions';
import type { Proposal } from '@/lib/db/proposals';

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { t } = useAppTranslations();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  // The payload is rendered as JSON rather than as a per-kind form. Three more
  // components for a surface whose job is review rather than authoring is a
  // poor trade, and the payload validates against the same schema either way,
  // so a bad edit is refused rather than stored.
  const asText = JSON.stringify(proposal.payload, null, 2);

  function decide(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setError(result.message ?? 'app.errors.generic');
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // network drop. Without this the transition ends silently and the card
        // looks like nothing was clicked.
        setError('app.errors.generic');
      }
    });
  }

  function accept() {
    if (draft === null) {
      decide(() => acceptProposalAction({ proposalId: proposal.id }));
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      // Caught here rather than sent to the server: a JSON syntax error is not
      // a validation failure, and reporting it as one would be misleading.
      setError('app.inbox.malformedEdit');
      return;
    }
    decide(() => acceptProposalAction({ proposalId: proposal.id, payloadOverride: parsed }));
  }

  return (
    <article className="flex flex-col gap-3 border border-rule p-4">
      {/* Rationale first: it is what the owner reads to decide. */}
      <p>{proposal.rationale}</p>

      {draft === null ? (
        <pre className="overflow-x-auto bg-paper-shade p-3 text-sm">{asText}</pre>
      ) : (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={12}
          aria-label={t('app.inbox.editorLabel')}
          className="w-full border border-rule-strong bg-paper p-3 font-mono text-sm"
        />
      )}

      {proposal.citations.length > 0 ? (
        <p className="text-sm text-ink-soft">
          {t('app.inbox.citations')}:{' '}
          {proposal.citations
            .map((citation) => `${citation.type} ${citation.id.slice(0, 8)}`)
            .join(', ')}
        </p>
      ) : null}

      {error ? <p className="text-sm text-danger">{t(error)}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={accept}>
          {t('app.inbox.accept')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setDraft(draft === null ? asText : null)}
        >
          {t(draft === null ? 'app.inbox.edit' : 'app.inbox.cancelEdit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => decide(() => rejectProposalAction(proposal.id))}
        >
          {t('app.inbox.reject')}
        </Button>
      </div>
    </article>
  );
}

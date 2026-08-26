'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { restoreRevisionAction } from '@/app/(workspace)/actions';

/**
 * Restoring is an ordinary edit whose body is the old body.
 *
 * The current body becomes a revision in turn, so this is reversible by doing
 * it again — which is why it needs no confirmation beyond the body being
 * visible on the page that offers it.
 */
export function RestoreButton({
  slug,
  documentId,
  revisionId,
  expectedUpdatedAt,
}: {
  slug: string;
  documentId: string;
  revisionId: string;
  /** The document's version as this page loaded it; the restore is refused if it moved. */
  expectedUpdatedAt: string;
}) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await restoreRevisionAction(
          slug,
          documentId,
          revisionId,
          expectedUpdatedAt
        );
        if (!result.ok) {
          setError(result.message ?? 'app.errors.generic');
          return;
        }
        router.push(`/projects/${slug}/documents/${documentId}`);
      } catch {
        setError('app.errors.generic');
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Button type="button" onClick={restore} disabled={pending} className="label rounded-none">
        {t('app.documents.restore')}
      </Button>
      {/* role="alert" so a failure is announced, not just shown. `text-oxide`
          because this repo defines no `danger` token — `text-danger` compiles
          to nothing and renders in the inherited body colour. */}
      {error ? (
        <p role="alert" className="label text-oxide">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

/**
 * Error boundary for every workspace surface.
 *
 * Placed on the group rather than per route so a page added later is covered
 * by default. It sits inside the chrome, so the nav and the project switcher
 * stay usable: a failed query on one screen should not strand someone in a
 * dead end with only a browser back button.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useAppTranslations();

  useEffect(() => {
    // The digest is the only handle on the server-side stack in production,
    // where the message itself is redacted.
    console.error('Workspace render failed', { digest: error.digest, error });
  }, [error]);

  return (
    <div className="max-w-xl py-16">
      <h1 className="wdth-wide text-headline font-bold text-ink">{t('app.error.title')}</h1>
      {/* Says plainly that nothing was lost. The product's whole promise is
          that the record survives, so an error screen that stays silent about
          it invites exactly the wrong conclusion. */}
      <p className="prose-measure mt-3 text-ink-soft">{t('app.error.body')}</p>

      <Button
        type="button"
        onClick={reset}
        className="label mt-8 h-12 bg-primary px-6 text-primary-foreground hover:bg-ink hover:text-paper"
      >
        {t('app.error.retry')}
      </Button>

      {error.digest ? (
        <p className="label mt-6 text-ink-soft">REF {error.digest}</p>
      ) : null}
    </div>
  );
}

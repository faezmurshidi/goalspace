'use client';

import { useEffect } from 'react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button } from '@goalspace/ui';

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
      <h1 className="wdth-wide text-headline text-ink font-bold">{t('app.error.title')}</h1>
      {/* Says plainly that nothing was lost. The product's whole promise is
          that the record survives, so an error screen that stays silent about
          it invites exactly the wrong conclusion. */}
      <p className="prose-measure text-ink-soft mt-3">{t('app.error.body')}</p>

      <Button
        type="button"
        onClick={reset}
        className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-8 h-12 px-6"
      >
        {t('app.error.retry')}
      </Button>

      {error.digest ? <p className="label text-ink-soft mt-6">REF {error.digest}</p> : null}
    </div>
  );
}

import Link from 'next/link';
import { getFixedT } from '@goalspace/i18n/server';

import { getLocale } from '@/lib/format';

/**
 * Reached when getProjectBySlug returns null, which covers both "no such
 * project" and "not yours" without distinguishing them: telling them apart
 * would confirm to a stranger that a given slug exists under someone else's
 * account.
 *
 * The copy states that nothing was deleted. For a product whose entire promise
 * is that the record persists, a bare 404 on a project URL reads like data
 * loss.
 */
export default async function ProjectNotFound() {
  const t = getFixedT(await getLocale());

  return (
    <div className="max-w-xl py-16">
      <h1 className="wdth-wide text-headline text-ink font-bold">{t('app.notFound.title')}</h1>
      <p className="prose-measure text-ink-soft mt-3">{t('app.notFound.body')}</p>

      <Link
        href="/"
        className="label border-rule-strong text-ink hover:bg-paper-shade mt-8 inline-block border px-6 py-3 transition-colors"
      >
        {t('app.notFound.back')}
      </Link>
    </div>
  );
}

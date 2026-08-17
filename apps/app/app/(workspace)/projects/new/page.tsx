import type { Metadata } from 'next';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getLocale } from '@/lib/format';
import { CreateProjectForm } from '@/components/project/create-project-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = getFixedT(await getLocale());
  return { title: t('app.create.title') };
}

/**
 * First run, and the only route reachable with no project.
 *
 * `/` redirects here when the user owns nothing yet, so this page has to exist
 * for the very first session to work at all. It is also reachable later from
 * the project switcher, which is why it does not assume it is a first run and
 * says nothing about "getting started".
 */
export default async function NewProjectPage() {
  await requireSessionContext();
  const t = getFixedT(await getLocale());

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="wdth-wide text-headline font-bold text-ink">{t('app.create.title')}</h1>
      <p className="prose-measure mb-8 mt-3 text-ink-soft">{t('app.create.body')}</p>
      <CreateProjectForm />
    </div>
  );
}

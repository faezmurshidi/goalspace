import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getLocale } from '@/lib/format';
import { IntakeWizard } from './intake-wizard';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = getFixedT(await getLocale());
  return { title: t('app.intake.title') };
}

/**
 * Reached once, from project creation, and never again on its own.
 *
 * There is no gate column and no redirect from the resume view: navigating
 * straight to /projects/[slug] always shows the record. A setup step that
 * outlived the moment would be the ceremony PRODUCT.md rules out, and would
 * punish the owner for having closed a tab.
 */
export default async function IntakePage({ params }: Params) {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();

  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <IntakeWizard slug={slug} />
    </div>
  );
}

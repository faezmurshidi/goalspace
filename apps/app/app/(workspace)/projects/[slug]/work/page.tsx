import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { WorkTree } from '@/components/work/work-tree';
import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listWorkItems } from '@/lib/db/work-items';
import { getLocale } from '@/lib/format';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.work.title')} · ${slug}` };
}

export default async function WorkPage({ params }: Params) {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();

  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const t = getFixedT(await getLocale());
  const items = await listWorkItems(supabase, project.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <h1 className="label text-ink-soft pb-2">{t('app.work.title')}</h1>
        <WorkTree slug={slug} items={items} />
      </div>
    </div>
  );
}

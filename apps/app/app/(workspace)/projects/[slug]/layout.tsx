import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { CaptureBar } from '@/components/capture/capture-bar';
import { requireSessionContext } from '@/lib/auth/session';
import { captureTargetsFrom } from '@/lib/capture/targets';
import { getProjectBySlug } from '@/lib/db/projects';
import { listWorkItems } from '@/lib/db/work-items';
import { getLocale } from '@/lib/format';

/**
 * Project scope. Capture is mounted here rather than on each page so that it
 * is present on Resume, Work, and Log alike, and so a half-typed entry is not
 * destroyed by navigating between them.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();

  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const workItems = await listWorkItems(supabase, project.id);
  const t = getFixedT(await getLocale());

  return (
    // The subtraction is the header rail: h-14 (3.5rem) plus its 1px bottom border.
    <div className="flex min-h-[calc(100svh-3.5rem-1px)] flex-col">
      <div className="flex-1">{children}</div>
      <section aria-label={t('app.capture.region')}>
        <CaptureBar slug={slug} targets={captureTargetsFrom(workItems)} />
      </section>
    </div>
  );
}

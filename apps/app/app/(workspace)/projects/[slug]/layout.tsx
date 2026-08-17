import { notFound } from 'next/navigation';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listWorkItems } from '@/lib/db/work-items';
import { CaptureBar } from '@/components/capture/capture-bar';
import { captureTargetsFrom } from '@/lib/capture/targets';

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

  return (
    <div className="flex min-h-[calc(100svh-3.25rem)] flex-col">
      <div className="flex-1">{children}</div>
      <CaptureBar slug={slug} targets={captureTargetsFrom(workItems)} />
    </div>
  );
}

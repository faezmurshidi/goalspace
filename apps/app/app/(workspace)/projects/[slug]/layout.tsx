import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { ProjectComposer } from '@/components/chat/project-composer';
import { requireSessionContext } from '@/lib/auth/session';
import { captureTargetsFrom } from '@/lib/capture/targets';
import { getOrCreateConversation, listMessages } from '@/lib/db/conversations';
import { getProjectBySlug } from '@/lib/db/projects';
import { listWorkItems } from '@/lib/db/work-items';
import { getLocale } from '@/lib/format';

/**
 * Project scope. The composer is mounted here rather than on each page so that
 * it is present on Resume, Work, and Log alike, and so a half-typed entry is
 * not destroyed by navigating between them.
 *
 * On the resume view it is the Partner chat; everywhere else it stays the
 * capture bar. See ProjectComposer for why that decision is made from the
 * pathname rather than passed down: a layout does not know its active child
 * route.
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

  const { data: partner } = await supabase
    .from('agents')
    .select('id, is_active')
    .eq('project_id', project.id)
    .eq('slug', 'partner')
    .maybeSingle();

  // Resolved server-side so a reload shows the stored transcript rather than an
  // empty conversation over the top of one. A project with no Partner —
  // deleted, or created before this shipped — gets the capture bar unchanged.
  const hasPartner = Boolean(partner?.is_active);
  const seed = hasPartner
    ? await listMessages(
        supabase,
        (
          await getOrCreateConversation(supabase, {
            projectId: project.id,
            ownerId: userId,
            agentId: partner!.id,
          })
        ).id
      )
    : [];

  return (
    // The subtraction is the header rail: h-14 (3.5rem) plus its 1px bottom border.
    <div className="flex min-h-[calc(100svh-3.5rem-1px)] flex-col">
      <div className="flex-1">{children}</div>
      <section aria-label={t('app.capture.region')}>
        <ProjectComposer
          slug={slug}
          targets={captureTargetsFrom(workItems)}
          hasPartner={hasPartner}
          initialMessages={seed.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        />
      </section>
    </div>
  );
}

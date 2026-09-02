import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getAgent } from '@/lib/db/agents';
import { getProjectBySlug } from '@/lib/db/projects';
import { listRunsForAgent } from '@/lib/db/runs';
import { formatDateTime, getLocale, getTimeZone } from '@/lib/format';
import { AgentEditor } from './agent-editor';

type Params = { params: Promise<{ slug: string; agentId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, agentId } = await params;
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  const agent = project ? await getAgent(supabase, project.id, agentId) : null;
  const t = getFixedT(await getLocale());
  return { title: `${agent?.name || t('app.agents.title')} · ${slug}` };
}

export default async function AgentPage({ params }: Params) {
  const { slug, agentId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const agent = await getAgent(supabase, project.id, agentId);
  if (!agent) notFound();

  const runs = await listRunsForAgent(supabase, agent.id);
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <AgentEditor slug={slug} agent={agent} />

        {/* A run is reached from the agent that produced it or the proposal it
            created, never browsed as a top-level list — hence no /runs index. */}
        <section className="pt-10">
          <h2 className="label border-rule text-ink-soft border-b pb-2">
            {t('app.agents.recentRuns')}
          </h2>

          {runs.length === 0 ? (
            <p className="text-ink-soft py-6">{t('app.agents.noRuns')}</p>
          ) : (
            <ul>
              {runs.map((run) => (
                <li key={run.id} className="border-rule border-b">
                  <Link
                    href={`/projects/${slug}/runs/${run.id}`}
                    className="hover:bg-paper-shade flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors"
                  >
                    <span className="label text-ink-soft shrink-0 tabular-nums">
                      {formatDateTime(run.started_at, locale, timeZone)}
                    </span>
                    <span className="text-body text-ink min-w-0 flex-1">
                      {t(`app.runs.status.${run.status}`)}
                    </span>
                    <span className="label text-ink-soft shrink-0 tabular-nums">
                      {t('app.runs.steps', { count: run.step_count })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

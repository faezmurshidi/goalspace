import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { listAgents } from '@/lib/db/agents';
import { getProjectBySlug } from '@/lib/db/projects';
import { getLocale } from '@/lib/format';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.agents.title')} · ${slug}` };
}

/**
 * An agent is a capability boundary, not a persona. The list leads with what
 * each one may do — its tool count — rather than with prose about what it is
 * for, because that is the fact an owner returns here to check.
 */
export default async function AgentsPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const agents = await listAgents(supabase, project.id);
  const t = getFixedT(await getLocale());

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <h1 className="label border-rule text-ink-soft border-b pb-2">{t('app.agents.title')}</h1>

        {agents.length === 0 ? (
          <p className="text-ink-soft py-6">{t('app.agents.empty')}</p>
        ) : (
          <ul>
            {agents.map((agent) => (
              <li key={agent.id} className="border-rule border-b">
                <Link
                  href={`/projects/${slug}/agents/${agent.id}`}
                  className="hover:bg-paper-shade flex flex-col gap-1 py-3 transition-colors"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-body text-ink min-w-0 flex-1">{agent.name}</span>

                    {/* Inactive is stated in words, not signalled by colour: the
                        palette has no disabled tone, and status must never be
                        colour alone. */}
                    {!agent.is_active ? (
                      <span className="label text-ink-soft shrink-0">
                        {t('app.agents.inactive')}
                      </span>
                    ) : null}

                    <span className="label text-ink-soft shrink-0">{agent.model}</span>
                    <span className="label text-ink-soft shrink-0 tabular-nums">
                      {t('app.agents.toolCount', { count: agent.tools.length })}
                    </span>
                  </div>

                  {agent.role_description ? (
                    <p className="text-micro text-ink-soft min-w-0 truncate">
                      {agent.role_description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getAgent } from '@/lib/db/agents';
import { getRun, listToolCalls, runCostUsd } from '@/lib/db/runs';
import { listRunProposals } from '@/lib/db/proposals';
import { formatDateTime, getLocale } from '@/lib/format';

type Params = { params: Promise<{ slug: string; runId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.runs.title')} · ${slug}` };
}

/**
 * The debugging surface and the privacy surface at once.
 *
 * Nothing here is aggregated away: arguments are shown verbatim, because this
 * is where an owner sees what left the system. A summarised trace would be
 * more readable and would defeat the purpose.
 */
export default async function RunPage({ params }: Params) {
  const { slug, runId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const run = await getRun(supabase, project.id, runId);
  if (!run) notFound();

  const [calls, proposals, cost, agent] = await Promise.all([
    listToolCalls(supabase, run.id),
    listRunProposals(supabase, run.id),
    runCostUsd(supabase, run.id),
    getAgent(supabase, project.id, run.agent_id),
  ]);

  const locale = await getLocale();
  const t = getFixedT(locale);

  const durationMs = run.ended_at
    ? Date.parse(run.ended_at) - Date.parse(run.started_at)
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <p className="label text-ink-soft">{t('app.runs.title')}</p>

        <h1 className="wdth-wide pt-1 text-headline font-bold text-ink">
          {agent?.name ?? t('app.agents.title')}
        </h1>

        {/* Status is a word, never a colour: the palette carries no success or
            failure tone, and the spec forbids colour as the only signal. The
            step count rides along here as plain text rather than its own
            <dt>/<dd> pair — it already reads as a complete phrase ("3
            steps"), not a bare value that needs a label. */}
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4 text-ink-soft">
          <span className="label text-ink">{t('app.runs.status.' + run.status)}</span>
          <span className="label tabular-nums">{t('app.runs.steps', { count: run.step_count })}</span>
        </p>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-b border-rule py-4">
          <div>
            <dt className="label text-ink-soft">{t('app.runs.started')}</dt>
            <dd className="label tabular-nums text-ink">
              {formatDateTime(run.started_at, locale)}
            </dd>
          </div>
          <div>
            <dt className="label text-ink-soft">{t('app.runs.duration')}</dt>
            <dd className="label tabular-nums text-ink">
              {durationMs === null ? '—' : `${(durationMs / 1000).toFixed(1)}s`}
            </dd>
          </div>
          <div>
            <dt className="label text-ink-soft">{t('app.runs.cost')}</dt>
            <dd className="label tabular-nums text-ink">${cost.toFixed(4)}</dd>
          </div>
        </dl>

        {run.error ? (
          <p role="alert" className="label max-w-[70ch] py-3 text-oxide">
            {run.error}
          </p>
        ) : null}

        <section className="pt-8">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.runs.toolCalls')}
          </h2>

          {calls.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.runs.noToolCalls')}</p>
          ) : (
            <ol>
              {calls.map((call) => (
                <li key={call.id} className="border-b border-rule py-3">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-body text-ink">{call.tool}</span>
                    <span className="label shrink-0 text-ink-soft">
                      {t(call.ok ? 'app.runs.succeeded' : 'app.runs.failed')}
                    </span>
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {call.duration_ms === null ? '—' : `${call.duration_ms}ms`}
                    </span>
                  </div>

                  {/* Verbatim, and as plain text. These are arguments a model
                      composed; rendering them as markup would let a crafted
                      value inject into the surface used to audit it. */}
                  <pre className="mt-2 max-w-[70ch] overflow-x-auto whitespace-pre-wrap border border-rule bg-paper-shade p-2 font-mono text-ink-soft">
                    {JSON.stringify(call.args, null, 2)}
                  </pre>

                  {call.result_summary ? (
                    <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-ink-soft">
                      {call.result_summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="pt-8">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.runs.proposals')}
          </h2>

          {proposals.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.runs.noProposals')}</p>
          ) : (
            <ul>
              {proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3"
                >
                  <span className="min-w-0 max-w-[70ch] flex-1 text-body text-ink">
                    {proposal.rationale}
                  </span>
                  <span className="label shrink-0 text-ink-soft">
                    {t(`app.inbox.status.${proposal.status}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="pt-8">
          <Link href={`/projects/${slug}/agents/${run.agent_id}`} className="label text-ink-soft">
            {agent?.name ?? t('app.agents.title')}
          </Link>
        </p>
      </div>
    </div>
  );
}

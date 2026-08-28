import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getBudget, monthToDateSpend, worstCaseReservationUsd } from '@/lib/db/budgets';
import { listAgents } from '@/lib/db/agents';
import { getLocale } from '@/lib/format';
import { ProjectForm } from './project-form';
import { BudgetForm } from './budget-form';
import { DangerZone } from './danger-zone';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.settings.title')} · ${slug}` };
}

/**
 * The one page with a page-level `<h1>` — `app.settings.title` — and each
 * section beneath it a peer `<h2>`: project, spend, danger zone. `DangerZone`
 * carries its own `<h2>` internally (it is reused nowhere else), so the
 * project and spend sections get matching `<h2>`s here rather than the page
 * repeating its own title as a second heading of the same rank.
 */
export default async function SettingsPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const [budget, monthToDateUsd, agents] = await Promise.all([
    getBudget(supabase, project.id, userId),
    monthToDateSpend(supabase, project.id),
    listAgents(supabase, project.id),
  ]);

  const t = getFixedT(await getLocale());

  const activeModels = agents.filter((a) => a.is_active).map((a) => a.model);
  const hasActiveAgents = activeModels.length > 0;
  const { usd: worstCaseUsd, unpriced } = worstCaseReservationUsd(
    activeModels,
    budget.per_run_token_cap
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="flex flex-col gap-10 pb-10 pt-8">
        <h1 className="label border-b border-rule pb-2 text-ink-soft">
          {t('app.settings.title')}
        </h1>

        <section className="flex flex-col gap-4">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.settings.project')}
          </h2>
          <ProjectForm slug={slug} project={project} />
        </section>

        <section className="flex flex-col gap-4 border-t border-rule pt-10">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.settings.spend')}
          </h2>

          <dl className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="text-body text-ink-soft">{t('app.settings.spentThisMonth')}</dt>
              <dd className="text-title tabular-nums text-ink">
                ${monthToDateUsd.toFixed(2)}
              </dd>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="text-body text-ink-soft">{t('app.settings.monthlyCap')}</dt>
              <dd className="text-title tabular-nums text-ink">
                ${budget.monthly_cap_usd.toFixed(2)}
              </dd>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="text-body text-ink-soft">{t('app.settings.worstCase')}</dt>
              <dd className="text-title tabular-nums text-ink">
                {hasActiveAgents ? `$${worstCaseUsd.toFixed(4)}` : '—'}
              </dd>
            </div>
          </dl>

          <p className="max-w-[65ch] text-micro text-ink-soft">
            {t('app.settings.worstCaseNote')}
          </p>

          {!hasActiveAgents ? (
            <p role="status" className="max-w-[65ch] text-body text-ink-soft">
              {t('app.settings.noActiveAgents')}
            </p>
          ) : unpriced.length > 0 ? (
            <p role="status" className="max-w-[65ch] text-body text-ink-soft">
              {t('app.settings.unpricedModels', { models: unpriced.join(', ') })}
            </p>
          ) : null}

          <BudgetForm slug={slug} budget={budget} />
        </section>

        <div className="border-t border-rule pt-10">
          <DangerZone slug={slug} />
        </div>
      </div>
    </div>
  );
}

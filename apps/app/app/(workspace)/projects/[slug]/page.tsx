import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getResumeData } from '@/lib/db/resume';
import { getLocale } from '@/lib/format';
import {
  Anomalies,
  Decided,
  FirstRun,
  LeftOff,
  Masthead,
  Open,
  ReEntry,
  Waiting,
} from '@/components/resume/regions';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);

  return { title: project?.title ?? 'Goalspace' };
}

export default async function ResumePage({ params }: Params) {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();

  const project = await getProjectBySlug(supabase, userId, slug);
  // getProjectBySlug collapses "does not exist" and "not yours" into null on
  // purpose, so this 404 cannot be used to probe whether a slug is taken.
  if (!project) notFound();

  const locale = await getLocale();
  const t = getFixedT(locale);

  // One instant for the whole screen. Reading the clock per region would let a
  // row read "0 days overdue" in one place and "1 day" in another on the same
  // paint.
  const now = new Date();
  const data = await getResumeData(supabase, project, now);

  const hasRecord = data.recentEntries.length > 0 || data.open.length > 0 || data.waiting.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="pb-10">
        <Masthead project={project} t={t} locale={locale} />

        <ReEntry
          absence={data.absence}
          lastActivityAt={data.lastActivityAt}
          t={t}
          locale={locale}
        />

        <Anomalies orphans={data.anomalies.orphans} cyclic={data.anomalies.cyclic} t={t} />

        {hasRecord ? null : <FirstRun t={t} />}

        <Waiting items={data.waiting} slug={slug} t={t} locale={locale} />
        <Open items={data.open} progress={data.progress} slug={slug} t={t} />

        {data.undecidedProposals > 0 ? (
          <div className="border-b border-rule">
            <Link
              href={`/projects/${slug}/inbox`}
              className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
            >
              <span className="min-w-0 flex-1 text-body text-ink">
                {t('app.resume.undecidedProposals')}
              </span>
              <span className="label shrink-0 tabular-nums text-ink-soft">
                {data.undecidedProposals}
              </span>
            </Link>
          </div>
        ) : null}

        <LeftOff entries={data.recentEntries} t={t} locale={locale} />
        <Decided entries={data.recentDecisions} t={t} locale={locale} />
      </div>
    </div>
  );
}

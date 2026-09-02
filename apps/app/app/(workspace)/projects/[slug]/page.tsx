import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

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
import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getResumeData } from '@/lib/db/resume';
import { getLocale, getTimeZone } from '@/lib/format';

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
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  // One instant for the whole screen. Reading the clock per region would let a
  // row read "0 days overdue" in one place and "1 day" in another on the same
  // paint.
  const now = new Date();
  const data = await getResumeData(supabase, project, now);

  // Undecided proposals count as a record. Without them a project whose only
  // content is a pending proposal renders "nothing recorded yet" directly
  // above a row saying three things are waiting on a decision.
  const hasRecord =
    data.recentEntries.length > 0 ||
    data.open.length > 0 ||
    data.waiting.length > 0 ||
    data.undecidedProposals > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pb-10">
        <Masthead project={project} t={t} locale={locale} timeZone={timeZone} />

        <ReEntry
          absence={data.absence}
          lastActivityAt={data.lastActivityAt}
          t={t}
          locale={locale}
          timeZone={timeZone}
        />

        <Anomalies orphans={data.anomalies.orphans} cyclic={data.anomalies.cyclic} t={t} />

        {hasRecord ? null : <FirstRun t={t} />}

        <Waiting items={data.waiting} slug={slug} t={t} locale={locale} timeZone={timeZone} />
        <Open items={data.open} progress={data.progress} slug={slug} t={t} />

        {data.undecidedProposals > 0 ? (
          <div className="border-rule border-b">
            <Link
              href={`/projects/${slug}/inbox`}
              className="hover:bg-paper-shade flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors"
            >
              <span className="text-body text-ink min-w-0 flex-1">
                {t('app.resume.undecidedProposals')}
              </span>
              <span className="label text-ink-soft shrink-0 tabular-nums">
                {data.undecidedProposals}
              </span>
            </Link>
          </div>
        ) : null}

        <LeftOff entries={data.recentEntries} t={t} locale={locale} timeZone={timeZone} />
        <Decided entries={data.recentDecisions} t={t} locale={locale} timeZone={timeZone} />
      </div>
    </div>
  );
}

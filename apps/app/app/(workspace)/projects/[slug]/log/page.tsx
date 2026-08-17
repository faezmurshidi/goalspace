import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';
import { cn } from '@goalspace/ui';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listEntries } from '@/lib/db/entries';
import { entryKinds, type EntryKind } from '@/lib/schemas/common';
import { formatDate, getLocale } from '@/lib/format';

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string; take?: string }>;
};

const PAGE = 50;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.log.title')} · ${slug}` };
}

function isEntryKind(value: string | undefined): value is EntryKind {
  return typeof value === 'string' && (entryKinds as readonly string[]).includes(value);
}

export default async function LogPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const query = await searchParams;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const locale = await getLocale();
  const t = getFixedT(locale);

  const activeKind = isEntryKind(query.kind) ? query.kind : null;

  // Paging by a growing window in the URL rather than by client state, so the
  // filters and the page depth survive a reload, a back button, and a shared
  // link. Clamped because `take` is user input and an unbounded value would
  // let anyone ask the database for the entire table in one query.
  const requested = Number.parseInt(query.take ?? '', 10);
  const take = Number.isFinite(requested)
    ? Math.min(Math.max(requested, PAGE), 500)
    : PAGE;

  // One extra row is fetched purely to answer "is there more?" without a
  // second count query, then dropped before rendering.
  const rows = await listEntries(supabase, project.id, {
    kinds: activeKind ? [activeKind] : undefined,
    limit: take + 1,
  });
  const hasMore = rows.length > take;
  const entries = hasMore ? rows.slice(0, take) : rows;

  const filterHref = (kind: EntryKind | null) =>
    kind ? `/projects/${slug}/log?kind=${kind}` : `/projects/${slug}/log`;

  return (
    <div className="pb-10 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-2">
        <h1 className="label text-ink-soft">{t('app.log.title')}</h1>

        <nav aria-label={t('app.log.filterLabel')} className="flex flex-wrap gap-4">
          <Link
            href={filterHref(null)}
            aria-current={activeKind === null ? 'true' : undefined}
            className={cn(
              'label unstyled border-b-2 pb-0.5 transition-colors',
              activeKind === null
                ? 'border-oxide text-ink'
                : 'border-transparent text-ink-soft hover:text-ink'
            )}
          >
            {t('app.log.filterAll')}
          </Link>
          {entryKinds.map((kind) => (
            <Link
              key={kind}
              href={filterHref(kind)}
              aria-current={activeKind === kind ? 'true' : undefined}
              className={cn(
                'label unstyled border-b-2 pb-0.5 transition-colors',
                activeKind === kind
                  ? 'border-oxide text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              )}
            >
              {t(`app.entryKind.${kind}`)}
            </Link>
          ))}
        </nav>
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-body text-ink-soft">{t('app.log.empty')}</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id} className="border-b border-rule py-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <time dateTime={entry.occurred_at} className="label shrink-0 text-ink-soft">
                  {formatDate(entry.occurred_at, locale)}
                </time>
                <span className="label shrink-0 text-ink-soft">
                  {t(`app.entryKind.${entry.kind}`)}
                </span>
                {entry.title ? (
                  <span className="min-w-0 flex-1 text-title text-ink">{entry.title}</span>
                ) : null}
              </div>
              {entry.body ? (
                <p className="prose-measure mt-2 whitespace-pre-line text-ink">{entry.body}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {hasMore ? (
        <Link
          href={{
            pathname: `/projects/${slug}/log`,
            query: { ...(activeKind ? { kind: activeKind } : {}), take: take + PAGE },
          }}
          className="label unstyled mt-6 inline-block border border-rule-strong px-5 py-3 text-ink transition-colors hover:bg-paper-shade"
        >
          {t('app.log.loadMore')}
        </Link>
      ) : null}
    </div>
  );
}

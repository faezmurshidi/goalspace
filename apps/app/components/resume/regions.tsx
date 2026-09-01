import Link from 'next/link';
import { cn } from '@goalspace/ui';

import type { Entry } from '@/lib/db/entries';
import type { WorkItem } from '@/lib/db/work-items';
import type { Project } from '@/lib/db/projects';
import type { Progress } from '@/lib/work-items/progress';
import type { Absence, WokenItem } from '@/lib/work-items/reentry';
import type { WorkItemStatus } from '@/lib/schemas/common';
import { formatDate, formatDateTime, formatMonthYear } from '@/lib/format';
import { previewText } from '@/lib/text';

type T = (key: string, vars?: Record<string, unknown>) => string;

interface Common {
  t: T;
  locale: string;
  timeZone: string;
}

/**
 * Section shell.
 *
 * Every region on this screen gets a different treatment on purpose: a band, a
 * line of prose, flagged rows, a dense list, a timeline, a disclosure. Six
 * identically-sized cards is both an absolute ban and, more to the point,
 * unreadable, because nothing would tell the eye which region matters.
 */
function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-10">
      {/* Stacked below the sm breakpoint. Side by side, a long caption in a
          longer language (Malay runs ~40% over English here) collided with
          its own heading on a 375px screen. */}
      <div className="flex flex-col gap-1 border-b border-rule pb-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="label text-ink-soft">{title}</h2>
        {caption ? <p className="label text-ink-soft">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Status is carried by a word, with colour only reinforcing it. DESIGN.md's
 * Two Signals Rule allows exactly two state colours, and relying on either
 * alone would fail 1.4.1 for anyone who cannot separate them.
 */
function StatusMark({ status, label }: { status: WorkItemStatus; label: string }) {
  return (
    <span
      className={cn(
        'label shrink-0',
        status === 'blocked' && 'text-waiting',
        status === 'doing' && 'text-oxide',
        status !== 'blocked' && status !== 'doing' && 'text-ink-soft'
      )}
    >
      {label}
    </span>
  );
}

function Ratio({ progress }: { progress?: Progress }) {
  // total 0 means every child was dropped, so there is genuinely nothing to
  // measure. computeProgress reports that distinctly rather than as 0%, and
  // drawing "0/0" here would present abandoned work as unfinished work.
  if (!progress || progress.total === 0) return null;

  return (
    <span className="label shrink-0 tabular-nums text-ink-soft">
      {progress.done}/{progress.total}
    </span>
  );
}

/* ─────────────────────────── Masthead ─────────────────────────── */

export function Masthead({ project, t, locale, timeZone }: Common & { project: Project }) {
  const kindLabel = t(
    `app.project.kind${project.kind.charAt(0).toUpperCase()}${project.kind.slice(1)}`
  );
  const statusLabel = t(
    `app.project.status${project.status.charAt(0).toUpperCase()}${project.status.slice(1)}`
  );

  return (
    <header className="border-b border-ink pb-5 pt-8">
      <h1 className="wdth-wide text-headline font-bold text-ink">{project.title}</h1>

      {project.brief ? (
        <p className="prose-measure mt-3 text-ink-soft">{project.brief}</p>
      ) : null}

      {/* The one place the brand register's sheet metadata survives into the
          product: here the project genuinely is the sheet. */}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex gap-2">
          <dt className="label text-ink-soft">{t('app.project.sheetSlug')}</dt>
          <dd className="label text-ink">{project.slug}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="label text-ink-soft">{t('app.project.sheetKind')}</dt>
          <dd className="label text-ink">{kindLabel}</dd>
        </div>
        <div className="flex gap-2">
          {/* Visible, not sr-only. The previous version hid a term whose text
              was the status word itself, so a screen reader read "Active
              Active" while sighted users saw a value with no label at all. */}
          <dt className="label text-ink-soft">{t('app.project.sheetStatus')}</dt>
          <dd className="label text-ink">{statusLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="label text-ink-soft">{t('app.project.sheetUpdated')}</dt>
          <dd className="label text-ink">{formatDate(project.updated_at, locale, timeZone)}</dd>
        </div>
      </dl>
    </header>
  );
}

/* ─────────────────────────── Re-entry ─────────────────────────── */

export function ReEntry({
  absence,
  lastActivityAt,
  t,
  locale,
  timeZone,
}: Common & { absence: Absence | null; lastActivityAt: string | null }) {
  // Nothing has happened yet, so there is no absence to narrate. The first-run
  // state below carries this case instead.
  if (!absence || !lastActivityAt) return null;

  if (!absence.significant) {
    // Below the threshold the sentence would be absurd ("away 1 day"), so it
    // degrades to a plain timestamp in annotation type. This is the common
    // case for anyone using the product daily, and it must not shout.
    return (
      <p className="label pt-8 text-ink-soft">
        {t('app.resume.lastSession', {
          when: formatDateTime(lastActivityAt, locale, timeZone),
        })}
      </p>
    );
  }

  return (
    <div className="pt-10">
      {/*
        The Duration Rule. One display-scale number in the entire workspace,
        set inline inside a sentence rather than stacked in a stat tile with a
        label under it, which is the hero-metric cliché. What sits beneath it
        is the actual record, not more statistics.
      */}
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-headline text-ink-soft">{t('app.resume.awayBefore')}</span>
        <span className="wdth-expanded text-display font-extrabold leading-none text-oxide">
          {absence.days}
        </span>
        <span className="text-headline text-ink-soft">{t('app.resume.awayAfter')}</span>
      </p>
      <p className="label mt-3 text-ink-soft">
        {t('app.resume.lastSession', { when: formatDate(lastActivityAt, locale, timeZone) })}
      </p>
    </div>
  );
}

/* ────────────────────── Waiting on the world ────────────────────── */

export function Waiting({
  items,
  slug,
  t,
  locale,
  timeZone,
}: Common & { items: WokenItem<WorkItem>[]; slug: string }) {
  // Placed above what's open, and absent entirely when empty. This is the
  // region that pays the product's thesis back, but an empty "nothing is
  // waiting" heading on every screen would train people to skip the area.
  if (items.length === 0) return null;

  return (
    <Section title={t('app.resume.waitingTitle')} caption={t('app.resume.waitingCaption')}>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-b border-rule">
            <Link
              href={`/projects/${slug}/work#${item.id}`}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
            >
              <span className="label shrink-0 text-waiting">
                {item.overdueDays === 0
                  ? t('app.resume.overdueToday')
                  : item.overdueDays === 1
                    ? t('app.resume.overdueOne')
                    : t('app.resume.overdueDays', { count: item.overdueDays })}
              </span>
              <span className="min-w-0 flex-1 text-body text-ink">{item.title}</span>
              <span className="label shrink-0 text-ink-soft">
                {t('app.resume.blockedSince', {
                  when: formatMonthYear(item.status_changed_at, locale, timeZone),
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ─────────────────────────── What's open ─────────────────────────── */

export function Open({
  items,
  progress,
  slug,
  t,
}: Omit<Common, 'locale' | 'timeZone'> & {
  items: WorkItem[];
  progress: Map<string, Progress>;
  slug: string;
}) {
  return (
    <Section title={t('app.resume.openTitle')}>
      {items.length === 0 ? (
        <p className="py-3 text-body text-ink-soft">{t('app.resume.openEmpty')}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="border-b border-rule">
              <Link
                href={`/projects/${slug}/work#${item.id}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
              >
                <StatusMark
                  status={item.status}
                  label={
                    item.kind === 'question'
                      ? t('app.kind.question')
                      : t(`app.status.${item.status}`)
                  }
                />
                <span className="min-w-0 flex-1 text-body text-ink">{item.title}</span>
                <Ratio progress={progress.get(item.id)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ────────────────────── Where you left off ────────────────────── */

export function LeftOff({ entries, t, locale, timeZone }: Common & { entries: Entry[] }) {
  return (
    <Section title={t('app.resume.leftOffTitle')}>
      {entries.length === 0 ? (
        <p className="py-3 text-body text-ink-soft">{t('app.resume.leftOffEmpty')}</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id} className="border-b border-rule py-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <time dateTime={entry.occurred_at} className="label shrink-0 text-ink-soft">
                  {formatDate(entry.occurred_at, locale, timeZone)}
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
    </Section>
  );
}

/* ────────────────────── What you decided ────────────────────── */

export function Decided({ entries, t, locale, timeZone }: Common & { entries: Entry[] }) {
  if (entries.length === 0) return null;

  return (
    <Section title={t('app.resume.decidedTitle')}>
      {/* Native disclosure rather than a client component: this is the only
          collapsible thing on the page, and it costs no JavaScript. */}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="border-b border-rule">
            <details className="group">
              <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade">
                <time dateTime={entry.occurred_at} className="label shrink-0 text-ink-soft">
                  {formatDate(entry.occurred_at, locale, timeZone)}
                </time>
                <span className="min-w-0 flex-1 text-body text-ink">
                  {entry.title ?? previewText(entry.body, 80)}
                </span>
                <span
                  aria-hidden="true"
                  className="label shrink-0 text-ink-soft transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              {entry.body ? (
                <p className="prose-measure pb-4 whitespace-pre-line text-ink">{entry.body}</p>
              ) : null}
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ────────────────────────── First run ────────────────────────── */

export function FirstRun({ t }: Omit<Common, 'locale' | 'timeZone'>) {
  return (
    <div className="border-b border-rule py-10">
      <h2 className="text-title text-ink">{t('app.resume.firstRunTitle')}</h2>
      <p className="prose-measure mt-2 text-ink-soft">{t('app.resume.firstRunBody')}</p>
    </div>
  );
}

/* ────────────────────────── Anomalies ────────────────────────── */

export function Anomalies({
  orphans,
  cyclic,
  t,
}: Omit<Common, 'locale' | 'timeZone'> & { orphans: string[]; cyclic: string[] }) {
  const count = orphans.length + cyclic.length;
  // Surfaced rather than swallowed: buildTree reports corrupt structure
  // instead of silently dropping rows, and hiding it here would undo that.
  if (count === 0) return null;

  return (
    <div className="mt-8 border border-oxide p-4">
      <p className="label text-oxide">{t('app.resume.anomalyTitle')}</p>
      <p className="prose-measure mt-2 text-body text-ink">
        {t('app.resume.anomalyBody', { count })}
      </p>
    </div>
  );
}

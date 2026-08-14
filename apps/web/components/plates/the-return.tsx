'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { ResumeView } from '@/components/manual/figures/resume-view';
import { StatusChip } from '@/components/manual/status-chip';
import { record, AS_OF } from '@/content/record';
import { daysBetween, formatElapsed, formatDayMonth } from '@/lib/duration';

/** Lowercases the first character so a title reads as a clause mid sentence. */
function asClause(text: string): string {
  const sentence = text.split('.')[0];
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

export function TheReturn() {
  const { t, currentLocale } = useAppTranslations();

  // The record is a dated specimen: every duration on this plate is
  // computed relative to AS_OF, not the visitor's clock, so the blocker
  // durations stay stable regardless of when the page is built or viewed.
  const latestDecision = record.decisions[record.decisions.length - 1];

  return (
    <Plate
      number={t('landing.return.plate')}
      title={t('landing.return.title')}
      meta={t('landing.hero.meta', { date: AS_OF })}
    >
      <p className="max-w-[68ch] text-body">{t('landing.return.lede')}</p>

      <div className="mt-12">
        <AnnotatedFigure
          caption={t('landing.return.caption')}
          callouts={[
            {
              n: 1,
              label: t('landing.return.calloutLastTouch', {
                date: formatDayMonth(record.lastTouchedAt, currentLocale),
              }),
              x: 50,
              y: 19,
            },
            {
              n: 2,
              label: t('landing.return.calloutOpen', { n: record.blockers.length }),
              x: 50,
              y: 53,
            },
            {
              n: 3,
              label: t('landing.return.calloutDecided', {
                summary: asClause(latestDecision.text),
              }),
              x: 50,
              y: 84,
            },
          ]}
        >
          <ResumeView />
        </AnnotatedFigure>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <div>
          <h3 className="label mb-4 text-oxide">{t('landing.return.openLabel')}</h3>
          <ul className="border-t border-rule">
            {record.blockers.map((blocker) => {
              const elapsed = formatElapsed(daysBetween(blocker.since, AS_OF));
              return (
                <li key={blocker.title} className="flex flex-col gap-2 border-b border-rule py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-title">{blocker.title}</span>
                    <StatusChip
                      status="blocked"
                      label={t('landing.return.blockedLabel', {
                        duration: `${elapsed.value} ${elapsed.unit}`,
                      })}
                    />
                  </div>
                  <p className="text-body text-ink-soft">
                    <span className="label text-ink-soft">{t('landing.return.waitingLabel')}</span>{' '}
                    {blocker.waitingOn}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="label mb-4 text-oxide">{t('landing.return.decidedLabel')}</h3>
          <ul className="border-t border-rule">
            {record.decisions.map((decision) => (
              <li key={decision.at} className="flex flex-col gap-2 border-b border-rule py-4">
                <span className="label text-ink-soft">
                  {formatDayMonth(decision.at, currentLocale)}
                </span>
                <p className="text-body">{decision.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Plate>
  );
}

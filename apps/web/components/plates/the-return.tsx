'use client';

import { useAppTranslations } from '@goalspace/i18n';

import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { DrawOnView } from '@/components/manual/draw-on-view';
import { ResumeView } from '@/components/manual/figures/resume-view';
import { Plate } from '@/components/manual/plate';
import { StatusChip } from '@/components/manual/status-chip';
import { daysBetween, formatDayMonth, formatElapsed, localeJoin } from '@/lib/duration';
import { AS_OF, record } from '@/content/record';

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
      label={t('common.plateLabel', { number: t('landing.return.plate') })}
      title={t('landing.return.title')}
      meta={t('landing.hero.meta', { date: AS_OF })}
    >
      <p className="text-body max-w-[68ch]">{t('landing.return.lede')}</p>

      <div className="mt-12">
        <DrawOnView>
          <AnnotatedFigure
            caption={t('landing.return.caption')}
            calloutSrLabel={(n) => t('common.calloutSr', { n })}
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
        </DrawOnView>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <div>
          <h3 className="label text-oxide mb-4">{t('landing.return.openLabel')}</h3>
          <ul className="border-rule border-t">
            {record.blockers.map((blocker) => {
              const elapsed = formatElapsed(daysBetween(blocker.since, AS_OF), currentLocale);
              return (
                <li key={blocker.title} className="border-rule flex flex-col gap-2 border-b py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-title">{blocker.title}</span>
                    <StatusChip
                      status="blocked"
                      label={t('landing.return.blockedLabel', {
                        duration: localeJoin([elapsed.value, elapsed.unit], currentLocale),
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
          <h3 className="label text-oxide mb-4">{t('landing.return.decidedLabel')}</h3>
          <ul className="border-rule border-t">
            {record.decisions.map((decision) => (
              <li key={decision.at} className="border-rule flex flex-col gap-2 border-b py-4">
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

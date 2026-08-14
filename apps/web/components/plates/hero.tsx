'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { ExplodedProject } from '@/components/manual/figures/exploded-project';
import { record, AS_OF } from '@/content/record';
import { daysBetween, formatElapsed, formatDayMonth } from '@/lib/duration';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

/** Lowercases the first character so a title reads as a clause mid sentence. */
function asClause(text: string): string {
  const sentence = text.split('.')[0];
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

export function Hero() {
  const { t, currentLocale } = useAppTranslations();
  // The record is a dated specimen: every duration on this plate is
  // computed relative to AS_OF, not the visitor's clock, so "23 days away"
  // stays "23 days away" regardless of when the page is built or viewed.
  const away = formatElapsed(daysBetween(record.lastTouchedAt, AS_OF));

  // The oldest note and decision are the wrong callouts for a hero about
  // coming back: they read as the project's start, not its state today.
  // Build the three callouts from the most recent, most telling entries
  // instead: the live blocker, the last session, and the one reversal.
  const blocker = record.blockers[0];
  const blockerElapsed = formatElapsed(daysBetween(blocker.since, AS_OF));
  const lastSession = record.entries[record.entries.length - 1];
  const reversal = record.decisions[record.decisions.length - 1];

  return (
    <Plate
      number={t('landing.hero.plate')}
      meta={t('landing.hero.meta', { date: AS_OF })}
      drenched
    >
      <h1 className="text-display wdth-expanded max-w-[14ch]">{t('landing.hero.title')}</h1>

      <p className="mt-8 max-w-[68ch] text-body">{t('landing.hero.lede')}</p>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <a
          href={`${APP_URL}/login`}
          className="label bg-paper px-8 py-4 text-ink transition-colors duration-150 ease-out-expo hover:bg-ink hover:text-paper"
        >
          {t('landing.hero.cta')}
        </a>
        <a
          href="#plate-04"
          className="label border border-paper/40 px-8 py-4 text-paper transition-colors duration-150 ease-out-expo hover:border-paper"
        >
          {t('landing.hero.ctaSecondary')}
        </a>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-[1fr_1fr] md:items-center">
        <p className="flex items-baseline gap-3">
          <span className="text-display wdth-expanded">{away.value}</span>
          <span className="label">{`${away.unit} ${t('landing.hero.away')}`}</span>
        </p>

        <AnnotatedFigure
          caption={t('landing.hero.caption')}
          className="[&_*]:stroke-paper"
          callouts={[
            {
              n: 1,
              label: t('landing.hero.calloutBlocked', {
                duration: `${blockerElapsed.value} ${blockerElapsed.unit}`,
                subject: asClause(blocker.title),
              }),
              x: 48,
              y: 34,
            },
            {
              n: 2,
              label: t('landing.hero.calloutLastSession', {
                date: formatDayMonth(lastSession.at, currentLocale),
                summary: asClause(lastSession.text),
              }),
              x: 22,
              y: 64,
            },
            {
              n: 3,
              label: t('landing.hero.calloutReversed', {
                summary: asClause(reversal.text),
              }),
              x: 76,
              y: 18,
            },
          ]}
        >
          <ExplodedProject />
        </AnnotatedFigure>
      </div>
    </Plate>
  );
}

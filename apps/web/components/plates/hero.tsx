'use client';

import { useAppTranslations } from '@goalspace/i18n';

import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { DrawOnView } from '@/components/manual/draw-on-view';
import { ExplodedProject } from '@/components/manual/figures/exploded-project';
import { Plate } from '@/components/manual/plate';
import { appHref } from '@/lib/app-url';
import { daysBetween, formatDayMonth, formatElapsed, localeJoin } from '@/lib/duration';
import { AS_OF, record } from '@/content/record';

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
  const away = formatElapsed(daysBetween(record.lastTouchedAt, AS_OF), currentLocale);

  // The oldest note and decision are the wrong callouts for a hero about
  // coming back: they read as the project's start, not its state today.
  // Build the three callouts from the most recent, most telling entries
  // instead: the live blocker, the last session, and the one reversal.
  const blocker = record.blockers[0];
  const blockerElapsed = formatElapsed(daysBetween(blocker.since, AS_OF), currentLocale);
  const lastSession = record.entries[record.entries.length - 1];
  const reversal = record.decisions[record.decisions.length - 1];

  return (
    <Plate
      number={t('landing.hero.plate')}
      label={t('common.plateLabel', { number: t('landing.hero.plate') })}
      meta={t('landing.hero.meta', { date: AS_OF })}
      drenched
    >
      <h1 className="text-display wdth-expanded max-w-[14ch]">{t('landing.hero.title')}</h1>

      <p className="text-body mt-8 max-w-[68ch]">{t('landing.hero.lede')}</p>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <a
          href={appHref('/login')}
          className="label bg-paper text-ink ease-out-expo hover:bg-ink hover:text-paper px-8 py-4 transition-colors duration-150"
        >
          {t('landing.hero.cta')}
        </a>
        <a
          href="#plate-04"
          className="label border-paper/40 text-paper ease-out-expo hover:border-paper border px-8 py-4 transition-colors duration-150"
        >
          {t('landing.hero.ctaSecondary')}
        </a>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-[1fr_1fr] md:items-center">
        <p className="flex items-baseline gap-3">
          <span className="text-display wdth-expanded">{away.value}</span>
          <span className="label">
            {localeJoin([away.unit, t('landing.hero.away')], currentLocale)}
          </span>
        </p>

        {/*
          The hero is the one figure with an orchestrated entrance: strokes
          draw in first, then the three callout numbers fade in staggered
          90ms apart via the `sequence-callouts` class (see globals.css).
          durationMs/staggerMs are tuned tighter than the 600/60 default so
          the whole sequence, draw plus callout stagger, lands under 900ms:
          draw completes by 350 + 7*25 = 525ms, the last (3rd) callout
          starts at 525 + 180 = 705ms and finishes its 150ms fade at 855ms.
        */}
        <DrawOnView className="sequence-callouts" durationMs={350} staggerMs={25}>
          <AnnotatedFigure
            caption={t('landing.hero.caption')}
            className="[&_*]:stroke-paper"
            drenched
            calloutSrLabel={(n) => t('common.calloutSr', { n })}
            callouts={[
              {
                n: 1,
                label: t('landing.hero.calloutBlocked', {
                  duration: localeJoin([blockerElapsed.value, blockerElapsed.unit], currentLocale),
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
        </DrawOnView>
      </div>
    </Plate>
  );
}

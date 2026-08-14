'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { DrawOnView } from '@/components/manual/draw-on-view';
import { AccrualMechanism } from '@/components/manual/figures/accrual-mechanism';
import { record, AS_OF } from '@/content/record';
import { formatDayMonth } from '@/lib/duration';

export function Accrual() {
  const { t, currentLocale } = useAppTranslations();

  // The third step is illustrated with a real closing entry rather than a
  // description of one (PRODUCT.md, Design Principle 1). Session entries
  // are the ones written to close a piece of work, so the most recent
  // session is the one that shows what "the answer is the record" means
  // in practice.
  const sessionEntries = record.entries.filter((entry) => entry.kind === 'session');
  const closingEntry = sessionEntries[sessionEntries.length - 1];

  return (
    <Plate
      number={t('landing.accrual.plate')}
      label={t('common.plateLabel', { number: t('landing.accrual.plate') })}
      title={t('landing.accrual.title')}
      meta={t('landing.hero.meta', { date: AS_OF })}
      className="bg-paper-shade"
    >
      <p className="max-w-[68ch] text-body">{t('landing.accrual.lede')}</p>

      <div className="mt-12">
        <DrawOnView>
          <AnnotatedFigure
            caption={t('landing.accrual.caption')}
            callouts={[
              { n: 1, label: t('landing.accrual.steps.one'), x: 19, y: 77 },
              { n: 2, label: t('landing.accrual.steps.two'), x: 55, y: 50 },
              { n: 3, label: t('landing.accrual.steps.three'), x: 84, y: 32 },
            ]}
          >
            <AccrualMechanism />
          </AnnotatedFigure>
        </DrawOnView>
      </div>

      {closingEntry ? (
        <div className="mt-10 border-t border-rule pt-6">
          <h3 className="label mb-2 text-oxide">{t('landing.accrual.entryLabel')}</h3>
          <p className="label text-ink-soft">{formatDayMonth(closingEntry.at, currentLocale)}</p>
          <p className="mt-2 max-w-[68ch] text-body">{closingEntry.text}</p>
        </div>
      ) : null}

      <p className="mt-10 max-w-[68ch] text-title">{t('landing.accrual.closing')}</p>
    </Plate>
  );
}

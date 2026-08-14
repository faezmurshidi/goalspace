'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AS_OF } from '@/content/record';

/**
 * The hero's secondary call to action anchors at "#plate-04". Plate itself
 * does not forward an `id` prop, so the anchor target is this wrapper, the
 * outermost element this component renders.
 */
export function TheAgent() {
  const { t } = useAppTranslations();

  return (
    <div id="plate-04">
      <Plate
        number={t('landing.agent.plate')}
        title={t('landing.agent.title')}
        meta={t('landing.hero.meta', { date: AS_OF })}
        className="bg-paper-shade"
      >
        {/*
          Two columns, equal weight: identical label styling, identical body
          styling, identical structure. "Shipping today" and "Next" must
          read as two plain statements of fact, never as a feature list next
          to a disclaimer (PRODUCT.md, Design Principle 4).
        */}
        <div className="grid gap-10 border-t border-rule pt-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-rule md:pt-12">
          <div className="md:pr-12">
            <h3 className="label mb-4 text-oxide">{t('landing.agent.nowLabel')}</h3>
            <p className="max-w-[68ch] text-body">{t('landing.agent.now')}</p>
          </div>
          <div className="border-t border-rule pt-10 md:border-t-0 md:pl-12 md:pt-0">
            <h3 className="label mb-4 text-oxide">{t('landing.agent.nextLabel')}</h3>
            <p className="max-w-[68ch] text-body">{t('landing.agent.next')}</p>
          </div>
        </div>

        <p className="mt-10 max-w-[68ch] border-t border-rule pt-10 text-title">
          {t('landing.agent.why')}
        </p>
      </Plate>
    </div>
  );
}

'use client';

import { useAppTranslations } from '@goalspace/i18n';

import { Plate } from '@/components/manual/plate';
import { appHref } from '@/lib/app-url';
import { AS_OF } from '@/content/record';

export function Start() {
  const { t } = useAppTranslations();

  return (
    <Plate
      number={t('landing.start.plate')}
      label={t('common.plateLabel', { number: t('landing.start.plate') })}
      title={t('landing.start.title')}
      meta={t('landing.hero.meta', { date: AS_OF })}
      drenched
    >
      <p className="text-body max-w-[68ch]">{t('landing.start.lede')}</p>

      <div className="mt-12">
        <a
          href={appHref('/login')}
          className="label bg-paper text-ink ease-out-expo hover:bg-ink hover:text-paper inline-block px-8 py-4 transition-colors duration-150"
        >
          {t('landing.start.cta')}
        </a>
        <p className="label text-paper-soft mt-6">{t('landing.start.honesty')}</p>
      </div>
    </Plate>
  );
}

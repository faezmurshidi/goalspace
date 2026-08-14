'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AS_OF } from '@/content/record';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

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
      <p className="max-w-[68ch] text-body">{t('landing.start.lede')}</p>

      <div className="mt-12">
        <a
          href={`${APP_URL}/login`}
          className="label inline-block bg-paper px-8 py-4 text-ink transition-colors duration-150 ease-out-expo hover:bg-ink hover:text-paper"
        >
          {t('landing.start.cta')}
        </a>
        <p className="label mt-6 text-paper-soft">{t('landing.start.honesty')}</p>
      </div>
    </Plate>
  );
}

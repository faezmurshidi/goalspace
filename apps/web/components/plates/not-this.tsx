'use client';

import { useAppTranslations } from '@goalspace/i18n';

import { Plate } from '@/components/manual/plate';
import { AS_OF } from '@/content/record';

const ITEM_KEYS = ['tasks', 'wiki', 'streaks', 'reminders', 'habits'] as const;

/**
 * Each item in the record is one flat statement followed by its qualifier,
 * written as a single sentence pair rather than as two translation keys.
 * Splitting at the first sentence boundary keeps the copy in one string
 * (so it reads naturally to a translator) while letting the ruled table
 * set the claim and the qualifier at different weights.
 */
function splitClaim(text: string): { claim: string; qualifier: string } {
  const idx = text.indexOf('. ');
  if (idx === -1) return { claim: text, qualifier: '' };
  return { claim: text.slice(0, idx + 1), qualifier: text.slice(idx + 2) };
}

export function NotThis() {
  const { t } = useAppTranslations();

  return (
    <Plate
      number={t('landing.notThis.plate')}
      label={t('common.plateLabel', { number: t('landing.notThis.plate') })}
      title={t('landing.notThis.title')}
      meta={t('landing.hero.meta', { date: AS_OF })}
    >
      <div className="border-rule border-t">
        {ITEM_KEYS.map((key) => {
          const { claim, qualifier } = splitClaim(t(`landing.notThis.items.${key}`));
          return (
            <div
              key={key}
              className="border-rule grid gap-2 border-b py-6 md:grid-cols-[1fr_2fr] md:items-baseline md:gap-8"
            >
              <p className="text-title">{claim}</p>
              {qualifier ? (
                <p className="text-body text-ink-soft max-w-[68ch]">{qualifier}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Plate>
  );
}

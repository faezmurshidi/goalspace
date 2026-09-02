'use client';

import Link from 'next/link';
import { useAppTranslations } from '@goalspace/i18n';

import { MainNav } from '@/components/main-nav';

/**
 * The running head of the manual, not a floating app bar: static in the
 * document flow, paper ground, a single hairline rule underneath. No blur,
 * no motion, no second theme to toggle (DESIGN.md #1: "the room is dark;
 * the manual under the lamp is not").
 */
export function SiteHeader() {
  const { t, currentLocale } = useAppTranslations();

  return (
    <header className="border-rule bg-paper border-b">
      <div className="mx-auto flex max-w-[1400px] flex-col px-4 md:h-16 md:flex-row md:items-stretch md:justify-between md:px-8">
        <Link href={`/${currentLocale}`} className="label text-ink flex items-center py-4 md:py-0">
          {t('common.appName')}
        </Link>
        <MainNav />
      </div>
    </header>
  );
}

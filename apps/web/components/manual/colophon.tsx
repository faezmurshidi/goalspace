'use client';

import Link from 'next/link';
import { LanguageSelector, useAppTranslations } from '@goalspace/i18n';

import { appHref } from '@/lib/app-url';
import { AS_OF } from '@/content/record';
import packageJson from '../../package.json';

/**
 * A colophon, not a four-column sitemap: the printed note that closes a
 * manual, naming the edition and the date it was set. One top rule, then
 * three groups in label type, each separated from its neighbour by a rule
 * (vertical on desktop, horizontal on mobile) rather than by spacing alone,
 * matching the header's own Navigation idiom (DESIGN.md #5).
 *
 * The build date reads from `AS_OF`, the same fixed specimen date every
 * plate's duration is computed against, not `new Date()`: a footer date
 * that drifted with the visitor's clock would read differently depending
 * on when the static page happened to be built or viewed.
 */
export function Colophon() {
  const { t, currentLocale } = useAppTranslations();

  return (
    <footer className="border-rule border-t">
      <div className="divide-rule mx-auto flex max-w-[1400px] flex-col divide-y px-4 md:flex-row md:items-center md:justify-between md:divide-x md:divide-y-0 md:px-8">
        <p className="label text-ink-soft py-6 md:py-0 md:pr-8">
          {t('footer.revision', { version: packageJson.version, date: AS_OF })}
        </p>

        <div className="py-6 md:px-8 md:py-0">
          <LanguageSelector />
        </div>

        <nav aria-label={t('footer.navLabel')} className="flex gap-6 py-6 md:py-0 md:pl-8">
          <Link href={`/${currentLocale}/blog`} className="label text-ink">
            {t('navigation.blog')}
          </Link>
          <a href={appHref('/')} className="label text-ink">
            {t('footer.appLink')}
          </a>
        </nav>
      </div>
    </footer>
  );
}

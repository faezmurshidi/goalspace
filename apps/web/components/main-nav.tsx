'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { cn } from '@goalspace/ui';

import { appHref } from '@/lib/app-url';

/**
 * Every destination in this nav shares one class: label typography, ink
 * text, and a 1px rule that runs down the left on desktop and across the
 * top on mobile (DESIGN.md #5, Navigation). The rule sits on every item,
 * including the first, so it also separates the whole nav from the
 * wordmark beside or above it, with no extra spacing rule needed.
 */
const navItemClass =
  'label flex items-center border-t border-rule px-0 py-3 text-ink md:h-16 md:border-t-0 md:border-l md:border-rule md:px-6 md:py-0';

export function MainNav({
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, 'defaultValue' | 'dir'>) {
  const { t, currentLocale } = useAppTranslations();
  const pathname = usePathname();
  const blogHref = `/${currentLocale}/blog`;
  const isBlogActive = pathname?.startsWith(blogHref) ?? false;

  return (
    <nav
      aria-label={t('navigation.primaryLabel')}
      className={cn('flex flex-col md:flex-row', className)}
      {...props}
    >
      <Link
        href={blogHref}
        aria-current={isBlogActive ? 'page' : undefined}
        className={cn(
          navItemClass,
          isBlogActive && 'decoration-oxide underline decoration-2 underline-offset-[6px]'
        )}
      >
        {t('navigation.blog')}
      </Link>
      <a href={appHref('/login')} className={navItemClass}>
        {t('auth.signIn')}
      </a>
      <a href={appHref('/login?mode=signup')} className={navItemClass}>
        {t('auth.signUp')}
      </a>
    </nav>
  );
}

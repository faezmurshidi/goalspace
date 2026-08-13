'use client';

import Link from 'next/link';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export function MainNav({
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, 'defaultValue' | 'dir'>) {
  const { t, currentLocale } = useAppTranslations();

  return (
    <>
      <NavigationMenu className={cn('hidden md:flex', className)} {...props}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href={`/${currentLocale}/blog`} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                {t('navigation.blog')}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex items-center gap-4">
        <a
          href={`${APP_URL}/login`}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          {t('auth.signIn')}
        </a>
        <a
          href={`${APP_URL}/auth`}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          {t('auth.signUp')}
        </a>
      </div>
    </>
  );
}

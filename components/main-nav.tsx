'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useAppTranslations } from '@/lib/hooks/use-translations';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { AuthDialog } from './auth/auth-dialog';
import { Button } from './ui/button';

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { t, currentLocale } = useAppTranslations();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Create local reference to auth
    const auth = supabase.auth;

    // Get initial session
    auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowAuthDialog(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
        {user ? (
          <>
            <button
              className="rounded bg-transparent px-4 py-2 text-sm font-medium text-white/70 hover:text-white"
              onClick={handleSignOut}
            >
              {t('auth.signOut')}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAuthDialog(true)}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            {t('auth.signIn')}
          </button>
        )}
      </div>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
}

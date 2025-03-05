'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from './ui/button';
import { AuthDialog } from './auth/auth-dialog';
import { useLocale, useTranslations } from 'next-intl';

export function MainNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  const [user, setUser] = useState(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowAuthDialog(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {t('navigation.dashboard')}
            </Link>
            <button
              className="text-sm font-medium text-white/70 hover:text-white bg-transparent px-4 py-2 rounded"
              onClick={handleSignOut}
            >
              {t('auth.signOut')}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAuthDialog(true)}
            className="text-sm font-medium border border-gray-300 px-4 py-2 rounded"
          >
            {t('auth.signIn')}
          </button>
        )}
      </div>
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />
    </>
  );
}
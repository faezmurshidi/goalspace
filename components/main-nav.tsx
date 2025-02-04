'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {supabase} from '@/utils/supabase/client';
import { Button } from './ui/button';
import { AuthDialog } from './auth/auth-dialog';

export function MainNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
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
              href="/dashboard"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Button
              variant="ghost"
              className="text-sm font-medium text-white/70 hover:text-white"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowAuthDialog(true)}
            className="text-sm font-medium"
          >
            Sign In
          </Button>
        )}
      </div>
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />
    </>
  );
}
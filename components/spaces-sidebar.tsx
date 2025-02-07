'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Brain, Target, Plus, LayoutDashboard, Settings, Sun, Moon, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from 'next-themes';
import { createClient } from '@/utils/supabase/client';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';

interface SpacesSidebarProps {
  className?: string;
}

export function SpacesSidebar({ className }: SpacesSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { spaces, loadUserData } = useSpaceStore();
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user data when sidebar mounts
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleSpaceClick = (spaceId: string) => {
    setLoadingSpaceId(spaceId);
    router.push(`/space/${spaceId}`);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Clear all local storage data
      localStorage.clear();
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Navigate to main landing page instead of auth page
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const mainNavItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ];

  const bottomNavItems = [
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />,
    },
    {
      label: isLoggingOut ? 'Logging out...' : 'Logout',
      href: '#',
      icon: isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />,
      onClick: handleLogout,
    },
  ];

  return (
    <Sidebar open={isOpen} setOpen={setIsOpen}>
      <SidebarBody className={cn("fixed left-0 top-[57px] z-30 h-[calc(100vh-57px)]", className)}>
        {/* Top Navigation */}
        <div className="space-y-2">
          {mainNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              link={item}
            />
          ))}
        </div>

        {/* Spaces List */}
        <ScrollArea className="flex-1 mt-6">
          <div className="space-y-1">
            {spaces.map((space) => (
              <SidebarLink
                key={space.id}
                link={{
                  label: space.title,
                  href: `/space/${space.id}`,
                  icon: space.category === 'learning' ? (
                    <Brain
                      className="h-4 w-4"
                      style={{ color: space.space_color?.main }}
                    />
                  ) : (
                    <Target
                      className="h-4 w-4"
                      style={{ color: space.space_color?.main }}
                    />
                  ),
                }}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="space-y-2 mt-auto pt-6 border-t dark:border-neutral-700">
          {/* Theme Toggle */}
          {mounted && (
            <div className="w-full text-left">
              <SidebarLink
                link={{
                  label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                  href: '#',
                  icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
                  onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark')
                }}
              />
            </div>
          )}

          {/* Bottom Nav Items */}
          {bottomNavItems.map((item) => (
            <button key={item.href} onClick={item.onClick} className="w-full text-left">
              <SidebarLink
                link={item}
              />
            </button>
          ))}

          {/* New Space Button */}
          <SidebarLink
            link={{
              label: "New Space",
              href: '/new-space',
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

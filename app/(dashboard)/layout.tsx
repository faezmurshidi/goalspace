'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, LayoutDashboard, LogOut, Moon, Settings, Sun, Target } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { signOut } from '@/lib/auth';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Link {
  label: string;
  href: string;
  icon: JSX.Element;
  onClick?: () => void | Promise<void>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { spaces } = useSpaceStore();

  const mainLinks: Link[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    },
  ];

  const bottomLinks: Link[] = [
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: 'Logout',
      href: '#',
      icon: <LogOut className="h-5 w-5 flex-shrink-0" />,
      onClick: async () => {
        await signOut();
        router.push('/auth');
      },
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <motion.div
        onMouseEnter={() => !open && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: open || isHovered ? 256 : 64 }}
        transition={{ duration: 0.2 }}
      >
        <Sidebar open={open || isHovered} setOpen={setOpen} className="h-full">
          <SidebarBody className="flex h-full flex-col">
            <div className="flex-1">
              <Logo open={open || isHovered} />
              <div className="mt-8 flex flex-col gap-2">
                {mainLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
              {spaces.length > 0 && (
                <>
                  <div className="mb-4 mt-8 px-2">
                    <h2
                      className={cn(
                        'text-xs font-semibold uppercase text-muted-foreground',
                        !(open || isHovered) && 'sr-only'
                      )}
                    >
                      Your Spaces
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {spaces.map((space) => (
                      <SidebarLink
                        key={space.id}
                        link={{
                          label: space.title,
                          href: `/space/${space.id}`,
                          icon: (
                            <Brain
                              className="h-5 w-5 flex-shrink-0"
                              style={{ color: space.space_color?.main }}
                            />
                          ),
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex flex-col gap-2">
                {bottomLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}

                <SidebarLink
                  link={{
                    label: theme === 'light' ? 'Dark' : 'Light',
                    href: '#',
                    icon: <Sun className="h-5 w-5 flex-shrink-0" />,
                  }}
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      </motion.div>
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8">{children}</div>
      </main>
    </div>
  );
}

const Logo = ({ open }: { open: boolean }) => {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="h-8 w-8 rounded-lg bg-primary" />
      {open && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-semibold"
        >
          GoalSpace
        </motion.span>
      )}
    </div>
  );
};

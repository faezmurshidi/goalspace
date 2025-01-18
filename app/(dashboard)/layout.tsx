'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Target,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { GoalSwitcher } from '@/components/goal-switcher';
import type { Goal } from '@/components/goal-switcher';
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
  const { spaces, goals } = useSpaceStore();
  const [activeGoal, setActiveGoal] = useState<Goal | undefined>(goals[0]);

  const isExpanded = open || isHovered;

  // Initialize active goal from localStorage or first goal
  useEffect(() => {
    const lastActiveGoalId = localStorage.getItem('lastActiveGoalId');
    if (lastActiveGoalId && goals.length > 0) {
      const goal = goals.find((g) => g.id === lastActiveGoalId);
      if (goal) {
        setActiveGoal(goal);
      }
    } else if (goals.length > 0 && !activeGoal) {
      setActiveGoal(goals[0]);
    }
  }, [goals]);

  const handleGoalSelect = async (goal: Goal) => {
    setActiveGoal(goal);
    localStorage.setItem('lastActiveGoalId', goal.id);
    router.push('/dashboard');
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
  };

  // Filter spaces based on active goal
  const filteredSpaces = spaces.filter((space) => activeGoal?.spaces.includes(space.id));

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <motion.div
        className="fixed left-0 top-0 z-30 h-full"
        onMouseEnter={() => !open && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.2 }}
      >
        <Sidebar open={isExpanded} setOpen={setOpen} className="h-full border-r">
          <SidebarBody className="flex h-full flex-col">
            {/* Logo and Brand */}
            <div className="flex items-center justify-between px-4 py-4">
              <Logo open={isExpanded} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(!open)}
              >
                {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6 overflow-y-auto px-4">
              {/* Goal Switcher */}
              <motion.div
                animate={{ opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn(!isExpanded && 'hidden')}
              >
                <GoalSwitcher
                  goals={goals}
                  onGoalSelect={handleGoalSelect}
                  onCreateGoal={handleCreateGoal}
                  initialGoalId={activeGoal?.id}
                />
              </motion.div>

              {/* Main Links */}
              <div className="space-y-1">
                {mainLinks.map((link) => (
                  <SidebarLink
                    key={link.href}
                    link={{
                      ...link,
                      label: isExpanded ? link.label : '',
                    }}
                  />
                ))}
              </div>

              {/* Spaces */}
              {filteredSpaces.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className={cn(
                      'text-xs font-semibold uppercase text-muted-foreground',
                      !isExpanded && 'hidden'
                    )}
                  >
                    Goal Spaces
                  </h2>
                  <div className="space-y-1">
                    {filteredSpaces.map((space) => (
                      <SidebarLink
                        key={space.id}
                        link={{
                          label: isExpanded ? space.title : '',
                          href: `/space/${space.id}`,
                          icon:
                            space.category === 'learning' ? (
                              <Brain
                                className="h-5 w-5 flex-shrink-0"
                                style={{ color: space.space_color?.main }}
                              />
                            ) : (
                              <Target
                                className="h-5 w-5 flex-shrink-0"
                                style={{ color: space.space_color?.main }}
                              />
                            ),
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Links */}
            <div className="border-t px-4 py-4">
              <div className="space-y-1">
                {bottomLinks.map((link) => (
                  <SidebarLink
                    key={link.href}
                    link={{
                      ...link,
                      label: isExpanded ? link.label : '',
                    }}
                  />
                ))}
                <SidebarLink
                  link={{
                    label: isExpanded ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : '',
                    href: '#',
                    icon:
                      theme === 'light' ? (
                        <Moon className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <Sun className="h-5 w-5 flex-shrink-0" />
                      ),
                  }}
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 pl-[64px]">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

const Logo = ({ open }: { open: boolean }) => {
  return (
    <div className="flex items-center gap-2">
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

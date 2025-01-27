'use client';

import { useRouter } from 'next/navigation';
import { useSpaceStore } from '@/lib/store';
import { AppSidebar } from '@/components/app-sidebar';
import { useEffect, useState } from 'react';
import type { Goal } from '@/lib/store';
import { SpaceThemeProvider } from '@/components/providers/space-theme-provider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [initialGoalId, setInitialGoalId] = useState<string | undefined>();
  const { setActiveGoal, goals } = useSpaceStore();

  useEffect(() => {
    // Get the last active goal ID from localStorage
    const lastActiveGoalId = localStorage.getItem('lastActiveGoalId');
    if (lastActiveGoalId && goals.find(g => g.id === lastActiveGoalId)) {
      setInitialGoalId(lastActiveGoalId);
      setActiveGoal(goals.find(g => g.id === lastActiveGoalId)!);
    }
  }, [goals, setActiveGoal]);

  const handleGoalSelect = (goal: Goal) => {
    localStorage.setItem('lastActiveGoalId', goal.id);
    setActiveGoal(goal);
    router.push(`/space/${goal.id}`);
  };

  const handleCreateGoal = () => {
    router.push('/create-goal');
  };

  return (
    <SpaceThemeProvider>
      <div className="relative min-h-screen">
        <AppSidebar
          goals={goals}
          onGoalSelect={handleGoalSelect}
          onCreateGoal={handleCreateGoal}
          initialGoalId={initialGoalId}
        >
          <main className="min-h-screen transition-all duration-200 ease-in-out">
            <div className="container mx-auto py-8 px-4">
              {children}
            </div>
          </main>
        </AppSidebar>
      </div>
    </SpaceThemeProvider>
  );
}

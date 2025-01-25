'use client';

import { useRouter } from 'next/navigation';
import { useSpaceStore } from '@/lib/store';
import { AppSidebar } from "../../components/app-sidebar";
import { SpaceThemeProvider } from '@/components/providers/space-theme-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { goals } = useSpaceStore();

  const handleGoalSelect = (goal: any) => {
    localStorage.setItem('lastActiveGoalId', goal.id);
    router.push('/dashboard');
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
  };

  return (
    <SpaceThemeProvider>
      <div className="relative min-h-screen">
        <AppSidebar 
          goals={goals} 
          onGoalSelect={handleGoalSelect}
          onCreateGoal={handleCreateGoal}
          initialGoalId={localStorage.getItem('lastActiveGoalId') || undefined}
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

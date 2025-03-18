'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsUpDown, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export type Goal = {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline?: string | null;
  progress?: number | null;
  spaces?: string[];
  createdAt?: number;
  status?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function GoalSwitcher({
  goals,
  onGoalSelect,
  onCreateGoal,
  initialGoalId,
}: {
  goals: Goal[];
  onGoalSelect: (goal: Goal) => void;
  onCreateGoal: () => void;
  initialGoalId?: string;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<Goal | undefined>(
    initialGoalId ? goals.find((g) => g.id === initialGoalId) : goals[0]
  );

  // Update active goal when goals or initialGoalId changes
  React.useEffect(() => {
    if (initialGoalId) {
      const goal = goals.find((g) => g.id === initialGoalId);
      if (goal && goal.id !== activeGoal?.id) {
        setActiveGoal(goal);
      }
    } else if (goals.length > 0 && !activeGoal) {
      setActiveGoal(goals[0]);
    }
  }, [goals, initialGoalId, activeGoal]);

  const handleGoalSelect = async (goal: Goal) => {
    try {
      setIsLoading(true);
      setActiveGoal(goal);

      // Store the selected goal ID in localStorage
      localStorage.setItem('lastActiveGoalId', goal.id);

      // Call the parent handler
      await onGoalSelect(goal);

      // If not on dashboard, redirect there
      if (pathname !== '/dashboard') {
        router.push('/dashboard');
      }

      toast({
        title: 'Goal switched',
        description: `Now working on: ${goal.title}`,
      });
    } catch (error) {
      console.error('Error switching goal:', error);
      toast({
        title: 'Error switching goal',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-500';
    if (progress >= 50) return 'text-blue-500';
    if (progress >= 20) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
    onCreateGoal();
  };

  // Handle single goal state
  const isSingleGoal = goals.length === 1;
  const hasGoals = goals.length > 0;

  // Wrap handleGoalSelect in useCallback to stabilize its identity
  const memoizedHandleGoalSelect = React.useCallback(handleGoalSelect, [onGoalSelect, pathname, router, toast]);

  // Update keyboard shortcuts handling
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !isSingleGoal) {
        const num = parseInt(event.key);
        if (!isNaN(num) && num > 0 && num <= goals.length) {
          memoizedHandleGoalSelect(goals[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goals, isSingleGoal, memoizedHandleGoalSelect]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {hasGoals ? (
          <div className="w-full">
            {!isSingleGoal ? (
              // Multi-goal dropdown version
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isLoading}>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "w-full justify-start hover:bg-muted px-3 py-2 group",
                      isLoading && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                      <span className="truncate font-semibold">
                        {activeGoal?.title || 'Select a Goal'}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {!isLoading && `⌘${goals.findIndex(g => g.id === activeGoal?.id) + 1}`}
                        </span>
                      </span>
                      <span className={cn('truncate text-xs', getProgressColor(activeGoal?.progress || 0))}>
                        {isLoading ? 'Switching...' : `${Math.round(activeGoal?.progress || 0)}% Complete`}
                      </span>
                    </div>
                    <ChevronsUpDown className={cn('ml-auto size-4', isLoading && 'animate-pulse')} />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-56 w-[--radix-dropdown-menu-trigger-width] rounded-lg"
                  align="start"
                  side={isMobile ? 'bottom' : 'right'}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Your Goals ({goals.length})
                  </DropdownMenuLabel>
                  {goals.map((goal, index) => (
                    <DropdownMenuItem
                      key={goal.id}
                      onClick={() => handleGoalSelect(goal)}
                      className={cn(
                        'gap-2 p-2',
                        activeGoal?.id === goal.id && 'bg-accent',
                        isLoading && 'pointer-events-none opacity-50'
                      )}
                    >
                      <div className="size-6 flex items-center justify-center rounded-sm border">
                        <Target className={cn('size-4 shrink-0', getProgressColor(goal.progress || 0))} />
                      </div>
                      <div className="flex-1 truncate">{goal.title}</div>
                      <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateGoal} className="gap-2 p-2" disabled={isLoading}>
                    <div className="size-6 flex items-center justify-center rounded-md border bg-background">
                      <Plus className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">Add new goal</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Single goal static display
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold truncate">{activeGoal?.title}</div>
                  <div className={cn(
                    'text-xs truncate',
                    getProgressColor(activeGoal?.progress || 0),
                    isLoading && 'animate-pulse'
                  )}>
                    {isLoading ? 'Updating...' : `${Math.round(activeGoal?.progress || 0)}% Complete`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateGoal}
                  className="rounded-full h-8 w-8 p-0 hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          // No goals state
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-sm"
            onClick={onCreateGoal}
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold">Create your first goal</span>
          </Button>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

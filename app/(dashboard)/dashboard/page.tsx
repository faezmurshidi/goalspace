'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Clock,
  ListTodo,
  MessageSquare,
  PlusCircle,
  Target,
  Trophy,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SpacesGrid } from '@/components/spaces-grid';

const mockData = [
  { name: 'Mon', value: 40 },
  { name: 'Tue', value: 30 },
  { name: 'Wed', value: 60 },
  { name: 'Thu', value: 45 },
  { name: 'Fri', value: 80 },
  { name: 'Sat', value: 65 },
  { name: 'Sun', value: 75 },
];

const mockTodos = [
  { id: '1', text: 'Complete Python basics module', completed: false },
  { id: '2', text: 'Review machine learning concepts', completed: true },
  { id: '3', text: 'Work on portfolio project', completed: false },
  { id: '4', text: 'Read documentation', completed: false },
];

export default function DashboardPage({ stats }: { stats?: React.ReactNode }) {
  const router = useRouter();
  const { spaces, goals, loadUserData } = useSpaceStore();
  const [activeGoal, setActiveGoal] = useState<(typeof goals)[0] | undefined>();

  // Load user data and initialize active goal
  useEffect(() => {
    const initialize = async () => {
      await loadUserData();
      const lastActiveGoalId = localStorage.getItem('lastActiveGoalId');
      if (lastActiveGoalId && goals.length > 0) {
        const goal = goals.find((g) => g.id === lastActiveGoalId);
        if (goal) {
          setActiveGoal(goal);
        }
      } else if (goals.length > 0) {
        setActiveGoal(goals[0]);
      }
    };
    
    initialize();
  }, [loadUserData, goals]);

  // Filter spaces based on active goal
  const filteredSpaces = spaces.filter((space) => activeGoal?.spaces.includes(space.id));

  if (!activeGoal && goals.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <Button onClick={() => router.push('/goal')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>New Goal</span>
          </Button>
        </div>
        
        {/* Show stats if provided via parallel route */}
        {stats}
        
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">No goals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first goal to get started on your learning journey.
          </p>
          <Button onClick={() => router.push('/goal')} className="mt-4 gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>New Goal</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button onClick={() => router.push('/goal')} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          <span>New Goal</span>
        </Button>
      </div>
      
      {/* Stats are rendered here from parallel route */}
      {stats}
      
      {/* Goal Overview Card */}
      {activeGoal && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{activeGoal.title}</CardTitle>
                <CardDescription>{activeGoal.description}</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Progress value={activeGoal.progress} className="w-[100px]" />
                  <span className="text-sm font-medium">{Math.round(activeGoal.progress)}%</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Due: {new Date(activeGoal.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Spaces Grid */}
      {filteredSpaces.length > 0 ? (
        <div>
          <h2 className="font-semibold text-xl mb-4">Your Learning Spaces</h2>
          <SpacesGrid spaces={filteredSpaces} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">No spaces for this goal</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add learning spaces to your goal to get started.
          </p>
        </div>
      )}
    </div>
  );
}

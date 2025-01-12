'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { ChatWindow } from '@/components/chat-window';
import { ActivityCard } from '@/components/ui/activity-card';
import type { Goal, Metric } from '@/components/ui/activity-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { getCurrentUser } from '@/lib/auth';
import { useSpaceStore } from '@/lib/store';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const INITIAL_METRICS: Metric[] = [
  { label: 'Move', value: '420', trend: 85, unit: 'cal' },
  { label: 'Exercise', value: '35', trend: 70, unit: 'min' },
  { label: 'Stand', value: '10', trend: 83, unit: 'hrs' },
];

const INITIAL_GOALS: Goal[] = [
  { id: '1', title: '30min Morning Yoga', isCompleted: true },
  { id: '2', title: '10k Steps', isCompleted: false },
  { id: '3', title: 'Drink 2L Water', isCompleted: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const { spaces, goals, toggleSpaceCollapse, loadUserData } = useSpaceStore();

  // Load user data when dashboard mounts
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const [activityGoals, setActivityGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [activityMetrics, setActivityMetrics] = useState<Metric[]>(INITIAL_METRICS);

  const handleToggleGoal = (goalId: string) => {
    setActivityGoals((prev) =>
      prev.map((goal) => (goal.id === goalId ? { ...goal, isCompleted: !goal.isCompleted } : goal))
    );
  };

  const handleAddGoal = () => {
    const newGoal: Goal = {
      id: `goal-${activityGoals.length + 1}`,
      title: `New Goal ${activityGoals.length + 1}`,
      isCompleted: false,
    };
    setActivityGoals((prev) => [...prev, newGoal]);
  };

  const handleViewDetails = () => {
    console.log('Viewing details');
  };

  const testUserInsert = async () => {
    try {
      // Get current user
      const { user, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      console.log('Current user:', user);

      // Call our API endpoint to create the user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Verify the insert using normal client (to test RLS)
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw verifyError;
      }

      console.log('User data:', userData);
      alert('Successfully saved user to Supabase!');
    } catch (error) {
      console.error('Error saving user to Supabase:', error);
      alert('Error saving user to Supabase: ' + (error as Error).message);
    }
  };

  const testGoalInsert = async () => {
    try {
      // Get current user
      const { user, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      console.log('Current user:', user);

      // Call our API endpoint to create the goal
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          goal: {
            title: 'Test Goal',
            description: 'This is a test goal',
            category: 'learning',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create goal');
      }

      // Verify the insert using normal client (to test RLS)
      const { data: goalData, error: verifyError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', data.goal.id)
        .single();

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw verifyError;
      }

      console.log('Goal data:', goalData);
      alert('Successfully saved goal to Supabase!');
    } catch (error) {
      console.error('Error saving goal to Supabase:', error);
      alert('Error saving goal to Supabase: ' + (error as Error).message);
    }
  };

  // Sort goals by creation date, most recent first
  const sortedGoals = [...goals].sort((a, b) => b.createdAt - a.createdAt);

  // Prepare data for the line chart
  const chartData = sortedGoals.map((goal) => ({
    title: goal.title,
    progress: goal.progress,
  }));

  return (
    <div className="flex h-full flex-col space-y-8 overflow-y-auto p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="space-x-4">
          <Button onClick={testUserInsert} variant="outline">
            Test User Insert
          </Button>
          <Button onClick={testGoalInsert} variant="outline">
            Test Goal Insert
          </Button>
          <Button onClick={() => router.push('/')}>Create New Goal</Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Card */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-4 text-xl font-semibold">
            Recent Activity
          </h2>
          <ActivityCard
            metrics={activityMetrics}
            dailyGoals={activityGoals}
            onAddGoal={handleAddGoal}
            onToggleGoal={handleToggleGoal}
            onViewDetails={handleViewDetails}
          />
        </section>

        {/* Chat Window */}
        <section aria-labelledby="chat-heading" className="lg:col-span-2">
          <h2 id="chat-heading" className="mb-4 text-xl font-semibold">
            Chat Assistant
          </h2>
          <ChatWindow />
        </section>

        {/* Goals Overview */}
        <section aria-labelledby="goals-heading" className="lg:col-span-3">
          <h2 id="goals-heading" className="mb-4 text-xl font-semibold">
            Goals Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <CardDescription>Due: {goal.dueDate}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Progress value={goal.progress} className="flex-1" />
                    <span className="text-sm font-medium">{Math.round(goal.progress)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Progress Chart */}
        {goals.length > 0 && (
          <section aria-labelledby="progress-heading" className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <XAxis
                        dataKey="title"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Line
                        type="monotone"
                        dataKey="progress"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Learning Spaces */}
        <section aria-labelledby="spaces-heading" className="lg:col-span-3">
          <h2 id="spaces-heading" className="mb-4 text-xl font-semibold">
            Learning Spaces
          </h2>
          <div className="grid gap-4">
            {spaces.map((space) => (
              <Collapsible
                key={space.id}
                open={!space.isCollapsed}
                onOpenChange={() => toggleSpaceCollapse(space.id)}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {space.category === 'learning' ? (
                              <Brain
                                className="h-5 w-5"
                                style={{ color: space.space_color?.main }}
                              />
                            ) : (
                              <Target
                                className="h-5 w-5"
                                style={{ color: space.space_color?.main }}
                              />
                            )}
                            {space.title}
                          </CardTitle>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {space.isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                              <span className="sr-only">Toggle space content</span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Progress
                            value={space.progress}
                            className="flex-1"
                            style={
                              {
                                '--progress-color': space.space_color?.main,
                              } as any
                            }
                          />
                          <span className="text-sm font-medium">
                            {Math.round(space.progress || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{space.description}</p>
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Objectives:</h4>
                          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {space.objectives.map((objective, index) => (
                              <li key={index}>{objective}</li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          onClick={() => router.push(`/space/${space.id}`)}
                          className="w-full"
                          style={{
                            backgroundColor: space.space_color?.main,
                            borderColor: space.space_color?.main,
                          }}
                        >
                          Go to Space
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

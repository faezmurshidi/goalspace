'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  ListTodo,
  MessageSquare,
  Target,
  Trophy,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

export default function DashboardPage() {
  const router = useRouter();
  const { spaces, goals, toggleSpaceCollapse, loadUserData } = useSpaceStore();
  const [activeGoal, setActiveGoal] = useState<(typeof goals)[0] | undefined>();

  // Load user data and initialize active goal
  useEffect(() => {
    loadUserData();
    const lastActiveGoalId = localStorage.getItem('lastActiveGoalId');
    if (lastActiveGoalId && goals.length > 0) {
      const goal = goals.find((g) => g.id === lastActiveGoalId);
      if (goal) {
        setActiveGoal(goal);
      }
    } else if (goals.length > 0) {
      setActiveGoal(goals[0]);
    }
  }, [loadUserData, goals]);

  // Filter spaces based on active goal
  const filteredSpaces = spaces.filter((space) => activeGoal?.spaces.includes(space.id));

  if (!activeGoal) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Active Goal</CardTitle>
            <CardDescription>Please select or create a goal to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/goals/new')}>Create New Goal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Goal Overview Card */}
        <Card className="col-span-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{activeGoal.title}</CardTitle>
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

        {/* Progress Chart */}
        <Card className="col-span-2 row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockData}>
                  <XAxis
                    dataKey="name"
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
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Todo List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Todo List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    className="h-4 w-4 rounded border-gray-300"
                    onChange={() => {}}
                  />
                  <span
                    className={cn(
                      'text-sm',
                      todo.completed && 'text-muted-foreground line-through'
                    )}
                  >
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Spaces Overview */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Learning Spaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {filteredSpaces.map((space) => (
                <div
                  key={space.id}
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/space/${space.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {space.category === 'learning' ? (
                    <Brain className="h-8 w-8" style={{ color: space.space_color?.main }} />
                  ) : (
                    <Target className="h-8 w-8" style={{ color: space.space_color?.main }} />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{space.title}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={space.progress || 0} className="flex-1" />
                      <span className="text-sm">{Math.round(space.progress || 0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Quick Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed">
              <Button variant="outline" onClick={() => {}}>
                Start a Chat
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-2xl font-bold">12.5 hrs</div>
              <div className="text-sm text-muted-foreground">Time spent this week</div>
              <Progress value={65} className="w-full" />
              <div className="text-sm text-muted-foreground">65% of weekly goal</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Brain, Sparkles, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Goal, Space } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGoals: 0,
    activeSpaces: 0,
    completedTasks: 0,
    aiInteractions: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch goals
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      // Fetch spaces
      const { data: spaces } = await supabase
        .from('spaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Fetch completed tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Fetch AI interactions
      const { data: user_data } = await supabase
        .from('user_settings')
        .select('api_calls_count')
        .eq('user_id', user.id)
        .single();

      setStats({
        totalGoals: goals?.length || 0,
        activeSpaces: spaces?.length || 0,
        completedTasks: tasks?.length || 0,
        aiInteractions: user_data?.api_calls_count || 0,
      });
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your progress.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              Active goals in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Spaces</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Learning spaces in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks marked as complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiInteractions}</div>
            <p className="text-xs text-muted-foreground">
              Total AI-powered assists
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Goals</CardTitle>
            <CardDescription>
              Your most recently created or updated goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add recent goals list here */}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Your recent activity and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add activity feed here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
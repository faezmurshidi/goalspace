'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useRouter } from 'next/navigation';

import { MainNav } from '@/components/main-nav';
import { SpacesSidebar } from '@/components/spaces-sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Brain, Target } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { spaces, goals, toggleSpaceCollapse, isSidebarCollapsed } = useSpaceStore();

  // Sort goals by creation date, most recent first
  const sortedGoals = [...goals].sort((a, b) => b.createdAt - a.createdAt);

  // Prepare data for the line chart
  const chartData = sortedGoals.map(goal => ({
    title: goal.title,
    progress: goal.progress,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <div className="flex-1 flex">
        <SpacesSidebar />
        <main className={cn(
          "flex-1 space-y-8 p-8 transition-[margin] duration-300",
          isSidebarCollapsed ? "ml-16" : "ml-64"
        )}>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <Button onClick={() => router.push('/')}>Create New Goal</Button>
          </div>

          {/* Goals Overview */}
          <section aria-labelledby="goals-heading">
            <h2 id="goals-heading" className="text-xl font-semibold mb-4">
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
            <section aria-labelledby="progress-heading" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                      >
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
          <section aria-labelledby="spaces-heading" className="mt-8">
            <h2 id="spaces-heading" className="text-xl font-semibold mb-4">
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
                          <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {space.category === 'learning' ? (
                                <Brain className="h-5 w-5" style={{ color: space.space_color?.main }} />
                              ) : (
                                <Target className="h-5 w-5" style={{ color: space.space_color?.main }} />
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
                              style={{
                                '--progress-color': space.space_color?.main
                              } as any}
                            />
                            <span className="text-sm font-medium">{Math.round(space.progress || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {space.description}
                          </p>
                          <div>
                            <h4 className="font-medium text-sm mb-2">Objectives:</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
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
                              '--hover-bg': space.space_color?.tertiary,
                            } as any}
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
        </main>
      </div>
    </div>
  );
} 
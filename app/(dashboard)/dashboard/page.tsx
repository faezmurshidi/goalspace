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
  Star,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import React from 'react';

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
import { ChatComponent } from "@upstash/rag-chat-component";
import { SkillTree } from '@/components/skill-tree';
import { calculateNodePositions } from '@/lib/utils/skill-tree';

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

// Sample user progress
const userProgress = {
  currentLevel: 2,
  totalXP: 350,
  currentLevelXP: 100,
  xpToNextLevel: 250
};

export default function DashboardPage() {
  const router = useRouter();
  const { spaces, goals, toggleSpaceCollapse, loadUserData, currentGoal } = useSpaceStore();
  const [activeGoal, setActiveGoal] = useState<(typeof goals)[0] | undefined>();
  const [skillNodes, setSkillNodes] = useState<any[]>([]);
  const [positionedNodes, setPositionedNodes] = useState<any[]>([]);

  // Generate skill tree from goal and spaces - memoized to prevent unnecessary recalculations
  const generateSkillTreeFromGoal = React.useCallback((goal: (typeof goals)[0], spaces: any[]) => {
    if (!goal) return [];

    const nodes: any[] = [
      // Root node (Goal)
      {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: "milestone" as const,
        status: "completed" as const,
        xp: 100,
        requirements: {
          parentNodes: [],
          minLevel: 1
        },
        position: { x: 0, y: 0 }
      }
    ];

    // Add space nodes
    spaces.forEach((space) => {
      // Space node
      nodes.push({
        id: `space-${space.id}`,
        title: space.title,
        description: space.description || "Learning space",
        type: "milestone" as const,
        status: space.progress === 100 ? "completed" as const : 
               space.progress > 0 ? "unlocked" as const : 
               "locked" as const,
        xp: 150,
        requirements: {
          parentNodes: [goal.id],
          minLevel: 1
        },
        position: { x: 0, y: 0 }
      });

      // Add modules for each space
      (space.modules || []).forEach((module: any, moduleIndex: number) => {
        // Module node
        nodes.push({
          id: `module-${space.id}-${moduleIndex}`,
          title: module.title || `Module ${moduleIndex + 1}`,
          description: module.description || "Learning module",
          type: "practice" as const,
          status: module.completed ? "completed" as const :
                 module.started ? "unlocked" as const :
                 "locked" as const,
          xp: 200,
          requirements: {
            parentNodes: [`space-${space.id}`],
            minLevel: 1
          },
          position: { x: 0, y: 0 }
        });

        // Add tasks for each module
        (module.tasks || []).forEach((task: any, taskIndex: number) => {
          nodes.push({
            id: `task-${space.id}-${moduleIndex}-${taskIndex}`,
            title: task.title || `Task ${taskIndex + 1}`,
            description: task.description || "Complete this task",
            type: "task" as const,
            status: task.completed ? "completed" as const :
                   task.available ? "unlocked" as const :
                   "locked" as const,
            xp: 50,
            requirements: {
              parentNodes: [`module-${space.id}-${moduleIndex}`],
              minLevel: 1
            },
            position: { x: 0, y: 0 }
          });
        });
      });
    });

    return nodes;
  }, []); // Empty dependency array since this is just a calculation function

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
  const filteredSpaces = React.useMemo(() => 
    spaces.filter((space) => activeGoal?.spaces.includes(space.id)),
    [spaces, activeGoal?.spaces]
  );

  // Update skill tree when active goal or spaces change
  useEffect(() => {
    if (activeGoal) {
      const nodes = generateSkillTreeFromGoal(activeGoal, filteredSpaces);
      setSkillNodes(nodes);
    }
  }, [activeGoal, filteredSpaces, generateSkillTreeFromGoal]);

  // Calculate node positions when skillNodes change
  useEffect(() => {
    if (skillNodes.length > 0) {
      const positioned = calculateNodePositions(skillNodes, 1200, 800, 150, 120);
      setPositionedNodes(positioned);
    }
  }, [skillNodes]);

  const handleNodeClick = React.useCallback((node: any) => {
    const nodeType = node.id.split('-')[0];
    switch (nodeType) {
      case 'space':
        const spaceId = node.id.split('-')[1];
        router.push(`/space/${spaceId}`);
        break;
      case 'module':
        const moduleSpaceId = node.id.split('-')[1];
        const moduleIndex = node.id.split('-')[2];
        router.push(`/space/${moduleSpaceId}?module=${moduleIndex}`);
        break;
      case 'task':
        const taskSpaceId = node.id.split('-')[1];
        const taskModuleIndex = node.id.split('-')[2];
        const taskIndex = node.id.split('-')[3];
        router.push(`/space/${taskSpaceId}?module=${taskModuleIndex}&task=${taskIndex}`);
        break;
      default:
        console.log('Goal node clicked:', node);
    }
  }, [router]);

  if (!activeGoal) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-[400px] border-none shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Star className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
              </motion.div>
              <CardTitle className="text-2xl font-semibold text-gray-800">Welcome to Your Journey</CardTitle>
              <CardDescription className="text-gray-600">Create your first goal to start your learning adventure</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button
                onClick={() => router.push('/goals/new')}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-2 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Create New Goal
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Your Learning Journey
              </h1>
              <p className="mt-2 text-gray-600">
                Track your progress and unlock new achievements
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-700">{userProgress.totalXP} XP</span>
              </div>
              <Button
                onClick={() => router.push('/goals/new')}
                className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl"
              >
                New Goal
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Skill Tree Section - Spans full width */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
          >
            <SkillTree
              nodes={positionedNodes}
              userProgress={userProgress}
              onNodeClick={handleNodeClick}
            />
          </motion.div>

          {/* Active Goal Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-8"
          >
            <Card className="border-none shadow-lg bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      {activeGoal.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {activeGoal.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-[120px] h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${activeGoal.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {Math.round(activeGoal.progress)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Due: {new Date(activeGoal.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Progress Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 lg:col-span-4"
          >
            <Card className="border-none shadow-lg bg-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockData}>
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning Spaces Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-12"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Learning Spaces</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpaces.map((space, index) => (
                <motion.div
                  key={space.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card
                    className="border-none shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer bg-white"
                    onClick={() => router.push(`/space/${space.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {space.category === 'learning' ? (
                          <div className="p-3 bg-blue-50 rounded-xl">
                            <Brain className="h-6 w-6" style={{ color: space.space_color?.main }} />
                          </div>
                        ) : (
                          <div className="p-3 bg-purple-50 rounded-xl">
                            <Target className="h-6 w-6" style={{ color: space.space_color?.main }} />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{space.title}</h3>
                          <div className="mt-2">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${space.progress || 0}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            <div className="mt-1 flex justify-between items-center">
                              <span className="text-xs text-gray-500">Progress</span>
                              <span className="text-xs font-medium text-gray-700">
                                {Math.round(space.progress || 0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

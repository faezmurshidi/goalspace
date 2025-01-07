'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, Target, List, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { MarkdownContent } from '@/components/markdown-content';
import { ChatWithMentor } from '@/components/chat-with-mentor';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SpacesSidebar } from '@/components/spaces-sidebar';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  
  const { getSpaceById, todoStates, toggleTodo, setPlan: setStorePlan, addDocument, isSidebarCollapsed } = useSpaceStore();
  const space = getSpaceById(spaceId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space?.category,
          title: space?.title,
          description: space?.description,
          objectives: space?.objectives,
          prerequisites: space?.prerequisites,
          mentor: space?.mentor,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      
      const data = await response.json();
      setStorePlan(spaceId, data.plan);
      
      // Save plan to knowledge base
      addDocument(spaceId, {
        title: `Learning Plan: ${space?.title}`,
        content: data.plan,
        type: 'guide',
        tags: ['learning-plan', space?.category || ''],
      });
    } catch (err) {
      setError('Failed to generate plan. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!space) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SiteHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
              <p className="text-gray-500">This space doesn't exist or has been removed.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SiteHeader />
      <div className="flex">
        <SpacesSidebar />
        <main className={cn(
          "flex-1 transition-[margin] duration-300",
          isSidebarCollapsed ? "ml-16" : "ml-64"
        )}>
          <div className="container-fluid mx-auto px-4 py-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-sm px-3 py-1 rounded-full font-medium",
                  space.category === 'learning'
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}>
                  {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                </span>
              </div>

              <div className="grid gap-8 lg:grid-cols-10">
                {/* Main Content */}
                <div className="lg:col-span-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {space.category === 'learning' ? (
                          <Brain className="h-6 w-6 text-blue-500" />
                        ) : (
                          <Target className="h-6 w-6 text-green-500" />
                        )}
                        {space.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        <MarkdownContent content={space.description} />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Objectives Section */}
                      <div>
                        <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          Learning Objectives
                        </h3>
                        <div className="text-sm space-y-2">
                          {space.objectives.map((objective, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-green-500 text-xs mt-1.5">•</span>
                              <MarkdownContent 
                                content={objective}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prerequisites Section */}
                      {space.prerequisites.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                            <List className="h-4 w-4 text-orange-500" />
                            Prerequisites
                          </h3>
                          <div className="text-sm space-y-2">
                            {space.prerequisites.map((prerequisite, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-orange-500 text-xs mt-1.5">•</span>
                                <MarkdownContent 
                                  content={prerequisite}
                                  className="flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                     
                    </CardContent>
                  </Card>

                   {/* Knowledge Base */}
                   <KnowledgeBase spaceId={spaceId} />

                   {/* To-Do List Card */}
                   <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <List className="h-5 w-5 text-blue-500" />
                        To-Do List
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {space.to_do_list.map((task, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <Checkbox
                              id={`${space.id}-todo-${index}`}
                              checked={todoStates[space.id]?.[index] || false}
                              onCheckedChange={() => toggleTodo(space.id, index.toString())}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={`${space.id}-todo-${index}`}
                              className={cn(
                                "text-sm flex-1 cursor-pointer",
                                todoStates[space.id]?.[index]
                                  ? "line-through text-gray-400"
                                  : "text-gray-600 dark:text-gray-300"
                              )}
                            >
                              {task}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Learning Plan Section */}
                  {/* <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Brain className="h-5 w-5 text-blue-500" />
                          Learning Plan
                        </CardTitle>
                        {!space.plan && (
                          <Button
                            onClick={generatePlan}
                            disabled={isGenerating}
                            className={cn(
                              "gap-2",
                              space.category === 'learning'
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            )}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4" />
                                Generate Plan
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {error && (
                        <div className="text-red-500 text-sm mb-4">
                          {error}
                        </div>
                      )}
                      {space.plan ? (
                        <MarkdownContent content={space.plan} />
                      ) : !isGenerating && (
                        <div className="text-center py-8 text-gray-500">
                          Click "Generate Plan" to have your AI mentor create a detailed learning plan.
                        </div>
                      )}
                    </CardContent>
                  </Card> */}

                 
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Mentor Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        Your AI Mentor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="font-medium">{space.mentor.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                          "{space.mentor.introduction}"
                        </p>
                        <p className="text-sm text-gray-500">
                          Teaching style: {space.mentor.personality}
                        </p>
                        <div className="text-sm">
                          <span className="text-gray-500">Expert in: </span>
                          {space.mentor.expertise.join(', ')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                 

                  {/* Chat Section */}
                  <div className="lg:sticky lg:top-8">
                    <ChatWithMentor spaceId={spaceId} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 
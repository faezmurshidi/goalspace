'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Target, ArrowLeft, MessageSquare } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '@/components/markdown-content';
import { ChatWithMentor } from '@/components/chat-with-mentor';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SpaceContentEditor } from '@/components/space-content-editor';
import { SpacesSidebar } from '@/components/spaces-sidebar';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  
  const { 
    getSpaceById, 
    todoStates, 
    toggleTodo, 
    setPlan: setStorePlan, 
    setResearch, 
    addDocument,
    isSidebarCollapsed 
  } = useSpaceStore();
  
  const space = getSpaceById(spaceId);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(true);
  const [showChat, setShowChat] = useState(true);

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
                  "text-sm px-3 py-1 rounded-full font-medium transition-colors duration-200",
                  space.space_color 
                    ? `bg-[${space.space_color.secondary}] text-[${space.space_color.main}] dark:bg-[${space.space_color.main}]/20 dark:text-[${space.space_color.accent}]`
                    : space.category === 'learning'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}
                style={space.space_color ? {
                  backgroundColor: space.space_color.secondary,
                  color: space.space_color.main,
                  '--dark-bg': `${space.space_color.main}20`,
                  '--dark-text': space.space_color.accent,
                } as any : undefined}>
                  {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                </span>
              </div>

              <div className="grid gap-8 lg:grid-cols-10">
                {/* Main Content - Editor only */}
                <div className="lg:col-span-6">
                  <SpaceContentEditor 
                    space={space}
                    editable={true}
                    onUpdate={(content) => {
                      console.log('Content updated:', content);
                      // TODO: Implement content update logic
                    }}
                  />
                </div>

                {/* Right Side - Knowledge Base and Chat */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Knowledge Base */}
                  {showKnowledgeBase && (
                    <KnowledgeBase 
                      spaceId={spaceId} 
                      onClose={() => setShowKnowledgeBase(false)} 
                    />
                  )}
                  
                  {/* Chat Section */}
                  {showChat && (
                    <ChatWithMentor 
                      spaceId={spaceId} 
                      onClose={() => setShowChat(false)} 
                    />
                  )}

                  {/* Toggle buttons when components are hidden */}
                  <div className="flex gap-2">
                    {!showKnowledgeBase && (
                      <Button
                        variant="outline"
                        onClick={() => setShowKnowledgeBase(true)}
                        className="flex-1"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Show Knowledge Base
                      </Button>
                    )}
                    {!showChat && (
                      <Button
                        variant="outline"
                        onClick={() => setShowChat(true)}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Show Chat
                      </Button>
                    )}
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
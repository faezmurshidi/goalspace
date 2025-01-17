'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Brain, Loader2, MessageSquare, Sparkles, Target } from 'lucide-react';

import { ChatWithMentor } from '@/components/chat-with-mentor';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SiteHeader } from '@/components/site-header';
import { SpaceTools } from '@/components/space-tools';
import { SpacesSidebar } from '@/components/spaces-sidebar';
import { TodoList } from '@/components/todo-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { Separator } from '@/components/ui/separator';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

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
    isSidebarCollapsed,
    content: storedContent,
    setContent,
  } = useSpaceStore();

  const space = getSpaceById(spaceId);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(true);

  const currentContent =
    selectedDocument?.content || storedContent[spaceId] || space?.content || '';
  const contentTitle = selectedDocument?.title || space?.title || '';

  // Generate initial content when the component mounts
  useEffect(() => {
    const generateContent = async () => {
      // Skip if no space, or if content already exists
      if (!space || space.content || storedContent[spaceId]) return;

      setIsGenerating(true);
      setError(null);
      try {
        const response = await fetch('/api/generate-initial-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceDetails: space }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate content');
        }

        const data = await response.json();
        if (!data || !data.content) {
          throw new Error('Invalid response from server');
        }

        setContent(spaceId, data.content);

        // Save the generated content to the knowledge base
        if (space.title && space.category) {
          addDocument(spaceId, {
            title: `Initial Content: ${space.title}`,
            content: data.content,
            type: 'guide',
            tags: ['initial-content', space.category],
          });
        }
      } catch (error) {
        console.error('Error generating initial content:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate content');
      } finally {
        setIsGenerating(false);
      }
    };

    //generateContent();
  }, [space, storedContent, spaceId, setContent, addDocument]);

  if (!space) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold">Space Not Found</h1>
            <p className="text-muted-foreground">This space doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">{space.title}</h2>
          <span
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              space.category === 'learning'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
            )}
          >
            {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
          </span>
        </div>
        <p className="mt-2 text-muted-foreground">{space.description}</p>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-10">
        {/* Left Column - Main Content */}
        <div className="space-y-6 lg:col-span-6">
          {/* Knowledge Base */}
          {showKnowledgeBase && (
            <KnowledgeBase
              spaceId={spaceId}
              onClose={() => setShowKnowledgeBase(false)}
              onDocumentSelect={setSelectedDocument}
            />
          )}

          {/* Content Viewer */}
          <Card className="h-[calc(100vh-16rem)]">
            <CardHeader>
              <CardTitle>{contentTitle}</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto p-6">
              {isGenerating ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Generating content...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-destructive">
                    <p>{error}</p>
                    <Button variant="outline" onClick={() => setError(null)} className="mt-4">
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <MarkdownContent content={currentContent} id={spaceId} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tools and Chat */}
        <div className="space-y-6 lg:col-span-4">
          {/* Tools */}
          {showTools && <SpaceTools spaceId={spaceId} onClose={() => setShowTools(false)} />}

          {/* todo */}
          <TodoList spaceId={spaceId} />

          {/* Chat Section */}
          {showChat && <ChatWithMentor spaceId={spaceId} onClose={() => setShowChat(false)} />}

          {/* Toggle buttons when components are hidden */}
          <div className="flex flex-wrap gap-2">
            {!showKnowledgeBase && (
              <Button
                variant="outline"
                onClick={() => setShowKnowledgeBase(true)}
                className="flex-1"
              >
                <Brain className="mr-2 h-4 w-4" />
                Show Knowledge Base
              </Button>
            )}
            {!showTools && (
              <Button variant="outline" onClick={() => setShowTools(true)} className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" />
                Show Tools
              </Button>
            )}
            {!showChat && (
              <Button variant="outline" onClick={() => setShowChat(true)} className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Show Chat
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

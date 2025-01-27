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
import { useSpaceTheme } from '@/components/providers/space-theme-provider';
import { SpaceModule, type Module } from '@/components/space-module';
import { SpaceNavbar } from '@/components/space-navbar';
import { SpaceToolsWindow } from '@/components/space-tools-window';
import { CircularProgress } from '@/components/ui/circular-progress';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { setColors } = useSpaceTheme();

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
    setModules: setStoreModules,
    updateModule,
  } = useSpaceStore();

  const space = getSpaceById(spaceId);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modules, setModules] = useState<Module[]>(space?.modules || []);
  const [selectedDocument, setSelectedDocument] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [showModules, setShowModules] = useState(true);
  const [showTodo, setShowTodo] = useState(true);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  const handleModuleSelect = (content: string, title: string) => {
    setSelectedDocument({ title, content });
  };

  const currentContent =
    selectedDocument?.content || storedContent[spaceId] || space?.content || '';
  const contentTitle = selectedDocument?.title || space?.title || '';

  // Set space theme colors
  useEffect(() => {
    if (space?.space_color) {
      setColors(space.space_color);
    }
    return () => setColors(null);
  }, [space?.space_color, setColors]);

  console.log('space', space);

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
        if (data.modules) {
          setModules(data.modules);
        }

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

    const generateModules = async () => {
      if (!space) return;
      if(space.modules && space.modules.length > 0) {
        setModules(space.modules);
        return;
      }

      try {
        setIsGenerating(true);
        const response = await fetch('/api/generate-modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceDetails: space }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate modules');
        }

        const data = await response.json();
        if (!data || !data.modules) {
          throw new Error('Invalid response from server');
        }

        // Save modules to database
        await setStoreModules(spaceId, data.modules);
        setModules(data.modules);

      } catch (error) {
        console.error('Error generating modules:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate modules');
      } finally {
        setIsGenerating(false);
      }
    };

    //generateContent();
    generateModules();
  }, [space, storedContent, spaceId, setContent, addDocument, setStoreModules]);

  const handleModuleComplete = (moduleId: string) => {
    setModules(prevModules => 
      prevModules.map(module => 
        module.id === moduleId 
          ? { ...module, isCompleted: true }
          : module
      )
    );
    updateModule(spaceId, moduleId, { isCompleted: true });
  };

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
    <div className="relative h-screen w-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-30 border-b bg-white/50 px-4 py-2 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-medium">{space.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{space.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <CircularProgress 
              value={(currentModuleIndex / modules.length) * 100}
              className="h-8 w-8"
              strokeWidth={2}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {Math.round((currentModuleIndex / modules.length) * 100)}% Complete
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid h-[calc(100vh-56px)] grid-cols-12 gap-6 pt-14 px-6">
        {/* Content Area */}
        <div className="col-span-8 h-full overflow-y-auto">
          <div className="prose prose-slate mx-auto max-w-4xl px-8 py-12 dark:prose-invert">
            <MarkdownContent content={currentContent} id={spaceId} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 h-full">
          <div className="sticky top-[4.5rem] space-y-4">
            {/* Tools Section - 40% height */}
            <Card className="h-[calc((100vh-7rem)*0.4)] overflow-hidden border-none bg-white/50 shadow-sm backdrop-blur-xl dark:bg-slate-900/50">
              <SpaceToolsWindow
                spaceId={spaceId}
                modules={modules}
                onModuleComplete={handleModuleComplete}
                onModuleSelect={handleModuleSelect}
                onDocumentSelect={setSelectedDocument}
              />
            </Card>

            {/* Chat Section - 60% height */}
            <div className="h-[calc((100vh-7rem)*0.6-1rem)] overflow-hidden rounded-lg bg-white/50 backdrop-blur-xl dark:bg-slate-900/50">
              <ChatWithMentor spaceId={spaceId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ListChecks, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { ChatWithMentor } from '@/components/chat-with-mentor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { useSpaceStore } from '@/lib/store';
import { useSpaceTheme } from '@/components/providers/space-theme-provider';
import { SpaceToolsWindow } from '@/components/space-tools-window';
import { CircularProgress } from '@/components/ui/circular-progress';
import { type Module } from '@/lib/types/module';
import { KnowledgeBase } from '@/components/knowledge-base';
import { TodoList } from '@/components/todo-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Podcast } from '@/components/podcast';
import Tiptap from '@/components/TipTap';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { setColors } = useSpaceTheme();
  const initializingRef = useRef(false);

  const {
    getSpaceById,
    content: storedContent,
    setContent,
    fetchModules,
    modulesBySpaceId,
    currentModuleIndexBySpaceId,
    setCurrentModuleIndex,
    updateModule,
    getCurrentModule,
    createModule,
    addDocument,
    loadUserData,
    loadDocuments,
    fetchTasks
  } = useSpaceStore();

  const space = getSpaceById(spaceId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modules = modulesBySpaceId[spaceId] || [];
  const currentModuleIndex = currentModuleIndexBySpaceId[spaceId] || 0;
  const currentModule = getCurrentModule(spaceId);

  // Function to create tasks from module content
  const createTask = async (spaceId: string, moduleDoc: any) => {
    try {
      const tasks = await useSpaceStore.getState().generateTasks(spaceId, moduleDoc);
      return tasks;
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate tasks. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Set space theme colors
  useEffect(() => {
    if (space?.space_color) {
      setColors(space.space_color);
    }
    return () => setColors(null);
  }, [space?.space_color, setColors]);

  // Initialize modules
  useEffect(() => {
    const initializeModules = async () => {
      if (!spaceId || !space || initializingRef.current) return;

      try {
        initializingRef.current = true;
        
        // First try to fetch existing modules
        const existingModules = await fetchModules(spaceId);
        if (existingModules.length > 0) return;

        // If no modules exist, start generation
        setIsGenerating(true);
        setError(null);

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
        if (!data?.modules || !Array.isArray(data.modules)) {
          throw new Error('Invalid module data received');
        }

        // Create modules in sequence
        for (const [index, moduleData] of data.modules.entries()) {
          await createModule({
            space_id: spaceId,
            title: moduleData.title,
            content: moduleData.content,
            description: '',
            order_index: index,
            is_completed: false,
          });
        }

        // Fetch the newly created modules
        await fetchModules(spaceId);

      } catch (error) {
        console.error('Error initializing modules:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize modules');
      } finally {
        setIsGenerating(false);
      }
    };

    initializeModules();
  }, [spaceId, space, fetchModules, createModule]);

  // Add effect to check and generate module content when current module changes
  useEffect(() => {
    const generateModuleContent = async () => {
      // Skip if no module, no space, already has description, or currently generating
      if (!currentModule || !space || currentModule.description || isGenerating) return;

      try {
        setIsGenerating(true);
        setError(null);

        const response = await fetch('/api/generate-module-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spaceDetails: space,
            moduleInfo: {
              title: currentModule.title,
              content: currentModule.content
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate module content');
        }

        const { content: generatedContent } = await response.json();

        // Update module with generated content
        await updateModule(spaceId, currentModule.id, {
          description: generatedContent
        });

        const moduleDoc = {
          id: currentModule.id,
          title: currentModule.title,
          content: generatedContent,
          type: 'guide',
          tags: ['module-content', space.category],
          space_id: spaceId
        };

        // Save to documents with correct type
        await addDocument(spaceId, moduleDoc);

        // Only generate tasks during first-time content generation
        const tasks = await createTask(spaceId, moduleDoc);
        if (tasks) {
          toast({
            title: 'Success',
            description: 'Tasks generated successfully!',
          });
        }

      } catch (error) {
        console.error('Error generating module content:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate module content');
      } finally {
        setIsGenerating(false);
      }
    };

    generateModuleContent();
  }, [currentModule, space, spaceId, isGenerating, updateModule, addDocument]);

  const handleModuleComplete = async (moduleId: string) => {
    try {
      const moduleItem = modules.find(m => m.id === moduleId);
      if (!moduleItem || !space) return;

      // Just mark as complete, content generation is handled by the effect
      await updateModule(spaceId, moduleId, { is_completed: true });
    } catch (error) {
      console.error('Error completing module:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete module');
    }
  };

  const handleModuleSelect = async (moduleIndex: number) => {
    setCurrentModuleIndex(spaceId, moduleIndex);
    setSelectedDocument(null);
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (!spaceId) return;
      
      try {
        // Load user data if not already loaded
        if (!space) {
          await loadUserData();
        }
        
        // Load documents for this space
        await loadDocuments(spaceId);
        
        // Load tasks for this space
        await fetchTasks(spaceId);
        
      } catch (error) {
        console.error('Error initializing space data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load space data. Please try refreshing the page.',
          variant: 'destructive',
        });
      }
    };

    initializeData();
  }, [spaceId, space, loadUserData, loadDocuments, fetchTasks]);

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
            <p className="text-muted-foreground">This space doesn&apos;t exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const completedModules = modules.filter(m => m.is_completed).length;
  const progress = modules.length > 0 ? (completedModules / modules.length) * 100 : 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-30 border-b bg-white/50 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-lg p-2.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-semibold tracking-tight">{space.title}</h1>
                <p className="text-sm text-muted-foreground">{space.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background/50 px-4 py-2 backdrop-blur-sm">
                <CircularProgress 
                  value={progress}
                  className="h-8 w-8"
                  strokeWidth={2.5}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progress)}% Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid h-[calc(100vh-4rem)] grid-cols-12 gap-6 px-6 pt-16">
        {/* Content Area */}
        <div className="col-span-8 h-full overflow-y-auto">
          <div className="prose prose-slate mx-auto max-w-4xl px-8 py-12 dark:prose-invert">
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <CircularProgress value={undefined} className="h-6 w-6" />
                <span>Generating content...</span>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <h3 className="text-lg font-medium">Error</h3>
                <p>{error}</p>
              </div>
            ) : (
              // <MarkdownContent 
              //   content={currentModule?.description || currentModule?.content || space.content || ''} 
              //   id={spaceId} 
              // />
              <Tiptap content={currentModule?.description || currentModule?.content || space.content || ''} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 h-full">
          <div className="sticky top-[3.5rem]">
            <Card className="h-[calc(100vh-4rem)] overflow-hidden border-none bg-white/50 shadow-sm backdrop-blur-xl dark:bg-slate-900/50">
              <Tabs defaultValue="modules" className="h-full flex flex-col">
                <TabsList className="flex w-full justify-start gap-1 border-b px-2 py-1 dark:border-slate-800">
                  <TabsTrigger value="modules" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Modules</span>
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Knowledge</span>
                  </TabsTrigger>
                  <TabsTrigger value="todo" className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    <span>Todo</span>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="podcast" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Podcast</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="modules" className="h-full m-0 overflow-auto">
                    <SpaceToolsWindow
                      spaceId={spaceId}
                      modules={modules}
                      currentModuleIndex={currentModuleIndex}
                      onModuleComplete={handleModuleComplete}
                      onModuleSelect={handleModuleSelect}
                    />
                  </TabsContent>

                  <TabsContent value="knowledge" className="h-full m-0 overflow-auto">
                    <KnowledgeBase
                      spaceId={spaceId}
                      onDocumentSelect={setSelectedDocument}
                    />
                  </TabsContent>

                  <TabsContent value="todo" className="h-full m-0 overflow-auto">
                    <TodoList spaceId={spaceId} />
                  </TabsContent>

                  <TabsContent value="chat" className="h-full m-0 overflow-auto">
                    <ChatWithMentor spaceId={spaceId} />
                  </TabsContent>

                  <TabsContent value="podcast" className="h-full m-0 overflow-auto">
                    <Podcast spaceId={spaceId} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

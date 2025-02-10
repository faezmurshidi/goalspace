'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ListChecks, MessageSquare, Sparkles, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
import { ScrollArea } from '@/components/ui/scroll-area';

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

  console.log('currentModule', currentModule);

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      {/* Header - Enhanced Design */}
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white backdrop-blur-lg shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto pl-[60px] lg:pl-[72px]">
          <div className="flex h-16 items-center px-6">
            {/* Left Section with Back Button and Title */}
            <div className="flex items-center gap-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-full p-0 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </Button>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                    {space.title}
                  </h1>
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {Math.round(progress)}% Complete
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                  {space.description}
                </p>
              </div>
            </div>

            {/* Right Section with Progress Bar */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex flex-col gap-1">
                <div className="h-2 w-36 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500">Progress</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{completedModules}/{modules.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid h-[calc(100vh-4rem)] grid-cols-12 gap-6 px-6 pt-20">
        {/* Content Area - Enhanced Readability */}
        <div className="col-span-7 h-full overflow-y-auto pb-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {currentModule?.title || space.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4" />
                <span>AI Generated Content</span>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {isGenerating ? (
                <div className="flex h-32 items-center justify-center space-x-2">
                  <CircularProgress value={undefined} className="h-6 w-6" />
                  <span className="text-slate-500">Generating content...</span>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500">
                  <h3 className="text-lg font-medium">Error</h3>
                  <p>{error}</p>
                </div>
              ) : (
                <Tiptap 
                  content={currentModule?.description || currentModule?.content || space.content || ''}
                  className="prose max-w-none dark:prose-invert"
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Structured Interaction */}
        <div className="col-span-5 h-full">
          <div className="sticky top-[4rem] h-[calc(100vh-4rem)]">
            <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/50">
              {/* Navigation Tabs */}
              <Tabs defaultValue="modules" className="flex flex-col h-[calc(100%-300px)]">
                <ScrollArea className="w-full border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50">
                  <TabsList className="inline-flex h-12 px-4">
                    {[
                      { value: 'modules', icon: Sparkles, label: 'Modules' },
                      { value: 'knowledge', icon: BookOpen, label: 'Knowledge' },
                      { value: 'todo', icon: ListChecks, label: 'Tasks' },
                      { value: 'podcast', icon: MessageSquare, label: 'Podcast' },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100"
                      >
                        <tab.icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="modules" className="m-0 p-4 h-full">
                    <SpaceToolsWindow
                      spaceId={spaceId}
                      modules={modules}
                      currentModuleIndex={currentModuleIndex}
                      onModuleComplete={handleModuleComplete}
                      onModuleSelect={handleModuleSelect}
                    />
                  </TabsContent>
                  <TabsContent value="knowledge" className="m-0 p-4 h-full">
                    <KnowledgeBase
                      spaceId={spaceId}
                      onDocumentSelect={setSelectedDocument}
                    />
                  </TabsContent>
                  <TabsContent value="todo" className="m-0 p-4 h-full">
                    <TodoList spaceId={spaceId} />
                  </TabsContent>
                  <TabsContent value="podcast" className="m-0 p-4 h-full">
                    <Podcast spaceId={spaceId} />
                  </TabsContent>
                </div>
              </Tabs>

              {/* Persistent Chat Section */}
              <div className="h-[300px] border-t border-slate-200 dark:border-slate-800">
                <div className="h-full overflow-y-auto">
                  <ChatWithMentor 
                    spaceId={spaceId}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

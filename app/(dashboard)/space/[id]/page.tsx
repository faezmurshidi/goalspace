'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ChatWithMentor } from '@/components/chat-with-mentor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { useSpaceStore } from '@/lib/store';
import { useSpaceTheme } from '@/components/providers/space-theme-provider';
import { SpaceToolsWindow } from '@/components/space-tools-window';
import { CircularProgress } from '@/components/ui/circular-progress';
import { type Module } from '@/lib/types/module';

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
    addDocument
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

        // Save to documents with correct type
        await addDocument(spaceId, {
          title: currentModule.title,
          content: generatedContent,
          type: 'guide',
          tags: ['module-content', space.category],
        });

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
      const module = modules.find(m => m.id === moduleId);
      if (!module || !space) return;

      // Just mark as complete, content generation is handled by the effect
      await updateModule(spaceId, moduleId, { is_completed: true });
    } catch (error) {
      console.error('Error completing module:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete module');
    }
  };

  const handleModuleSelect = (moduleIndex: number) => {
    setCurrentModuleIndex(spaceId, moduleIndex);
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

  const completedModules = modules.filter(m => m.is_completed).length;
  const progress = modules.length > 0 ? (completedModules / modules.length) * 100 : 0;

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
              value={progress}
              className="h-8 w-8"
              strokeWidth={2}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid h-[calc(100vh-56px)] grid-cols-12 gap-6 pt-14 px-6">
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
              <MarkdownContent 
                content={currentModule?.description || currentModule?.content || space.content || ''} 
                id={spaceId} 
              />
            )}
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
                currentModuleIndex={currentModuleIndex}
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

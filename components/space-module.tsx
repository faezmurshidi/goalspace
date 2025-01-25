'use client';

import * as React from 'react';
import { ChevronRight, Lock, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  content: string;
  isCompleted: boolean;
}

interface SpaceModuleProps {
  spaceId: string;
  onClose?: () => void;
  onModuleComplete?: (moduleId: string) => void;
  onModuleSelect?: (content: string, title: string) => void;
}

export function SpaceModule({ spaceId, onClose, onModuleComplete, onModuleSelect }: SpaceModuleProps) {
  // This would come from your store or API
  const [modules] = React.useState<Module[]>([
    {
      id: 'intro',
      title: 'Introduction',
      content: '# Welcome\nThis is the introduction module...',
      isCompleted: false,
    },
    {
      id: 'chapter1',
      title: 'Chapter 1: Getting Started',
      content: '# Chapter 1\nLets begin our journey...',
      isCompleted: false,
    },
    {
      id: 'chapter2',
      title: 'Chapter 2: Advanced Concepts',
      content: '# Chapter 2\nNow for some advanced topics...',
      isCompleted: false,
    },
  ]);

  const [currentModuleIndex, setCurrentModuleIndex] = React.useState(0);
  const currentModule = modules[currentModuleIndex];

  // Initialize the first module content
  React.useEffect(() => {
    if (currentModule && onModuleSelect) {
      onModuleSelect(currentModule.content, currentModule.title);
    }
  }, []); // Only run once on mount

  const handleModuleSelect = (index: number) => {
    if (!modules[index]) return;
    setCurrentModuleIndex(index);
    onModuleSelect?.(modules[index].content, modules[index].title);
  };

  const handleNextModule = () => {
    if (currentModuleIndex < modules.length - 1) {
      onModuleComplete?.(currentModule.id);
      handleModuleSelect(currentModuleIndex + 1);
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="sticky top-0 z-10 border-b bg-[var(--space-primary-50)]">
        <div className="flex items-center justify-between">
          <CardTitle>Learning Modules</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[calc(100vh-15rem)]">
          <div className="space-y-2 pr-4">
            {modules.map((module, index) => {
              const isCurrent = index === currentModuleIndex;
              const isLocked = index > currentModuleIndex;

              return (
                <div key={module.id} className="flex items-center gap-2">
                  <Button
                    variant={isCurrent ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      isCurrent && "bg-[var(--space-primary)] text-white hover:bg-[var(--space-accent)]",
                      isLocked && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isLocked}
                    onClick={() => !isLocked && handleModuleSelect(index)}
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{module.title}</span>
                  </Button>
                  {isCurrent && currentModuleIndex < modules.length - 1 && (
                    <Button 
                      size="sm"
                      onClick={handleNextModule}
                      className="bg-[var(--space-primary)] hover:bg-[var(--space-accent)]"
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 
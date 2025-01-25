'use client';

import * as React from 'react';
import { ChevronRight, Lock, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';

export interface Module {
  id: string;
  title: string;
  content: string;
  isCompleted: boolean;
}

interface SpaceModuleProps {
  spaceId: string;
  modules?: Module[];
  onClose?: () => void;
  onModuleComplete?: (moduleId: string) => void;
  onModuleSelect?: (content: string, title: string) => void;
}

export function SpaceModule({ 
  spaceId, 
  modules = [], 
  onClose, 
  onModuleComplete, 
  onModuleSelect 
}: SpaceModuleProps) {
  const [currentModuleIndex, setCurrentModuleIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const { setModules, updateModule, getModules } = useSpaceStore();
  const currentModule = modules[currentModuleIndex];

  // Load modules from database on mount
  React.useEffect(() => {
    const loadModules = async () => {
      try {
        const dbModules = await getModules(spaceId);
        if (dbModules.length > 0) {
          // Update the local state with database modules
          onModuleSelect?.(dbModules[0].content, dbModules[0].title);
        }
      } catch (error) {
        console.error('Error loading modules:', error);
      }
    };
    loadModules();
  }, [spaceId, getModules, onModuleSelect]);

  // Initialize the first module content
  React.useEffect(() => {
    if (currentModule) {
      loadModuleContent(currentModule);
    }
  }, [modules]); // Re-run when modules change

  const loadModuleContent = async (module: Module) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-module-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceDetails: { id: spaceId },
          moduleInfo: module
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate module content');
      }

      const data = await response.json();
      if (!data || !data.content) {
        throw new Error('Invalid response from server');
      }

      // Update the module in the database with the generated content
      await updateModule(spaceId, module.id, { content: data.content });
      onModuleSelect?.(data.content, module.title);
    } catch (error) {
      console.error('Error loading module content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSelect = (index: number) => {
    if (!modules[index]) return;
    setCurrentModuleIndex(index);
    loadModuleContent(modules[index]);
  };

  const handleNextModule = async () => {
    if (currentModuleIndex < modules.length - 1) {
      // Mark current module as completed in database
      await updateModule(spaceId, currentModule.id, { isCompleted: true });
      onModuleComplete?.(currentModule.id);
      handleModuleSelect(currentModuleIndex + 1);
    }
  };

  if (modules.length === 0) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-b from-[var(--space-primary-50)] to-background/95 backdrop-blur-lg shadow-xl">
        <CardHeader className="sticky top-0 z-20 border-b border-border/50 bg-background/80">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--space-primary)] to-primary bg-clip-text text-transparent">
              Learning Journey
            </CardTitle>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="rounded-full hover:bg-accent/50"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Curriculum in Progress
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Our team is crafting an amazing learning journey for you
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-b from-[var(--space-primary-50)] to-background/95 backdrop-blur-lg shadow-xl">
    
      <CardContent className="p-6">
        <ScrollArea className="h-[calc(100vh-18rem)] pr-4">
          <div className="space-y-3">
            {modules.map((module, index) => {
              const isCurrent = index === currentModuleIndex;
              const isLocked = index > currentModuleIndex;
              const isCompleted = module.isCompleted;

              return (
                <motion.div 
                  key={module.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant={isCurrent ? "default" : "ghost"}
                    className={cn(
                      "group h-14 w-full justify-between px-6 rounded-xl transition-all",
                      "hover:scale-[99%] active:scale-95",
                      isCurrent && "bg-[var(--space-primary)] shadow-lg hover:bg-[var(--space-accent)]",
                      isLocked && "opacity-50 cursor-not-allowed",
                      isLoading && isCurrent && "animate-pulse",
                      isCompleted && "!bg-emerald-500/10 hover:!bg-emerald-500/20"
                    )}
                    disabled={isLocked || isLoading}
                    onClick={() => !isLocked && handleModuleSelect(index)}
                  >
                    <div className="flex items-center gap-4">
                      {isLocked ? (
                        <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <div className="relative">
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center",
                            isCurrent ? "bg-background" : "bg-[var(--space-primary)]"
                          )}>
                            <span className={cn(
                              "text-sm font-semibold",
                              isCurrent ? "text-[var(--space-primary)]" : "text-background"
                            )}>
                              {index + 1}
                            </span>
                          </div>
                          {isCompleted && (
                            <div className="absolute -right-1 -bottom-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                              <Check className="h-3 w-3 text-background" />
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-left truncate font-medium">
                        {module.title}
                      </span>
                    </div>
                    
                    {isCurrent && (
                      <div className="flex items-center gap-2 ml-4">
                        {currentModuleIndex < modules.length - 1 && (
                          <Button 
                            size="sm"
                            onClick={handleNextModule}
                            disabled={isLoading}
                            className={cn(
                              "rounded-full bg-background text-[var(--space-primary)]",
                              "hover:bg-background/90 shadow-sm",
                              isLoading && "animate-pulse"
                            )}
                          >
                            Continue
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 
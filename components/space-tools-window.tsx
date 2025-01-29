'use client';

import * as React from 'react';
import { BookOpen, Brain, ListTodo, Sparkles, Check, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { type Module } from '@/lib/types/module';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SpaceTools } from '@/components/space-tools';
import { TodoList } from '@/components/todo-list';
import { useState } from 'react';

export interface SpaceToolsWindowProps {
  spaceId: string;
  modules: Module[];
  currentModuleIndex: number;
  onModuleComplete: (moduleId: string) => void;
  onModuleSelect: (index: number) => void;
  onDocumentSelect: (doc: { title: string; content: string }) => void;
}

export function SpaceToolsWindow({
  spaceId,
  modules,
  currentModuleIndex,
  onModuleComplete,
  onModuleSelect,
  onDocumentSelect,
}: SpaceToolsWindowProps) {
  const [selectedTab, setSelectedTab] = useState<'modules' | 'documents'>('modules');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedTab('modules')}
            className={cn(
              'text-sm font-medium',
              selectedTab === 'modules'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Modules
          </button>
          <button
            onClick={() => setSelectedTab('documents')}
            className={cn(
              'text-sm font-medium',
              selectedTab === 'documents'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTab === 'modules' ? (
          <div className="space-y-2">
            {modules.map((module, index) => {
              const isCurrent = index === currentModuleIndex;
              const isLocked = index > currentModuleIndex + 1;
              const isCompleted = module.is_completed;
              const isSelectable = !isLocked || isCompleted;

              return (
                <button
                  key={module.id}
                  onClick={() => isSelectable && onModuleSelect(index)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    isCurrent ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                    isCompleted && 'bg-green-50 dark:bg-green-950',
                    !isSelectable && 'cursor-not-allowed opacity-50'
                  )}
                  disabled={!isSelectable}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border',
                        isCompleted
                          ? 'border-green-500 bg-green-500 text-white'
                          : isCurrent
                          ? 'border-primary'
                          : 'border-gray-300'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium">{module.title}</span>
                  </div>
                  {!isCompleted && isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onModuleComplete(module.id);
                      }}
                      className="rounded-full bg-primary p-1 text-white hover:bg-primary/90"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {!isCurrent && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            No documents available
          </div>
        )}
      </div>
    </div>
  );
} 
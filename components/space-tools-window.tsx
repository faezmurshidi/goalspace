'use client';

import * as React from 'react';
import { BookOpen, Brain, ListTodo, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SpaceModule, type Module } from '@/components/space-module';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SpaceTools } from '@/components/space-tools';
import { TodoList } from '@/components/todo-list';

interface SpaceToolsWindowProps {
  spaceId: string;
  modules: Module[];
  onModuleComplete: (moduleId: string) => void;
  onModuleSelect: (content: string, title: string) => void;
  onDocumentSelect: (document: { title: string; content: string }) => void;
}

export function SpaceToolsWindow({
  spaceId,
  modules,
  onModuleComplete,
  onModuleSelect,
  onDocumentSelect,
}: SpaceToolsWindowProps) {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="modules" className="flex-1">
        <TabsList className="flex w-full justify-start gap-1 border-b px-2 py-1 dark:border-slate-800">
          {[
            { value: 'modules', icon: Brain },
            { value: 'knowledge', icon: BookOpen },
            { value: 'todo', icon: ListTodo },
            { value: 'tools', icon: Sparkles },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100"
            >
              <tab.icon className="h-4 w-4" />
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-auto px-2 py-4">
          <TabsContent value="modules" className="mt-0">
            <SpaceModule
              spaceId={spaceId}
              modules={modules}
              onModuleComplete={onModuleComplete}
              onModuleSelect={onModuleSelect}
            />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0">
            <KnowledgeBase
              spaceId={spaceId}
              onDocumentSelect={onDocumentSelect}
            />
          </TabsContent>

          <TabsContent value="todo" className="mt-0">
            <TodoList spaceId={spaceId} />
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            <SpaceTools spaceId={spaceId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 
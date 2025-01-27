'use client';

import * as React from 'react';
import { BookOpen, Brain, ListTodo, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpaceNavbarProps {
  showModules: boolean;
  showKnowledgeBase: boolean;
  showTools: boolean;
  showTodo: boolean;
  onToggleModules: () => void;
  onToggleKnowledgeBase: () => void;
  onToggleTools: () => void;
  onToggleTodo: () => void;
}

export function SpaceNavbar({
  showModules,
  showKnowledgeBase,
  showTools,
  showTodo,
  onToggleModules,
  onToggleKnowledgeBase,
  onToggleTools,
  onToggleTodo,
}: SpaceNavbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <button
            onClick={onToggleModules}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              showModules ? 'text-[var(--space-primary)]' : 'text-muted-foreground'
            )}
          >
            <Brain className="h-4 w-4" />
            <span>Modules</span>
          </button>

          <button
            onClick={onToggleKnowledgeBase}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              showKnowledgeBase ? 'text-[var(--space-primary)]' : 'text-muted-foreground'
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={onToggleTodo}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              showTodo ? 'text-[var(--space-primary)]' : 'text-muted-foreground'
            )}
          >
            <ListTodo className="h-4 w-4" />
            <span>To-Do List</span>
          </button>

          <button
            onClick={onToggleTools}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              showTools ? 'text-[var(--space-primary)]' : 'text-muted-foreground'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>Tools</span>
          </button>
        </nav>
      </div>
    </div>
  );
} 
'use client';

import { useRouter } from 'next/navigation';
import { Brain, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';

export function SpacesSidebar() {
  const router = useRouter();
  const { spaces, isSidebarCollapsed, toggleSidebar } = useSpaceStore();

  return (
    <div 
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4">
          {!isSidebarCollapsed && <h2 className="font-semibold px-2">Spaces</h2>}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              isSidebarCollapsed && "ml-2"
            )}
            onClick={toggleSidebar}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="space-y-1 p-2">
          {spaces.map((space) => (
            <Button
              key={space.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                "border-l-2 rounded-none",
                isSidebarCollapsed ? "px-4" : "px-2",
                space.category === 'learning' 
                  ? "border-l-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20" 
                  : "border-l-green-500 hover:bg-green-50 dark:hover:bg-green-950/20"
              )}
              onClick={() => router.push(`/space/${space.id}`)}
              title={isSidebarCollapsed ? space.title : undefined}
            >
              {space.category === 'learning' ? (
                <Brain className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Target className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {!isSidebarCollapsed && <span className="truncate text-sm">{space.title}</span>}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
} 
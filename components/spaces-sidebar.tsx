'use client';

import { useRouter } from 'next/navigation';
import { Brain, Target, ChevronLeft, ChevronRight, Loader2, Pause, Play, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { useState } from 'react';

interface SpacesSidebarProps {
  className?: string;
}

export function SpacesSidebar({ className }: SpacesSidebarProps) {
  const router = useRouter();
  const { spaces, isSidebarCollapsed, toggleSidebar } = useSpaceStore();
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  const handleSpaceClick = (spaceId: string) => {
    setLoadingSpaceId(spaceId);
    router.push(`/space/${spaceId}`);
  };  

  return (
    <div
      className={cn(
        "fixed left-0 top-[57px] z-30 h-[calc(100vh-57px)] w-64 border-r bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl transition-all duration-300",
        isSidebarCollapsed && "w-16",
        className
      )}
    >
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className={cn(
            "text-lg font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent",
            isSidebarCollapsed && "opacity-0"
          )}>
            Spaces
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          {spaces.map((space) => (
            <div key={space.id} className="space-y-1 group">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSpaceClick(space.id)}
                className={cn(
                  "w-full justify-start gap-2 relative overflow-hidden transition-all duration-300",
                  "before:absolute before:inset-0 before:w-1 before:bg-gradient-to-b before:transition-all",
                  loadingSpaceId === space.id && "animate-pulse",
                  space.space_color 
                    ? `hover:bg-[${space.space_color.secondary}] dark:hover:bg-[${space.space_color.main}]/20 before:bg-[${space.space_color.main}]`
                    : space.category === 'learning'
                      ? "hover:bg-blue-50 dark:hover:bg-blue-900/20 before:bg-blue-500"
                      : "hover:bg-green-50 dark:hover:bg-green-900/20 before:bg-green-500"
                )}
                style={space.space_color ? {
                  '--hover-bg': space.space_color.secondary,
                  '--hover-bg-dark': `${space.space_color.main}20`,
                  '--border-color': space.space_color.main,
                } as any : undefined}
              >
                {space.category === 'learning' ? (
                  <Brain 
                    className="h-4 w-4 transition-transform group-hover:scale-110" 
                    style={{ color: space.space_color?.main }}
                  />
                ) : (
                  <Target 
                    className="h-4 w-4 transition-transform group-hover:scale-110"
                    style={{ color: space.space_color?.main }}
                  />
                )}
                {!isSidebarCollapsed && (
                  <span className="truncate text-sm font-medium">
                    {space.title}
                  </span>
                )}
              </Button>
              
            
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
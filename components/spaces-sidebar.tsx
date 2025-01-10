'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Brain, Target, ChevronLeft, ChevronRight, Loader2, Plus, LayoutDashboard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface SpacesSidebarProps {
  className?: string;
}

export function SpacesSidebar({ className }: SpacesSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { spaces, isSidebarCollapsed, toggleSidebar } = useSpaceStore();
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  const handleSpaceClick = (spaceId: string) => {
    setLoadingSpaceId(spaceId);
    router.push(`/space/${spaceId}`);
  };

  const mainNavItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
  ];

  const bottomNavItems = [
    {
      title: 'Settings',
      icon: Settings,
      href: '/settings',
    },
  ];

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed left-0 top-[57px] z-30 h-[calc(100vh-57px)] border-r",
        "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        "transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-full flex-col">
        {/* Top Navigation */}
        <div className="p-2">
          {mainNavItems.map((item) => (
            <TooltipProvider key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2 mb-1",
                      pathname === item.href && "bg-muted"
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="h-4 w-4" />
                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="truncate text-sm font-medium"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Spaces Header */}
        <div className="flex items-center justify-between p-4 border-y bg-background/50">
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              >
                Spaces
              </motion.h2>
            )}
          </AnimatePresence>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="h-8 w-8 p-0 hover:bg-muted/50"
                >
                  {isSidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Spaces List */}
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {spaces.map((space) => (
              <TooltipProvider key={space.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSpaceClick(space.id)}
                      className={cn(
                        "w-full justify-start gap-2 relative group",
                        "transition-all duration-200 ease-in-out",
                        "hover:bg-muted/50",
                        activeSpaceId === space.id && "bg-muted",
                        loadingSpaceId === space.id && "animate-pulse"
                      )}
                    >
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                        initial={{ scaleY: 0 }}
                        animate={{ 
                          scaleY: activeSpaceId === space.id ? 1 : 0,
                          backgroundColor: space.space_color?.main || 'currentColor'
                        }}
                        transition={{ duration: 0.2 }}
                      />
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {space.category === 'learning' ? (
                          <Brain 
                            className="h-4 w-4" 
                            style={{ color: space.space_color?.main }}
                          />
                        ) : (
                          <Target 
                            className="h-4 w-4"
                            style={{ color: space.space_color?.main }}
                          />
                        )}
                      </motion.div>
                      <AnimatePresence>
                        {!isSidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="truncate text-sm font-medium"
                          >
                            {space.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {loadingSpaceId === space.id && (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side="right">
                      {space.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="p-3 mt-auto border-t bg-background/50 space-y-2">
          {/* Settings and other bottom nav items */}
          {bottomNavItems.map((item) => (
            <TooltipProvider key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname === item.href && "bg-muted"
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="h-4 w-4" />
                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="truncate text-sm font-medium"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}

          <Separator className="my-2" />

          {/* New Space Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push('/new-space')}
                >
                  <Plus className="h-4 w-4" />
                  {!isSidebarCollapsed && "New Space"}
                </Button>
              </TooltipTrigger>
              {isSidebarCollapsed && (
                <TooltipContent side="right">
                  Create new space
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
} 
import { useEffect } from 'react';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { type Module } from '@/lib/types/module';
import { useSpaceStore } from '@/lib/store';

interface SpaceModuleProps {
  spaceId: string;
}

export function SpaceModule({ spaceId }: SpaceModuleProps) {
  const {
    modulesBySpaceId,
    currentModuleIndexBySpaceId,
    setCurrentModuleIndex,
    updateModule,
    fetchModules,
  } = useSpaceStore();

  const modules = modulesBySpaceId[spaceId] || [];
  const currentModuleIndex = currentModuleIndexBySpaceId[spaceId] || 0;

  useEffect(() => {
    fetchModules(spaceId).catch(console.error);
  }, [spaceId, fetchModules]);

  const handleModuleComplete = async (moduleId: string) => {
    await updateModule(spaceId, moduleId, { is_completed: true });
  };

  const handleModuleSelect = (index: number) => {
    setCurrentModuleIndex(spaceId, index);
  };

  return (
    <div className="space-y-2">
      {modules.map((module, index) => {
        const isCurrent = index === currentModuleIndex;
        const isLocked = index > currentModuleIndex + 1;
        const isCompleted = module.is_completed;
        const isSelectable = !isLocked || isCompleted;

        return (
          <button
            key={module.id}
            onClick={() => isSelectable && handleModuleSelect(index)}
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
                  handleModuleComplete(module.id);
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
  );
} 
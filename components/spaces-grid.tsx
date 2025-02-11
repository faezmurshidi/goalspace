import { motion } from 'framer-motion';
import {
  Brain,
  Clock,
  ListChecks,
  Sparkles,
  Target,
  User,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Space } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SpacesGridProps {
  spaces: Space[];
}

export function SpacesGrid({ spaces }: SpacesGridProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaces[0]?.id || '');

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
      {/* Space Selection Panel */}
      <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
        <h3 className="text-lg font-semibold px-2">Your Spaces</h3>
        <div className="grid gap-3">
          {spaces.map((space, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setSelectedSpaceId(space.id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl transition-all',
                  'border bg-card hover:bg-accent/50',
                  selectedSpaceId === space.id 
                    ? 'border-primary shadow-lg bg-gradient-to-r from-primary/5 to-transparent'
                    : 'border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    space.category === 'learning' 
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300' 
                      : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                  )}>
                    {space.category === 'learning' ? (
                      <Brain className="h-5 w-5" />
                    ) : (
                      <Target className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{space.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {space.description}
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Space Details Panel */}
      <div className="lg:w-2/3 flex-1">
        {spaces.map((space) => (
          space.id === selectedSpaceId && (
            <motion.div
              key={space.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full"
            >
              <Card className="h-full overflow-hidden border bg-card shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg backdrop-blur-sm',
                      space.category === 'learning'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                    )}>
                      {space.category === 'learning' ? (
                        <Brain className="h-6 w-6" />
                      ) : (
                        <Target className="h-6 w-6" />
                      )}
                    </div>
                    <div className="space-y-1 pr-8">
                      <CardTitle className="text-xl font-semibold tracking-tight">
                        {space.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-foreground/70 line-clamp-2">
                        {space.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-9">
                      <TabsTrigger 
                        value="overview"
                        className={cn(
                          'rounded-none border-b-2 data-[state=active]:border-primary',
                          'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                          'text-foreground/60 hover:text-foreground',
                          'dark:text-foreground/50 dark:hover:text-foreground'
                        )}
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mentor"
                        className={cn(
                          'rounded-none border-b-2 data-[state=active]:border-primary',
                          'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                          'text-foreground/60 hover:text-foreground',
                          'dark:text-foreground/50 dark:hover:text-foreground'
                        )}
                      >
                        AI Mentor
                      </TabsTrigger>
                    </TabsList>

                    {/* Overview Content */}
                    <TabsContent value="overview" className="mt-4 space-y-4">
                      <div className="grid gap-4">
                        <Section 
                          icon={<Sparkles className="text-purple-500" />}
                          title="Objectives"
                          items={space.objectives}
                          colorClass="purple"
                        />
                        
                        <Section
                          icon={<ListChecks className="text-cyan-500" />}
                          title="Prerequisites"
                          items={space.prerequisites}
                          colorClass="cyan"
                        />

                        <div className="flex items-center gap-3 text-sm text-foreground/70">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span>Estimated time:</span>
                          <span className="font-medium text-foreground">
                            {space.time_to_complete}
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Mentor Content */}
                    <TabsContent value="mentor" className="mt-4">
                      {space.mentor && (
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              'rounded-xl p-2 bg-gradient-to-br',
                              space.category === 'learning'
                                ? 'from-purple-500/10 to-cyan-500/10'
                                : 'from-cyan-500/10 to-purple-500/10'
                            )}>
                              <User className="h-8 w-8 text-foreground/90" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-lg font-semibold">{space.mentor.name}</h3>
                              <p className="text-sm text-foreground/70">
                                {space.mentor.personality}
                              </p>
                            </div>
                          </div>
                          
                          <div className="rounded-lg border p-4 bg-background/50">
                            <p className="text-sm italic text-foreground/80">
                              &quot;{space.mentor.introduction}&quot;
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )
        ))}
      </div>
    </div>
  );
}

function Section({ icon, title, items, colorClass }: { 
  icon: React.ReactNode
  title: string
  items: string[]
  colorClass: 'purple' | 'cyan'
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className={cn(
          'p-1.5 rounded-lg',
          colorClass === 'purple' 
            ? 'bg-purple-500/10 text-purple-600' 
            : 'bg-cyan-500/10 text-cyan-600'
        )}>
          {icon}
        </div>
        {title}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li 
            key={i}
            className="flex items-start gap-2 text-foreground/80 before:content-['•'] before:text-primary"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
} 
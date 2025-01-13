'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Clock,
  ListChecks,
  Loader2,
  Sparkles,
  Target,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpaceStore, type Space } from '@/lib/store';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function GeneratedSpaces() {
  const router = useRouter();
  const { spaces, currentGoal } = useSpaceStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const generatedSpacesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for pending goals to save after auth
  useEffect(() => {
    const savePendingGoal = async () => {
      const pendingGoal = localStorage.getItem('pendingGoal');
      const pendingSpaces = localStorage.getItem('pendingSpaces');

      if (!pendingGoal || !pendingSpaces) return;

      try {
        setIsSaving(true);
        setError(null);

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Create the goal in Supabase
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: pendingGoal,
            description: 'Goal created from AI analysis',
            category: 'learning',
            status: 'active',
            progress: 0,
          })
          .select()
          .single();

        if (goalError) throw goalError;
        if (!goalData) throw new Error('Failed to create goal');

        // Create spaces in Supabase
        const parsedSpaces = JSON.parse(pendingSpaces);
        const spacesPromises = parsedSpaces.map(async (space: Space, index: number) => {
          const { data: spaceData, error: spaceError } = await supabase
            .from('spaces')
            .insert({
              goal_id: goalData.id,
              user_id: user.id,
              title: space.title,
              description: space.description,
              category: space.category,
              objectives: JSON.stringify(space.objectives || []),
              prerequisites: JSON.stringify(space.prerequisites || []),
              mentor: JSON.stringify(space.mentor || {}),
              progress: 0,
              space_color: JSON.stringify(space.space_color || {}),
              mentor_type: space.mentor?.personality || 'default',
              order_index: index,
            })
            .select()
            .single();

          if (spaceError) throw spaceError;
          return spaceData;
        });

        await Promise.all(spacesPromises);

        // Clear pending data
        localStorage.removeItem('pendingGoal');
        localStorage.removeItem('pendingSpaces');

        // Navigate to dashboard
        router.push('/dashboard');
      } catch (err) {
        console.error('Error saving pending goal:', err);
        setError('Failed to save your goal. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    savePendingGoal();
  }, [router]);

  const handleStartJourney = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Store current goal data in localStorage
        localStorage.setItem('pendingGoal', currentGoal);
        localStorage.setItem('pendingSpaces', JSON.stringify(spaces));

        // Redirect to auth page
        router.push('/auth');
        return;
      }

      //if the same goal is already saved, redirect to dashboard
      const { data: existingGoalData, error: existingGoalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('title', currentGoal)
        .single();

      if (existingGoalData) {
        router.push('/dashboard');
        return;
      }

      // If user is already authenticated, save directly
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: currentGoal,
          description: 'Goal created from AI analysis',
          category: 'learning',
          status: 'active',
          progress: 0,
        })
        .select()
        .single();

      if (goalError) throw goalError;
      if (!goalData) throw new Error('Failed to create goal');

      // Create spaces in Supabase
      const spacesPromises = spaces.map(async (space, index) => {
        // Format the data to match the schema
        const spaceData = {
          goal_id: goalData.id,
          user_id: user.id,
          title: space.title,
          description: space.description,
          category: space.category,
          objectives: JSON.stringify(space.objectives || []),
          prerequisites: JSON.stringify(space.prerequisites || []),
          mentor: JSON.stringify(space.mentor || {}),
          progress: 0,
          space_color: JSON.stringify(space.space_color || {}),
          mentor_type: space.mentor?.personality || 'default',
          order_index: index,
        };

        const { data: savedSpace, error: spaceError } = await supabase
          .from('spaces')
          .insert(spaceData)
          .select()
          .single();

        if (spaceError) {
          console.error('Space insertion error:', spaceError);
          throw spaceError;
        }
        return savedSpace;
      });

      await Promise.all(spacesPromises);

      // Navigate to dashboard after successful save
      router.push('/dashboard');
    } catch (err) {
      console.error('Error saving to Supabase:', err);
      setError('Failed to save your goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (spaces.length && generatedSpacesRef.current) {
      generatedSpacesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [spaces]);

  if (!spaces.length) return null;

  return (
    <motion.div
      ref={generatedSpacesRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto max-w-7xl space-y-8 px-4 py-8"
    >
      {/* Goal Header */}
      <div className="space-y-4 text-center">
        <h1
          className={cn(
            'text-4xl font-bold tracking-tight',
            'bg-gradient-to-r from-purple-600 via-primary to-cyan-600 bg-clip-text text-transparent',
            'dark:from-purple-300 dark:via-primary dark:to-cyan-300'
          )}
        >
          {currentGoal}
        </h1>
        <p className="mx-auto max-w-2xl text-foreground/80 dark:text-foreground/70">
          Your personalized learning journey has been created. Review your spaces below and continue
          to get started.
        </p>
      </div>

      {/* Spaces Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {spaces.map((space, index) => (
          <motion.div
            key={space.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <Card
              className={cn(
                'group h-full overflow-hidden transition-all duration-500',
                'border-primary/20 hover:border-primary/30',
                'bg-gradient-to-br from-white via-white/80 to-background',
                'hover:shadow-lg hover:shadow-primary/5',
                'dark:from-gray-900/90 dark:via-gray-900/90 dark:to-background/90',
                'dark:border-primary/10 dark:hover:border-primary/20',
                'dark:hover:shadow-primary/10'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      {space.category === 'learning' ? (
                        <Brain
                          className={cn(
                            'h-5 w-5 transition-colors',
                            'text-purple-600 group-hover:text-purple-500',
                            'dark:text-purple-300 dark:group-hover:text-purple-200'
                          )}
                        />
                      ) : (
                        <Target
                          className={cn(
                            'h-5 w-5 transition-colors',
                            'text-cyan-600 group-hover:text-cyan-500',
                            'dark:text-cyan-300 dark:group-hover:text-cyan-200'
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          'bg-gradient-to-r bg-clip-text text-transparent transition-colors',
                          'from-purple-600 to-cyan-600',
                          'group-hover:from-purple-500 group-hover:to-cyan-500',
                          'dark:from-purple-300 dark:to-cyan-300',
                          'dark:group-hover:from-purple-200 dark:group-hover:to-cyan-200'
                        )}
                      >
                        {space.title}
                      </span>
                    </CardTitle>
                    <CardDescription
                      className={cn(
                        'transition-colors',
                        'text-foreground/70 group-hover:text-foreground/90',
                        'dark:text-foreground/60 dark:group-hover:text-foreground/80'
                      )}
                    >
                      {space.description}
                    </CardDescription>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                      space.category === 'learning'
                        ? [
                            'bg-purple-100 text-purple-900 group-hover:bg-purple-200',
                            'dark:bg-purple-500/20 dark:text-purple-200 dark:group-hover:bg-purple-500/30',
                          ]
                        : [
                            'bg-cyan-100 text-cyan-900 group-hover:bg-cyan-200',
                            'dark:bg-cyan-500/20 dark:text-cyan-200 dark:group-hover:bg-cyan-500/30',
                          ]
                    )}
                  >
                    {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50 dark:bg-muted/20">
                    <TabsTrigger
                      value="overview"
                      className={cn(
                        'transition-all',
                        'data-[state=active]:bg-gradient-to-r',
                        'data-[state=active]:from-purple-500/20 data-[state=active]:to-primary/20',
                        'dark:data-[state=active]:from-purple-300/20 dark:data-[state=active]:to-primary/20',
                        'text-foreground/70 hover:text-foreground data-[state=active]:text-foreground',
                        'dark:text-foreground/60 dark:hover:text-foreground/90 dark:data-[state=active]:text-foreground'
                      )}
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="mentor"
                      className={cn(
                        'transition-all',
                        'data-[state=active]:bg-gradient-to-r',
                        'data-[state=active]:from-primary/20 data-[state=active]:to-cyan-500/20',
                        'dark:data-[state=active]:from-primary/20 dark:data-[state=active]:to-cyan-300/20',
                        'text-foreground/70 hover:text-foreground data-[state=active]:text-foreground',
                        'dark:text-foreground/60 dark:hover:text-foreground/90 dark:data-[state=active]:text-foreground'
                      )}
                    >
                      AI Mentor
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="grid gap-4">
                      {/* Objectives */}
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground/90">
                          <Sparkles
                            className={cn('h-4 w-4', 'text-purple-600 dark:text-purple-300')}
                          />
                          Objectives
                        </h3>
                        <div
                          className={cn(
                            'rounded-md border p-4 transition-colors',
                            'border-purple-100/50 bg-purple-50/50',
                            'dark:border-purple-500/10 dark:bg-purple-500/5',
                            'group-hover:border-purple-100 group-hover:bg-purple-50',
                            'dark:group-hover:border-purple-500/20 dark:group-hover:bg-purple-500/10'
                          )}
                        >
                          <ul className="space-y-2 text-sm">
                            {space.objectives.map((objective, i) => (
                              <li
                                key={i}
                                className={cn(
                                  'transition-colors',
                                  'text-foreground/80 group-hover:text-foreground',
                                  'dark:text-foreground/70 dark:group-hover:text-foreground/90'
                                )}
                              >
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Prerequisites */}
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground/90">
                          <ListChecks
                            className={cn('h-4 w-4', 'text-cyan-600 dark:text-cyan-300')}
                          />
                          Prerequisites
                        </h3>
                        <div
                          className={cn(
                            'rounded-md border p-4 transition-colors',
                            'border-cyan-100/50 bg-cyan-50/50',
                            'dark:border-cyan-500/10 dark:bg-cyan-500/5',
                            'group-hover:border-cyan-100 group-hover:bg-cyan-50',
                            'dark:group-hover:border-cyan-500/20 dark:group-hover:bg-cyan-500/10'
                          )}
                        >
                          <ul className="space-y-2 text-sm">
                            {space.prerequisites.map((prerequisite, i) => (
                              <li
                                key={i}
                                className={cn(
                                  'transition-colors',
                                  'text-foreground/80 group-hover:text-foreground',
                                  'dark:text-foreground/70 dark:group-hover:text-foreground/90'
                                )}
                              >
                                {prerequisite}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Time to Complete */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className={cn('h-4 w-4', 'text-purple-600 dark:text-purple-300')} />
                        <span className="font-medium text-foreground dark:text-foreground/90">
                          Time to Complete:
                        </span>
                        <span className="text-foreground/70 dark:text-foreground/60">
                          {space.time_to_complete}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="mentor" className="mt-4">
                    {space.mentor && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              'rounded-full p-3',
                              'bg-gradient-to-br from-purple-100 via-primary/10 to-cyan-100',
                              'dark:from-purple-500/20 dark:via-primary/20 dark:to-cyan-500/20'
                            )}
                          >
                            <User className="h-6 w-6 text-foreground dark:text-foreground/90" />
                          </div>
                          <div className="space-y-1">
                            <h3
                              className={cn(
                                'bg-gradient-to-r bg-clip-text font-medium text-transparent',
                                'from-purple-600 to-cyan-600',
                                'dark:from-purple-300 dark:to-cyan-300'
                              )}
                            >
                              {space.mentor.name}
                            </h3>
                            <p className="text-sm text-cyan-700 dark:text-cyan-300">
                              {space.mentor.personality}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'rounded-md border p-4 transition-colors',
                            'bg-gradient-to-br from-purple-50/50 via-background to-cyan-50/50',
                            'border-purple-100/50',
                            'group-hover:from-purple-50 group-hover:to-cyan-50',
                            'group-hover:border-purple-100/70',
                            'dark:from-purple-500/5 dark:via-background dark:to-cyan-500/5',
                            'dark:border-purple-500/10',
                            'dark:group-hover:from-purple-500/10 dark:group-hover:to-cyan-500/10',
                            'dark:group-hover:border-purple-500/20'
                          )}
                        >
                          <p
                            className={cn(
                              'text-sm italic transition-colors',
                              'text-foreground/80 group-hover:text-foreground',
                              'dark:text-foreground/70 dark:group-hover:text-foreground/90'
                            )}
                          >
                            "{space.mentor.introduction}"
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground dark:text-foreground/90">
                            Expertise
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {space.mentor.expertise.map((skill, i) => (
                              <span
                                key={i}
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-xs transition-colors',
                                  'bg-gradient-to-r from-purple-100/80 to-cyan-100/80',
                                  'text-foreground hover:from-purple-200/90 hover:to-cyan-200/90',
                                  'dark:from-purple-500/10 dark:to-cyan-500/10',
                                  'dark:text-foreground/90 dark:hover:from-purple-500/20 dark:hover:to-cyan-500/20'
                                )}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Footer */}
      <motion.div
        className={cn(
          'fixed bottom-0 left-0 right-0 p-4',
          'border-t border-primary/10',
          'bg-background/80 backdrop-blur-xl',
          'dark:bg-background/50 dark:backdrop-blur-xl'
        )}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-foreground/70 dark:text-foreground/60">
            {user ? 'Your goal will be saved to your dashboard' : 'Sign in to save your goal'}
          </p>
          <Button
            size="lg"
            onClick={handleStartJourney}
            disabled={isSaving}
            className={cn(
              'w-full min-w-[200px] sm:w-auto',
              'bg-gradient-to-r from-purple-600 via-primary to-cyan-600',
              'hover:from-purple-500 hover:via-primary/90 hover:to-cyan-500',
              'dark:from-purple-400 dark:via-primary dark:to-cyan-400',
              'dark:hover:from-purple-300 dark:hover:via-primary/90 dark:hover:to-cyan-300',
              'text-primary-foreground transition-all duration-500',
              'hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/10'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="fixed bottom-24 left-4 right-4 mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-lg border p-4 text-sm backdrop-blur-xl',
              'border-destructive/20 bg-destructive/10 text-destructive',
              'dark:border-destructive/30 dark:bg-destructive/20'
            )}
          >
            {error}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

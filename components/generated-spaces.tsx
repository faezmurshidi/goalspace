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
  User as UserIcon,
} from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';

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
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { SpacesGrid } from '@/components/spaces-grid';

export function GeneratedSpaces() {
  const router = useRouter();
  const { spaces, currentGoal } = useSpaceStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const generatedSpacesRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
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
      <SpacesGrid spaces={spaces} />

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

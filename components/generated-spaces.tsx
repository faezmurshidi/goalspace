'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Brain, Target, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpaceStore, type Space } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export function GeneratedSpaces() {
  const router = useRouter()
  const { spaces, currentGoal } = useSpaceStore()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for pending goals to save after auth
  useEffect(() => {
    const savePendingGoal = async () => {
      const pendingGoal = localStorage.getItem('pendingGoal')
      const pendingSpaces = localStorage.getItem('pendingSpaces')

      if (!pendingGoal || !pendingSpaces) return

      try {
        setIsSaving(true)
        setError(null)

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Create the goal in Supabase
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: pendingGoal,
            description: 'Goal created from AI analysis',
            category: 'learning',
            status: 'active',
            progress: 0
          })
          .select()
          .single()

        if (goalError) throw goalError
        if (!goalData) throw new Error('Failed to create goal')

        // Create spaces in Supabase
        const parsedSpaces = JSON.parse(pendingSpaces)
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
              order_index: index
            })
            .select()
            .single()

          if (spaceError) throw spaceError
          return spaceData
        })

        await Promise.all(spacesPromises)

        // Clear pending data
        localStorage.removeItem('pendingGoal')
        localStorage.removeItem('pendingSpaces')

        // Navigate to dashboard
        router.push('/dashboard')
      } catch (err) {
        console.error('Error saving pending goal:', err)
        setError('Failed to save your goal. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }

    savePendingGoal()
  }, [router])

  const handleStartJourney = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Store current goal data in localStorage
        localStorage.setItem('pendingGoal', currentGoal)
        localStorage.setItem('pendingSpaces', JSON.stringify(spaces))

        // Redirect to auth page
        router.push('/auth')
        return
      }

      //if the same goal is already saved, redirect to dashboard
      const { data: existingGoalData, error: existingGoalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('title', currentGoal)
        .single()

      if (existingGoalData) {
        router.push('/dashboard')
        return
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
          progress: 0
        })
        .select()
        .single()

      if (goalError) throw goalError
      if (!goalData) throw new Error('Failed to create goal')

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
          order_index: index
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
      router.push('/dashboard')
    } catch (err) {
      console.error('Error saving to Supabase:', err)
      setError('Failed to save your goal. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!spaces.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-8"
    >
      <div className="grid gap-8 md:grid-cols-2">
        {spaces.map((space, index) => (
          <motion.div
            key={space.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
          >
            <Card
              className={cn(
                "relative overflow-hidden backdrop-blur-xl border-border shadow-2xl",
                "bg-card hover:bg-card-hover transition-all duration-300",
                "group hover:shadow-xl hover:-translate-y-1"
              )}
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-purple-500 to-cyan-500" />
              </div>

              <CardHeader className="pb-4 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                    {space.category === 'learning' ? (
                      <Brain className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Target className="h-5 w-5 text-cyan-500" />
                    )}
                    {space.title}
                  </CardTitle>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium",
                      "bg-muted backdrop-blur-md border border-border",
                      space.category === 'learning'
                        ? "text-purple-300"
                        : "text-cyan-300"
                    )}
                  >
                    {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                  </motion.span>
                </div>
                <CardDescription className="mt-2.5 text-muted-foreground">{space.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 relative">

                {/* Objective Section */}
                <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                  <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Objective
                  </h3>
                  <p className="text-sm text-muted-foreground">{space.objectives.join(', ')}</p>
                </div>

                {/* Prerequisites Section */}
                <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                  <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Prerequisites
                  </h3>
                  <p className="text-sm text-muted-foreground">{space.prerequisites.join(', ')}</p>
                </div>

                {/* Time to Complete Section */}
                <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                  <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Time to Complete
                  </h3>
                  <p className="text-sm text-muted-foreground">{space.time_to_complete}</p>
                </div>

                {/* To Do List Section */}
                <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                  <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    To Do List
                  </h3>
                  <p className="text-sm text-muted-foreground">{space.to_do_list.join(', ')}</p>
                </div>

                {/* Mentor Section */}
                {space.mentor && (
                  <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Your AI Mentor
                    </h3>
                    <div className="space-y-2.5">
                      <p className="font-medium text-sm text-foreground">{space.mentor.name}</p>
                      <p className="text-sm text-muted-foreground italic">
                        "{space.mentor.introduction}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Teaching style: {space.mentor.personality}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <span>Expert in: </span>
                        <span className="text-muted-foreground">{space.mentor.expertise.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Prompt Section */}
                {space.mentor?.system_prompt && (
                  <div className="p-4 rounded-lg bg-card backdrop-blur-md border border-border">
                    <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-foreground">
                      <Brain className="h-4 w-4 text-purple-500" />
                      System Prompt
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {space.mentor.system_prompt}
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Button */}
      <motion.div
        className="flex flex-col gap-4 pt-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          size="lg"
          onClick={handleStartJourney}
          disabled={isSaving}
          className={cn(
            "w-full h-14 text-lg font-medium shadow-lg backdrop-blur-xl gap-2 justify-center",
            "bg-gradient-to-r from-purple-500/80 to-cyan-500/80 hover:from-purple-500/90 hover:to-cyan-500/90",
            "border border-white/10"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving your goal...
            </>
          ) : (
            <>
              Continue to Dashboard
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-white/50">
          {user ? "Your goal will be saved to your dashboard" : "You'll need to sign in to save your goal"}
        </p>

        {error && (
          <div className="text-red-400 text-sm p-4 bg-red-500/10 backdrop-blur-xl rounded-lg border border-red-500/20">
            {error}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

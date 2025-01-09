'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Brain, Target, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpaceStore, type Space } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export function GeneratedSpaces() {
  const router = useRouter()
  const { spaces } = useSpaceStore()

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
                "relative overflow-hidden backdrop-blur-xl border-white/10 shadow-2xl",
                "bg-white/5 hover:bg-white/10 transition-all duration-300",
                "group hover:shadow-xl hover:-translate-y-1"
              )}
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-purple-500 to-cyan-500" />
              </div>

              <CardHeader className="pb-4 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
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
                      "bg-white/10 backdrop-blur-md border border-white/10",
                      space.category === 'learning'
                        ? "text-purple-300"
                        : "text-cyan-300"
                    )}
                  >
                    {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                  </motion.span>
                </div>
                <CardDescription className="mt-2.5 text-white/70">{space.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 relative">
                {/* Mentor Section */}
                <div className="p-4 rounded-lg bg-white/5 backdrop-blur-md border border-white/10">
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-white">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Your AI Mentor
                  </h3>
                  <div className="space-y-2.5">
                    <p className="font-medium text-sm text-white">{space.mentor.name}</p>
                    <p className="text-sm text-white/70 italic">
                      "{space.mentor.introduction}"
                    </p>
                    <p className="text-xs text-white/50">
                      Teaching style: {space.mentor.personality}
                    </p>
                    <div className="text-xs text-white/50">
                      <span>Expert in: </span>
                      <span className="text-white/70">{space.mentor.expertise.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* System Prompt Section */}
                <div className="p-4 rounded-lg bg-white/5 backdrop-blur-md border border-white/10">
                  <h3 className="font-medium mb-2 text-sm flex items-center gap-2 text-white">
                    <Brain className="h-4 w-4 text-purple-500" />
                    System Prompt
                  </h3>
                  <p className="text-sm text-white/70">
                    {space.mentor.system_prompt}
                  </p>
                </div>

                {/* Action Button */}
                <motion.div 
                  className="flex justify-end pt-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    onClick={() => router.push('/dashboard')}
                    className={cn(
                      "w-full h-14 text-lg font-medium shadow-lg backdrop-blur-xl gap-2 justify-center",
                      "bg-gradient-to-r from-purple-500/80 to-cyan-500/80 hover:from-purple-500/90 hover:to-cyan-500/90",
                      "border border-white/10"
                    )}
                  >
                    Start Your Goal Journey
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
} 
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useSpaceStore } from '@/lib/store'
import { BookOpen, Target, Trophy } from 'lucide-react'

// Dashboard stats component that shows in parallel route
export default function StatsPage() {
  const { goals, spaces } = useSpaceStore()
  const [stats, setStats] = useState({
    completionRate: 0,
    totalModules: 0,
    completedModules: 0,
    activeGoals: 0
  })

  useEffect(() => {
    // Calculate dashboard stats
    const activeGoals = goals.filter(g => g.progress < 100).length
    const totalSpaces = spaces.length
    const completedSpaces = spaces.filter(s => s.progress === 100).length
    const completionRate = totalSpaces ? Math.round((completedSpaces / totalSpaces) * 100) : 0
    
    // Get modules stats
    let totalModules = 0
    let completedModules = 0
    
    Object.values(useSpaceStore.getState().modulesBySpaceId).forEach(modules => {
      totalModules += modules.length
      completedModules += modules.filter(m => m.is_completed).length
    })
    
    setStats({
      completionRate,
      totalModules,
      completedModules,
      activeGoals
    })
  }, [goals, spaces])

  const stats_items = [
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: <Trophy className="h-4 w-4 text-yellow-500" />,
      description: "Overall progress across all spaces",
      color: "bg-yellow-500"
    },
    {
      title: "Modules Completed",
      value: `${stats.completedModules}/${stats.totalModules}`,
      icon: <BookOpen className="h-4 w-4 text-blue-500" />,
      description: "Learning modules finished",
      color: "bg-blue-500"
    },
    {
      title: "Active Goals",
      value: stats.activeGoals.toString(),
      icon: <Target className="h-4 w-4 text-green-500" />,
      description: "Goals currently in progress",
      color: "bg-green-500"
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats_items.map((item, index) => (
        <Card key={index} className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">{item.title}</h3>
              <div className="mt-1 flex items-center">
                <span className="text-2xl font-bold">{item.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            <div className="bg-muted p-2 rounded-full">
              {item.icon}
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{
                width: item.title === "Completion Rate" 
                  ? `${stats.completionRate}%` 
                  : item.title === "Modules Completed"
                    ? `${stats.totalModules ? (stats.completedModules / stats.totalModules) * 100 : 0}%`
                    : "100%"
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}
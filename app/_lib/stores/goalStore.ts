import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Basic Goal type - you may want to replace this with your actual types
export interface Goal {
  id: string
  title: string
  description?: string
  status: 'not_started' | 'in_progress' | 'completed'
  userId: string
  createdAt: string
  updatedAt: string
}

interface GoalState {
  goals: Goal[]
  activeGoalId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setGoals: (goals: Goal[]) => void
  setActiveGoal: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
}

export const useGoalStore = create<GoalState>()(
  devtools(
    persist(
      (set) => ({
        goals: [],
        activeGoalId: null,
        isLoading: false,
        error: null,
        
        setGoals: (goals) => set({ goals }),
        setActiveGoal: (id) => set({ activeGoalId: id }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        addGoal: (goal) => set((state) => ({ 
          goals: [...state.goals, goal] 
        })),
        
        updateGoal: (id, updates) => set((state) => ({
          goals: state.goals.map((goal) => 
            goal.id === id ? { ...goal, ...updates } : goal
          )
        })),
        
        deleteGoal: (id) => set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
          activeGoalId: state.activeGoalId === id ? null : state.activeGoalId
        })),
      }),
      { name: 'goal-store' }
    )
  )
) 
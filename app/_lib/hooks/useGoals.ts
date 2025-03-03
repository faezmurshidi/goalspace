import { useEffect, useState } from 'react'
import { useGoalStore, type Goal } from '../stores/goalStore'

/**
 * Custom hook to fetch and manage goals
 * Combines Zustand state management with data fetching
 */
export function useGoals(status?: string) {
  const { 
    goals, 
    isLoading, 
    error, 
    setGoals, 
    setLoading, 
    setError 
  } = useGoalStore()
  
  const [isRefetching, setIsRefetching] = useState(false)
  
  async function fetchGoals() {
    setLoading(true)
    setError(null)
    
    try {
      const url = status ? `/api/goals?status=${status}` : '/api/goals'
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error fetching goals: ${response.status}`)
      }
      
      const data = await response.json()
      setGoals(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
      console.error('Error fetching goals:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function refetch() {
    setIsRefetching(true)
    await fetchGoals()
    setIsRefetching(false)
  }
  
  useEffect(() => {
    fetchGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  
  return {
    goals,
    isLoading,
    isRefetching,
    error,
    refetch
  }
} 
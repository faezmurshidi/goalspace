import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';
import { SpaceColor } from '@/lib/types/goalspace';

export interface Space {
  id: string;
  goal_id?: string | null;
  title: string;
  description: string;
  category: string;
  mentor_type?: string;
  objectives?: string[];
  prerequisites?: string[];
  progress?: number | null;
  space_color?: SpaceColor | null;
  order_index?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Goal {
  id: string;
  user_id?: string | null;
  title: string;
  description: string;
  category: string;
  status?: string | null;
  progress?: number | null;
  deadline?: string | null;
  spaces?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

interface SpaceStore {
  spaces: Space[];
  goals: Goal[];
  activeGoal: Goal | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSpaces: () => Promise<void>;
  loadGoals: () => Promise<void>;
  setActiveGoal: (goal: Goal) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set) => ({
      spaces: [],
      goals: [],
      activeGoal: null,
      isLoading: false,
      error: null,

      loadSpaces: async () => {
        try {
          set({ isLoading: true, error: null });
          const supabase = createClient();
          const { data: spaces, error } = await supabase
            .from('spaces')
            .select('*');

          if (error) throw error;

          set({ spaces: spaces || [], isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load spaces',
            isLoading: false 
          });
        }
      },

      loadGoals: async () => {
        try {
          set({ isLoading: true, error: null });
          const supabase = createClient();
          const { data: goals, error } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ goals: goals || [], isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load goals',
            isLoading: false 
          });
        }
      },

      setActiveGoal: (goal) => set({ activeGoal: goal }),
    }),
    {
      name: 'space-store',
      partialize: (state) => ({ 
        spaces: state.spaces, 
        goals: state.goals,
        activeGoal: state.activeGoal 
      }),
    }
  )
); 
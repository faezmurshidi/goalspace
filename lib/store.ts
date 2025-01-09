import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isFaez?: boolean;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'tutorial' | 'guide' | 'reference' | 'exercise';
  tags: string[];
}

interface Mentor {
  name: string;
  expertise: string[];
  personality: string;
  introduction: string;
  system_prompt: string;
}

export type SpaceColor = {
  main: string;
  secondary: string;
  accent: string;
};

export const SPACE_COLORS: SpaceColor[] = [
  {
    main: '#2563eb',     // Vibrant Blue
    secondary: '#dbeafe',
    accent: '#60a5fa'
  },
  {
    main: '#dc2626',     // Vibrant Red
    secondary: '#fee2e2',
    accent: '#f87171'
  },
  {
    main: '#16a34a',     // Vibrant Green
    secondary: '#dcfce7',
    accent: '#4ade80'
  },
  {
    main: '#9333ea',     // Vibrant Purple
    secondary: '#f3e8ff',
    accent: '#c084fc'
  },
  {
    main: '#ea580c',     // Vibrant Orange
    secondary: '#ffedd5',
    accent: '#fb923c'
  },
  {
    main: '#0d9488',     // Teal
    secondary: '#ccfbf1',
    accent: '#2dd4bf'
  },
  {
    main: '#4f46e5',     // Indigo
    secondary: '#e0e7ff',
    accent: '#818cf8'
  },
  {
    main: '#b91c1c',     // Ruby Red
    secondary: '#fee2e2',
    accent: '#ef4444'
  },
  {
    main: '#c2410c',     // Burnt Orange
    secondary: '#fff7ed',
    accent: '#fb923c'
  },
  {
    main: '#7c3aed',     // Electric Purple
    secondary: '#f3e8ff',
    accent: '#a78bfa'
  }
];

export interface Space {
  id: string;
  title: string;
  category: 'learning' | 'goal';
  description: string;
  objectives: string[];
  prerequisites: string[];
  to_do_list: string[];
  time_to_complete: string;
  mentor: {
    name: string;
    introduction: string;
    personality: string;
    expertise: string[];
    system_prompt: string;
  };
  space_color?: SpaceColor;
  plan?: string;
  research?: string;
  progress?: number;
  isCollapsed?: boolean;
  content?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  progress: number;
  spaces: string[]; // Array of space IDs
  createdAt: number;
}

export interface SpaceStore {
  spaces: Space[];
  goals: Goal[];
  documents: { [key: string]: Document[] };
  currentGoal: string;
  setSpaces: (spaces: Space[]) => void;
  setCurrentGoal: (goal: string) => void;
  getSpaceById: (id: string) => Space | undefined;
  getDocuments: (spaceId: string) => Document[];
  addDocument: (spaceId: string, document: Omit<Document, 'id'>) => void;
  todoStates: { [key: string]: { [key: string]: boolean } };
  setTodoStates: (states: { [key: string]: { [key: string]: boolean } }) => void;
  toggleTodo: (spaceId: string, todoIndex: string) => void;
  // Chat related state
  chatMessages: { [key: string]: Message[] };
  faezInChat: { [key: string]: boolean };
  addMessage: (spaceId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearChat: (spaceId: string) => void;
  toggleFaez: (spaceId: string) => void;
  // Dashboard related state and actions
  toggleSpaceCollapse: (spaceId: string) => void;
  updateSpaceProgress: (spaceId: string, progress: number) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoalProgress: (goalId: string) => void;
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setPlan: (spaceId: string, plan: string) => void;
  setResearch: (spaceId: string, research: string) => void;
  updateTodoList: (spaceId: string, todoList: string[]) => void;
  content: { [key: string]: string };
  setContent: (spaceId: string, content: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      spaces: [],
      goals: [],
      documents: {},
      currentGoal: '',
      todoStates: {},
      chatMessages: {},
      faezInChat: {},
      isSidebarCollapsed: false,
      setSpaces: (spaces) => {
        // When setting spaces, create a new goal with these spaces
        const goalId = Math.random().toString(36).substring(7);
        const newGoal: Goal = {
          id: goalId,
          title: get().currentGoal,
          description: "Goal created from spaces",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          progress: 0,
          spaces: spaces.map(s => s.id),
          createdAt: Date.now()
        };

        set((state) => ({
          spaces: spaces.map(space => ({ ...space, progress: 0, isCollapsed: true })),
          goals: [...state.goals, newGoal]
        }));
      },
      setCurrentGoal: (goal) => set({ currentGoal: goal }),
      getSpaceById: (id) => get().spaces.find(space => space.id === id),
      getDocuments: (spaceId) => get().documents[spaceId] || [],
      addDocument: (spaceId, document) => set((state) => ({
        documents: {
          ...state.documents,
          [spaceId]: [
            ...(state.documents[spaceId] || []),
            {
              ...document,
              id: Math.random().toString(36).substring(7),
            },
          ],
        },
      })),
      setTodoStates: (states) => {
        set({ todoStates: states });
        // Update progress when todo states change
        Object.entries(states).forEach(([spaceId, todos]) => {
          const completedTodos = Object.values(todos).filter(Boolean).length;
          const totalTodos = Object.keys(todos).length;
          const progress = (completedTodos / totalTodos) * 100;
          get().updateSpaceProgress(spaceId, progress);
        });
      },
      toggleTodo: (spaceId, todoIndex) =>
        set((state) => ({
          todoStates: {
            ...state.todoStates,
            [spaceId]: {
              ...state.todoStates[spaceId],
              [todoIndex]: !state.todoStates[spaceId]?.[todoIndex],
            },
          },
        })),
      addMessage: (spaceId, message) => set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [spaceId]: [
            ...(state.chatMessages[spaceId] || []),
            {
              ...message,
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
            },
          ],
        },
      })),
      clearChat: (spaceId) => set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [spaceId]: [],
        },
      })),
      toggleFaez: (spaceId) => set((state) => ({
        faezInChat: {
          ...state.faezInChat,
          [spaceId]: !state.faezInChat[spaceId]
        }
      })),
      setPlan: (spaceId, plan) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId ? { ...space, plan } : space
        ),
      })),
      setResearch: (spaceId, research) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId ? { ...space, research } : space
        ),
      })),
      toggleSpaceCollapse: (spaceId) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId
            ? { ...space, isCollapsed: !space.isCollapsed }
            : space
        ),
      })),
      updateSpaceProgress: (spaceId, progress) => set((state) => {
        const newSpaces = state.spaces.map((space) =>
          space.id === spaceId ? { ...space, progress } : space
        );
        
        // Find the goal containing this space and update its progress
        const goals = state.goals.map(goal => {
          if (goal.spaces.includes(spaceId)) {
            const goalSpaces = newSpaces.filter(space => goal.spaces.includes(space.id));
            const totalProgress = goalSpaces.reduce((sum, space) => sum + (space.progress || 0), 0);
            const averageProgress = totalProgress / goalSpaces.length;
            return { ...goal, progress: averageProgress };
          }
          return goal;
        });

        return { spaces: newSpaces, goals };
      }),
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, {
          ...goal,
          id: Math.random().toString(36).substring(7),
          createdAt: Date.now()
        }]
      })),
      updateGoalProgress: (goalId) => set((state) => {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return state;

        const goalSpaces = state.spaces.filter(space => goal.spaces.includes(space.id));
        const totalProgress = goalSpaces.reduce((sum, space) => sum + (space.progress || 0), 0);
        const averageProgress = totalProgress / goalSpaces.length;

        return {
          goals: state.goals.map(g =>
            g.id === goalId ? { ...g, progress: averageProgress } : g
          )
        };
      }),
      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),
      updateTodoList: (spaceId, todoList) => set((state) => {
        // Update the space's to-do list
        const newSpaces = state.spaces.map((space) =>
          space.id === spaceId ? { ...space, to_do_list: todoList } : space
        );

        // Initialize new todo states for the updated list
        const newTodoStates = {
          ...state.todoStates,
          [spaceId]: todoList.reduce((acc, _, index) => {
            acc[index.toString()] = state.todoStates[spaceId]?.[index.toString()] || false;
            return acc;
          }, {} as { [key: string]: boolean })
        };

        return { 
          spaces: newSpaces,
          todoStates: newTodoStates
        };
      }),
      content: {},
      setContent: (spaceId, content) =>
        set((state) => ({
          content: {
            ...state.content,
            [spaceId]: content,
          },
        })),
    }),
    {
      name: 'space-store',
    }
  )
); 
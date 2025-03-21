import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';

// Create a singleton instance for the store
const supabase = createClient();

import { Module, ModuleUpdate, ModuleCreate } from '@/lib/types/module';
import { storeDocumentEmbedding } from '@/lib/vector';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Define SupabaseGoal and SupabaseSpace types to match database structure
type SupabaseGoal = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string | null;
  progress: number | null;
  deadline: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseSpace = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  mentor_type: string;
  progress: number | null;
  space_color: any | null;
  order_index: number;
  objectives: string[];
  prerequisites: string[];
  mentor: any;
  created_at: string | null;
  updated_at: string | null;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface Document {
  id: string;
  space_id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata?: any;
  created_at?: string;
  updated_at?: string;
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
    main: '#2563eb', // Vibrant Blue
    secondary: '#dbeafe',
    accent: '#60a5fa',
  },
  {
    main: '#dc2626', // Vibrant Red
    secondary: '#fee2e2',
    accent: '#f87171',
  },
  {
    main: '#16a34a', // Vibrant Green
    secondary: '#dcfce7',
    accent: '#4ade80',
  },
  {
    main: '#9333ea', // Vibrant Purple
    secondary: '#f3e8ff',
    accent: '#c084fc',
  },
  {
    main: '#ea580c', // Vibrant Orange
    secondary: '#ffedd5',
    accent: '#fb923c',
  },
  {
    main: '#0d9488', // Teal
    secondary: '#ccfbf1',
    accent: '#2dd4bf',
  },
  {
    main: '#4f46e5', // Indigo
    secondary: '#e0e7ff',
    accent: '#818cf8',
  },
  {
    main: '#b91c1c', // Ruby Red
    secondary: '#fee2e2',
    accent: '#ef4444',
  },
  {
    main: '#c2410c', // Burnt Orange
    secondary: '#fff7ed',
    accent: '#fb923c',
  },
  {
    main: '#7c3aed', // Electric Purple
    secondary: '#f3e8ff',
    accent: '#a78bfa',
  },
];

export interface Space {
  id: string;
  goal_id?: string | null;
  title: string;
  category: string;
  description: string;
  mentor_type?: string;
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
  space_color?: SpaceColor | null;
  order_index?: number;
  plan?: string;
  research?: string;
  progress?: number | null;
  isCollapsed?: boolean;
  content?: string;
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
  deadline?: string | null;
  progress?: number | null;
  spaces: string[]; // Array of space IDs
  createdAt?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Task {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  status: string | null;
  due_date?: string | null;
  order_index?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Podcast {
  id: string;
  space_id: string;
  title: string;
  audio_url: string;
  module_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceStore {
  spaces: Space[];
  goals: Goal[];
  documents: { [key: string]: Document[] };
  currentGoal: string;
  modules: Module[];
  setSpaces: (spaces: Space[]) => void;
  setCurrentGoal: (goal: string) => void;
  getSpaceById: (id: string) => Space | undefined;
  getDocuments: (spaceId: string) => Document[];
  addDocument: (spaceId: string, document: Document) => void;
  todoStates: { [key: string]: { [key: string]: boolean } };
  setTodoStates: (states: { [key: string]: { [key: string]: boolean } }) => void;
  toggleTodo: (spaceId: string, todoIndex: string) => void;
  // Chat related state
  chatMessages: { [key: string]: Message[] };
  faezInChat: { [key: string]: boolean };
  isLoadingMessages: { [key: string]: boolean };
  hasMoreMessages: { [key: string]: boolean };
  addMessage: (spaceId: string, message: Omit<Message, 'id' | 'timestamp' | 'isFaez'>) => Promise<void>;
  loadMessages: (spaceId: string, limit?: number, offset?: number) => Promise<void>;
  clearChat: (spaceId: string) => Promise<void>;
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
  reset: () => void;
  // New function to load user data
  loadUserData: () => Promise<void>;
  loadDocuments: (spaceId: string) => Promise<void>;
  setModules: (spaceId: string, modules: Module[]) => void;
  updateModule: (spaceId: string, moduleId: string, updates: Partial<ModuleUpdate>) => Promise<void>;
  getModules: (spaceId: string) => Promise<Module[]>;
  setGoals: (goals: Goal[]) => void;
  setActiveGoal: (goal: Goal) => void;
  currentUser: { id: string } | null;
  activeGoal: Goal | null;
  currentModuleIndex: number;
  setCurrentModuleIndex: (spaceId: string, index: number) => void;
  modulesBySpaceId: Record<string, Module[]>;
  currentModuleIndexBySpaceId: Record<string, number>;
  fetchModules: (spaceId: string) => Promise<Module[]>;
  generateSpaceModules: (spaceId: string) => Promise<Module[]>;
  createModule: (moduleData: ModuleCreate) => Promise<Module>;
  deleteModule: (spaceId: string, moduleId: string) => Promise<void>;
  getCurrentModule: (spaceId: string) => Module | undefined;
  generateTasks: (spaceId: string, moduleDoc: any) => Promise<any[]>;
  tasks: Record<string, Task[]>;
  fetchTasks: (spaceId: string) => Promise<Task[]>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  podcasts: { [spaceId: string]: Podcast[] };
  savePodcast: (spaceId: string, podcast: Omit<Podcast, 'id' | 'created_at' | 'updated_at'>) => Promise<Podcast>;
  fetchPodcasts: (spaceId: string) => Promise<Podcast[]>;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      spaces: [],
      goals: [],
      documents: {},
      modules: [],
      currentGoal: '',
      todoStates: {},
      chatMessages: {},
      faezInChat: {},
      isLoadingMessages: {},
      hasMoreMessages: {},
      isSidebarCollapsed: false,
      currentUser: null,
      activeGoal: null,
      currentModuleIndex: 0,
      modulesBySpaceId: {},
      currentModuleIndexBySpaceId: {},
      tasks: {},
      podcasts: {},
      setSpaces: (spaces) => {
        // When setting spaces, create a new goal with these spaces
        const goalId = Math.random().toString(36).substring(7);
        const newGoal: Goal = {
          id: goalId,
          title: get().currentGoal,
          description: 'Goal created from spaces',
          category: 'personal',
          status: 'active',
          progress: 0,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          spaces: spaces.map((s) => s.id),
          createdAt: Date.now(),
        };

        set((state) => ({
          spaces: spaces.map((space) => ({ ...space, progress: 0, isCollapsed: true })),
          goals: [...state.goals, newGoal],
        }));
      },
      setCurrentGoal: (goal) => set({ currentGoal: goal }),
      getSpaceById: (id) => get().spaces.find((space) => space.id === id),
      getDocuments: (spaceId) => get().documents[spaceId] || [],
      addDocument: async (spaceId: string, document: Document) => {
        try {
          // Get the current user
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Save to Supabase
          const { data: savedDoc, error } = await supabase
            .from('documents')
            .insert({
              space_id: spaceId,
              title: document.title,
              content: document.content,
              type: document.type,
              tags: document.tags || [],
              metadata: document.metadata || {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // After successful document storage, generate and store embedding
          await storeDocumentEmbedding({
            ...savedDoc,
            id: savedDoc.id,
            space_id: spaceId,
            tags: savedDoc.tags || []
          });

          // Update local state
          set((state) => ({
            documents: {
              ...state.documents,
              [spaceId]: [
                ...(state.documents[spaceId] || []),
                {
                  ...savedDoc,
                  tags: savedDoc.tags || []
                },
              ],
            },
          }));
        } catch (error) {
          console.error('Error saving document:', error);
          throw error;
        }
      },
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
      addMessage: async (spaceId, message) => {
        try {
          // Add message to Supabase
          const { data, error } = await supabase
            .from('chat_messages')
            .insert({
              space_id: spaceId,
              role: message.role,
              content: message.content,
              metadata: {
                ...message.metadata,
              }
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set((state) => ({
            chatMessages: {
              ...state.chatMessages,
              [spaceId]: [
                ...(state.chatMessages[spaceId] || []),
                {
                  id: data.id,
                  role: data.role,
                  content: data.content,
                  timestamp: new Date(data.created_at).getTime(),
                  metadata: data.metadata,
                },
              ],
            },
          }));
        } catch (error) {
          console.error('Error adding message:', error);
          throw error;
        }
      },
      loadMessages: async (spaceId, limit = 50, offset = 0) => {
        try {
          set((state) => ({
            isLoadingMessages: { ...state.isLoadingMessages, [spaceId]: true },
          }));

          const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('space_id', spaceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) throw error;

          // Update local state
          set((state) => ({
            chatMessages: {
              ...state.chatMessages,
              [spaceId]: (messages || []).map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.created_at).getTime(),
                metadata: msg.metadata,
              })),
            },
            hasMoreMessages: {
              ...state.hasMoreMessages,
              [spaceId]: messages?.length === limit,
            },
          }));
        } catch (error) {
          console.error('Error loading messages:', error);
          throw error;
        } finally {
          set((state) => ({
            isLoadingMessages: { ...state.isLoadingMessages, [spaceId]: false },
          }));
        }
      },
      clearChat: async (spaceId) => {
        try {
          // Delete messages from Supabase
          const { error } = await supabase.from('chat_messages').delete().eq('space_id', spaceId);

          if (error) throw error;

          // Clear local state
          set((state) => ({
            chatMessages: {
              ...state.chatMessages,
              [spaceId]: [],
            },
          }));
        } catch (error) {
          console.error('Error clearing chat:', error);
          throw error;
        }
      },
      toggleFaez: (spaceId) =>
        set((state) => ({
          faezInChat: {
            ...state.faezInChat,
            [spaceId]: !state.faezInChat[spaceId],
          },
        })),
      setPlan: (spaceId, plan) =>
        set((state) => ({
          spaces: state.spaces.map((space) => (space.id === spaceId ? { ...space, plan } : space)),
        })),
      setResearch: (spaceId, research) =>
        set((state) => ({
          spaces: state.spaces.map((space) =>
            space.id === spaceId ? { ...space, research } : space
          ),
        })),
      toggleSpaceCollapse: (spaceId) =>
        set((state) => ({
          spaces: state.spaces.map((space) =>
            space.id === spaceId ? { ...space, isCollapsed: !space.isCollapsed } : space
          ),
        })),
      updateSpaceProgress: (spaceId, progress) =>
        set((state) => {
          const newSpaces = state.spaces.map((space) =>
            space.id === spaceId ? { ...space, progress } : space
          );

          // Find the goal containing this space and update its progress
          const goals = state.goals.map((goal) => {
            if (goal.spaces.includes(spaceId)) {
              const goalSpaces = newSpaces.filter((space) => goal.spaces.includes(space.id));
              const totalProgress = goalSpaces.reduce(
                (sum, space) => sum + (space.progress || 0),
                0
              );
              const averageProgress = totalProgress / goalSpaces.length;
              return { ...goal, progress: averageProgress };
            }
            return goal;
          });

          return { spaces: newSpaces, goals };
        }),
      addGoal: async (goal) => {
        try {
          const supabase = createClient();
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          
          const { data, error } = await supabase
            .from('goals')
            .insert({
              title: goal.title,
              description: goal.description,
              category: goal.category || 'personal',
              user_id: userData.user.id,
              status: 'active',
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Update local state
          set((state) => ({
            goals: [...state.goals, { ...data, spaces: [] }],
            currentGoal: { ...data, spaces: [] },
          }));
          
          return data;
        } catch (error) {
          console.error('Error creating goal:', error);
          throw error;
        }
      },
      updateGoalProgress: (goalId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (!goal) return state;

          const goalSpaces = state.spaces.filter((space) => goal.spaces.includes(space.id));
          const totalProgress = goalSpaces.reduce((sum, space) => sum + (space.progress || 0), 0);
          const averageProgress = totalProgress / goalSpaces.length;

          return {
            goals: state.goals.map((g) =>
              g.id === goalId ? { ...g, progress: averageProgress } : g
            ),
          };
        }),
      toggleSidebar: () =>
        set((state) => ({
          isSidebarCollapsed: !state.isSidebarCollapsed,
        })),
      updateTodoList: (spaceId, todoList) =>
        set((state) => {
          // Update the space's to-do list
          const newSpaces = state.spaces.map((space) =>
            space.id === spaceId ? { ...space, to_do_list: todoList } : space
          );

          // Initialize new todo states for the updated list
          const newTodoStates = {
            ...state.todoStates,
            [spaceId]: todoList.reduce(
              (acc, _, index) => {
                acc[index.toString()] = state.todoStates[spaceId]?.[index.toString()] || false;
                return acc;
              },
              {} as { [key: string]: boolean }
            ),
          };

          return {
            spaces: newSpaces,
            todoStates: newTodoStates,
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
      reset: () => set({ spaces: [], goals: [], isSidebarCollapsed: false }),
      // Add loadUserData function
      loadUserData: async () => {
        try {
          // Get current user
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (!user) return;

          // Fetch goals
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id);

          if (goalsError) throw goalsError;

          // Fetch spaces for each goal
          const spacesPromises = goalsData.map(async (goal: SupabaseGoal) => {
            const { data: spacesData, error: spacesError } = await supabase
              .from('spaces')
              .select('*')
              .eq('goal_id', goal.id);

            if (spacesError) throw spacesError;
            return spacesData;
          });

          const spacesArrays = await Promise.all(spacesPromises);
          const allSpaces = spacesArrays.flat();

          // Transform the data to match our store format
          const formattedGoals: Goal[] = goalsData.map((goal: SupabaseGoal) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description || '',
            category: goal.category,
            status: goal.status,
            progress: goal.progress || 0,
            deadline: goal.deadline,
            spaces: [],
            created_at: goal.created_at,
            updated_at: goal.updated_at,
            createdAt: new Date(goal.created_at || Date.now()).getTime(),
          }));

          const formattedSpaces: Space[] = allSpaces.map((space: SupabaseSpace) => ({
            id: space.id,
            title: space.title,
            category: space.category,
            description: space.description || '',
            objectives: Array.isArray(space.objectives) ? space.objectives : JSON.parse(space.objectives || '[]'), 
            prerequisites: Array.isArray(space.prerequisites) ? space.prerequisites : JSON.parse(space.prerequisites || '[]'),
            to_do_list: [], // We'll need to add this to the schema if needed
            time_to_complete: '', // We'll need to add this to the schema if needed
            mentor: JSON.parse(space.mentor || '{}'),
            space_color: JSON.parse(space.space_color || '{}'),
            progress: space.progress || 0,
            isCollapsed: true,
          }));

          // Update the store
          set({
            goals: formattedGoals,
            spaces: formattedSpaces,
          });
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      },
      loadDocuments: async (spaceId: string) => {
        try {
          const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .eq('space_id', spaceId);

          if (error) throw error;

          // Update local state with fetched documents
          set((state) => ({
            documents: {
              ...state.documents,
              [spaceId]: documents || [],
            },
          }));
        } catch (error) {
          console.error('Error loading documents:', error);
          throw error;
        }
      },
      setModules: (spaceId: string, modules: Module[]) => {
        set(state => ({
          modulesBySpaceId: {
            ...state.modulesBySpaceId,
            [spaceId]: modules
          }
        }));
      },
      updateModule: async (spaceId: string, moduleId: string, updates: Partial<ModuleUpdate>) => {
        try {
          const { error } = await supabase
            .from('modules')
            .update(updates)
            .eq('id', moduleId)
            .eq('space_id', spaceId);

          if (error) throw error;

          // Only update the store if the database update was successful
          set(state => ({
            modulesBySpaceId: {
              ...state.modulesBySpaceId,
              [spaceId]: state.modulesBySpaceId[spaceId]?.map(module =>
                module.id === moduleId ? { ...module, ...updates } : module
              ) || []
            }
          }));
        } catch (error) {
          console.error('Error updating module:', error);
          throw error;
        }
      },
      getModules: async (spaceId: string) => {
        console.log('Getting modules for space:', spaceId);
        try {
          const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('space_id', spaceId)
            .order('order_index');

          if (error) throw error;

          return data as Module[];
        } catch (error) {
          console.error('Error getting modules:', error);
          throw error;
        }
      },
      setGoals: (goals) => set({ goals }),
      setActiveGoal: (goal) => set({ activeGoal: goal }),
      setCurrentModuleIndex: (spaceId: string, index: number) => {
        set(state => ({
          currentModuleIndexBySpaceId: {
            ...state.currentModuleIndexBySpaceId,
            [spaceId]: index
          }
        }));
      },
      fetchModules: async (spaceId: string) => {
        const state = get();
        // Return cached modules if they exist
        if (state.modulesBySpaceId[spaceId]?.length > 0) {
          return state.modulesBySpaceId[spaceId];
        }

        try {
          const { data: modules, error } = await supabase
            .from('modules')
            .select('*')
            .eq('space_id', spaceId)
            .order('order_index');

          if (error) throw error;

          set(state => ({
            modulesBySpaceId: {
              ...state.modulesBySpaceId,
              [spaceId]: modules
            }
          }));

          return modules;
        } catch (error) {
          console.error('Error fetching modules:', error);
          return [];
        }
      },
      generateSpaceModules: async (spaceId) => {
        const space = get().getSpaceById(spaceId);
        if (!space) throw new Error('Space not found');

        const response = await fetch('/api/generate-modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ space })
        });

        if (!response.ok) throw new Error('Module generation failed');
        const { modules } = await response.json();
        
        // Save to Supabase
        const { error } = await supabase
          .from('modules')
          .insert(modules.map((m: Module, i: number) => ({
            ...m,
            space_id: spaceId,
            order_index: i
          })));

        if (error) throw error;
        return modules;
      },
      createModule: async (moduleData: ModuleCreate) => {
        try {
          const { data, error } = await supabase
            .from('modules')
            .insert([moduleData])
            .select()
            .single();

          if (error) throw error;

          set(state => ({
            modulesBySpaceId: {
              ...state.modulesBySpaceId,
              [moduleData.space_id]: [
                ...(state.modulesBySpaceId[moduleData.space_id] || []),
                data
              ]
            }
          }));

          return data;
        } catch (error) {
          console.error('Error creating module:', error);
          throw error;
        }
      },
      deleteModule: async (spaceId: string, moduleId: string) => {
        try {
          const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', moduleId)
            .eq('space_id', spaceId);

          if (error) throw error;

          set(state => ({
            modulesBySpaceId: {
              ...state.modulesBySpaceId,
              [spaceId]: state.modulesBySpaceId[spaceId]?.filter(
                module => module.id !== moduleId
              ) || []
            }
          }));
        } catch (error) {
          console.error('Error deleting module:', error);
          throw error;
        }
      },
      getCurrentModule: (spaceId: string) => {
        const state = get();
        const modules = state.modulesBySpaceId[spaceId] || [];
        const currentIndex = state.currentModuleIndexBySpaceId[spaceId] || 0;
        return modules[currentIndex];
      },
      generateTasks: async (spaceId: string, moduleDoc: any) => {
        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              moduleDoc: {
                ...moduleDoc,
                space_id: spaceId
              }
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate tasks');
          }

          const data = await response.json();
          return data.tasks;
        } catch (error) {
          console.error('Error generating tasks:', error);
          throw error;
        }
      },
      fetchTasks: async (spaceId: string) => {
        try {
          const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('space_id', spaceId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set(state => ({
            tasks: {
              ...state.tasks,
              [spaceId]: tasks
            }
          }));

          return tasks;
        } catch (error) {
          console.error('Error fetching tasks:', error);
          throw error;
        }
      },
      updateTaskStatus: async (taskId: string, status: Task['status']) => {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({ status })
            .eq('id', taskId);

          if (error) throw error;

          // Update local state
          set(state => ({
            tasks: Object.fromEntries(
              Object.entries(state.tasks).map(([spaceId, tasks]) => [
                spaceId,
                tasks.map(task => 
                  task.id === taskId ? { ...task, status } : task
                )
              ])
            )
          }));
        } catch (error) {
          console.error('Error updating task status:', error);
          throw error;
        }
      },
      savePodcast: async (spaceId: string, podcast) => {
        try {
          const { data: savedPodcast, error } = await supabase
            .from('podcasts')
            .insert({
              space_id: spaceId,
              title: podcast.title,
              audio_url: podcast.audio_url,
              module_id: podcast.module_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set((state) => ({
            podcasts: {
              ...state.podcasts,
              [spaceId]: [...(state.podcasts[spaceId] || []), savedPodcast],
            },
          }));

          return savedPodcast;
        } catch (error) {
          console.error('Error saving podcast:', error);
          throw error;
        }
      },
      fetchPodcasts: async (spaceId: string) => {
        try {
          const { data: podcasts, error } = await supabase
            .from('podcasts')
            .select('*')
            .eq('space_id', spaceId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Update local state
          set((state) => ({
            podcasts: {
              ...state.podcasts,
              [spaceId]: podcasts,
            },
          }));

          return podcasts;
        } catch (error) {
          console.error('Error fetching podcasts:', error);
          throw error;
        }
      },
    }),
    {
      name: 'space-store',
      partialize: (state) => ({
        spaces: state.spaces,
        goals: state.goals,
        documents: state.documents,
        modules: state.modules,
        currentGoal: state.currentGoal,
        todoStates: state.todoStates,
        isSidebarCollapsed: state.isSidebarCollapsed,
        currentModuleIndexBySpaceId: state.currentModuleIndexBySpaceId,
        modulesBySpaceId: state.modulesBySpaceId,
        activeGoal: state.activeGoal,
        tasks: state.tasks,
        podcasts: state.podcasts,
      }),
    }
  )
);

export async function getServerSupabase(cookieStore: ReturnType<typeof cookies>) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
  return supabase;
}

export async function getAuthenticatedUser(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

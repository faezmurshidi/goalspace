import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isFaez?: boolean;
}

interface Document {
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

export interface Space {
  id: string;
  category: string;
  title: string;
  description: string;
  mentor: Mentor;
  objectives: string[];
  prerequisites: string[];
  time_to_complete: string;
  to_do_list: string[];
  plan?: string;
  research?: string;
}

interface SpaceStore {
  spaces: Space[];
  documents: { [key: string]: Document[] };
  currentGoal: string;
  setSpaces: (spaces: Space[]) => void;
  setCurrentGoal: (goal: string) => void;
  getSpaceById: (id: string) => Space | undefined;
  getDocuments: (spaceId: string) => Document[];
  addDocument: (spaceId: string, document: Omit<Document, 'id'>) => void;
  todoStates: { [key: string]: { [key: string]: boolean } };
  setTodoStates: (states: { [key: string]: { [key: string]: boolean } }) => void;
  toggleTodo: (spaceId: string, taskIndex: string) => void;
  // Chat related state
  chatMessages: { [key: string]: Message[] };
  faezInChat: { [key: string]: boolean };
  addMessage: (spaceId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearChat: (spaceId: string) => void;
  toggleFaez: (spaceId: string) => void;
  setPlan: (spaceId: string, plan: string) => void;
  setResearch: (spaceId: string, research: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      spaces: [],
      documents: {},
      currentGoal: '',
      todoStates: {},
      chatMessages: {},
      faezInChat: {},
      setSpaces: (spaces) => set({ spaces }),
      setCurrentGoal: (goal) => set({ currentGoal: goal }),
      getSpaceById: (id) => get().spaces.find(space => space.id === id),
      setTodoStates: (states) => set({ todoStates: states }),
      toggleTodo: (spaceId, taskIndex) => set((state) => ({
        todoStates: {
          ...state.todoStates,
          [spaceId]: {
            ...state.todoStates[spaceId],
            [taskIndex]: !state.todoStates[spaceId]?.[taskIndex]
          }
        }
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
      setPlan: (spaceId, plan) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId ? { ...space, plan } : space
        ),
      })),
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
      toggleFaez: (spaceId) => set((state) => ({
        faezInChat: {
          ...state.faezInChat,
          [spaceId]: !state.faezInChat[spaceId]
        }
      })),
      setResearch: (spaceId, research) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId ? { ...space, research } : space
        ),
      })),
    }),
    {
      name: 'space-storage',
    }
  )
); 
import { SpaceColor } from './goalspace';

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
};

export type UserApiUsage = {
  id: string;
  user_id: string;
  api_calls_count: number;
  last_api_call: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSubscriptionHistory = {
  id: string;
  user_id: string;
  subscription_type: 'free' | 'pro' | 'enterprise';
  start_date: string;
  end_date: string | null;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  progress: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type Space = {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  category: string;
  mentor_type: string;
  progress: number;
  space_color: SpaceColor | null;
  order_index: number;
  objectives: string[];
  prerequisites: string[];
  mentor: {
    name: string;
    expertise: string[];
    personality: string;
    introduction: string;
    system_prompt: string;
  };
  modules: {
    id: string;
    title: string;
    content: string;
    isCompleted: boolean;
  }[];
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  space_id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  space_id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export interface Module {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  content: string;
  order_index: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_api_usage: {
        Row: UserApiUsage;
        Insert: Omit<UserApiUsage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserApiUsage, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_subscription_history: {
        Row: UserSubscriptionHistory;
        Insert: Omit<UserSubscriptionHistory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSubscriptionHistory, 'id' | 'created_at' | 'updated_at'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'progress' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>;
      };
      spaces: {
        Row: Space;
        Insert: Omit<Space, 'id' | 'progress' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Space, 'id' | 'created_at' | 'updated_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>>;
      };
      modules: {
        Row: Module;
        Insert: Omit<Module, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}; 
import { SpaceColor } from './goalspace';

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UserSettings = {
  id: string;
  user_id: string | null;
  theme: string | null;
  theme_preference?: string | null;
  ai_model_preference?: string | null;
  full_name?: string | null;
  email_notifications: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UserApiUsage = {
  id: string;
  user_id: string | null;
  api_calls_count: number | null;
  last_api_call: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UserSubscriptionHistory = {
  id: string;
  user_id: string | null;
  subscription_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Goal = {
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
  spaces: string[]; // Array of space IDs
  createdAt?: number;
};

export type Space = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  mentor_type: string;
  progress: number | null;
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
  created_at: string | null;
  updated_at: string | null;
  to_do_list?: string[];
  time_to_complete?: string;
  isCollapsed?: boolean;
  content?: string;
};

export type Document = {
  id: string;
  space_id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Task = {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

export type ChatMessage = {
  id: string;
  space_id: string | null;
  user_id: string | null;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface Module {
  id: string;
  space_id: string;
  title: string;
  content: string;
  description: string;
  order_index: number;
  is_completed: boolean;
  created_at: string | null;
  updated_at: string | null;
  user_id?: string | null;
}

export interface Podcast {
  id: string;
  space_id: string;
  title: string;
  audio_url: string;
  module_id?: string;
  created_at: string | null;
  updated_at: string | null;
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
        Insert: Omit<Goal, 'id' | 'progress' | 'created_at' | 'updated_at' | 'spaces' | 'createdAt'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'spaces' | 'createdAt'>>;
      };
      spaces: {
        Row: Space;
        Insert: Omit<Space, 'id' | 'progress' | 'created_at' | 'updated_at' | 'to_do_list' | 'time_to_complete' | 'isCollapsed' | 'content'>;
        Update: Partial<Omit<Space, 'id' | 'created_at' | 'updated_at' | 'to_do_list' | 'time_to_complete' | 'isCollapsed' | 'content'>>;
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
      podcasts: {
        Row: Podcast;
        Insert: Omit<Podcast, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Podcast, 'id' | 'created_at' | 'updated_at'>>;
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          description: string;
          content: string;
          author_name: string;
          author_avatar: string | null;
          published_at: string;
          category: string;
          tags: string[] | null;
        };
        Insert: Omit<{
          id: string;
          title: string;
          description: string;
          content: string;
          author_name: string;
          author_avatar: string | null;
          published_at: string;
          category: string;
          tags: string[] | null;
        }, 'id'>;
        Update: Partial<Omit<{
          id: string;
          title: string;
          description: string;
          content: string;
          author_name: string;
          author_avatar: string | null;
          published_at: string;
          category: string;
          tags: string[] | null;
        }, 'id'>>;
      };
    };
  };
}; 
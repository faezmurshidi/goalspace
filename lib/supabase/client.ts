import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type definitions based on our schema
export type User = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'lite' | 'pro';
  subscription_status: 'active' | 'past_due' | 'canceled';
  subscription_period_end?: Date;
  api_calls_count: number;
  mentor_interactions_count: number;
  faez_interactions_count: number;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'learning' | 'project' | 'personal' | 'professional';
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  progress: number;
  start_date: Date;
  due_date?: Date;
  completed_at?: Date;
  is_featured: boolean;
  priority: 'low' | 'medium' | 'high';
  analysis_data?: any;
};

export type Space = {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'learning' | 'goal';
  objectives: string[];
  prerequisites: string[];
  mentor: any;
  progress: number;
  status: 'active' | 'completed' | 'archived';
  time_estimate?: string;
  space_color?: any;
  content?: string;
  methodology?: string;
  is_collapsed: boolean;
};

export type Document = {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'tutorial' | 'guide' | 'reference' | 'exercise';
  tags: string[];
  is_generated: boolean;
  metadata?: any;
};

export type Task = {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  completed_at?: Date;
  order_index: number;
  dependencies: string[];
};

export type ChatMessage = {
  id: string;
  space_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  is_faez: boolean;
  metadata?: any;
}; 
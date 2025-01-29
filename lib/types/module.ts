export interface Module {
  id: string;
  space_id: string;
  title: string;
  content: string;
  description: string;
  order_index: number;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ModuleUpdate {
  title?: string;
  content?: string;
  description?: string;
  order_index?: number;
  is_completed?: boolean;
}

export interface ModuleCreate {
  space_id: string;
  title: string;
  content: string;
  description: string;
  order_index: number;
  is_completed?: boolean;
} 

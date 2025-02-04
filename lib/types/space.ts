export interface Mentor {
  name: string;
  expertise: string[];
  personality: string;
  introduction: string;
  system_prompt: string;
}

export interface SpaceColor {
  main: string;
  secondary: string;
  accent: string;
}

export interface Space {
  id: string;
  title: string;
  category: 'learning' | 'goal';
  description: string;
  objectives: string[];
  prerequisites: string[];
  to_do_list: string[];
  time_to_complete: string;
  mentor: Mentor;
  space_color?: SpaceColor;
  plan?: string;
  research?: string;
  progress?: number;
  isCollapsed?: boolean;
  content?: string;
} 
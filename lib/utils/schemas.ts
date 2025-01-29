import { z } from 'zod';
import type { SpaceColor } from '@/lib/store';

export const SpaceColorSchema = z.object({
  main: z.string(),
  secondary: z.string(),
  tertiary: z.string().optional(),
  accent: z.string(),
}).transform((data): SpaceColor => ({
  main: data.main,
  secondary: data.secondary,
  accent: data.accent
}));

export const MentorSchema = z.object({
  name: z.string(),
  expertise: z.array(z.string()),
  personality: z.string(),
  introduction: z.string(),
  system_prompt: z.string(),
});

export const SpaceSchema = z.object({
  spaces: z.array(z.object({
    id: z.string(),
    language: z.string(),
    category: z.enum(['learning', 'goal']),
    space_color: SpaceColorSchema,
    title: z.string(),
    title_short: z.string(),
    description: z.string(),
    space_methodology: z.string(),
    mentor: MentorSchema,
    objectives: z.array(z.string()),
    prerequisites: z.array(z.string()),
    time_to_complete: z.string(),
    to_do_list: z.array(z.string()),
    extras: z.array(z.string()).optional(),
  }))
});

export const QuestionSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    purpose: z.string()
  }))
}); 
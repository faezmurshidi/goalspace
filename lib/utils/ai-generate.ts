import { Space as StoreSpace } from '@/lib/store';
import { Space as DatabaseSpace } from '@/lib/types/database';
import { getPrompt } from './prompt-generator';

export type UseCase = 'plan' | 'research' | 'mindmap' | 'podcast';
export type Model = 'gpt' | 'claude' | 'perplexity';

export interface GenerateRequest {
  useCase: UseCase;
  model: Model;
  space: DatabaseSpace;
  prompt: string;
}

function convertStoreSpaceToDatabase(space: StoreSpace): DatabaseSpace {
  return {
    id: space.id,
    goal_id: '', // This will be filled by the database
    title: space.title,
    description: space.description,
    category: space.category === 'goal' ? 'achievement' : 'learning',
    mentor_type: space.mentor.personality,
    progress: space.progress || 0,
    space_color: space.space_color || null,
    order_index: 0, // This will be handled by the database
    objectives: space.objectives || [],
    prerequisites: space.prerequisites || [],
    mentor: {
      name: space.mentor.name,
      expertise: space.mentor.expertise,
      personality: space.mentor.personality,
      introduction: space.mentor.introduction,
      system_prompt: space.mentor.system_prompt
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function generateContent(useCase: UseCase, model: Model, space: StoreSpace): Promise<string> {
  const dbSpace = convertStoreSpaceToDatabase(space);
  const prompt = getPrompt(useCase, dbSpace);
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      useCase,
      model,
      space: dbSpace,
      prompt,
    } as GenerateRequest),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate ${useCase}`);
  }

  const data = await response.json();
  return data.content;
} 
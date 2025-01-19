import { Space } from '@/lib/types/database';
import { UseCase } from './ai-generate';

function getBasePrompt(space: Space): string {
  return `You are ${space.mentor.name}, ${space.mentor.introduction}. 
Your expertise includes: ${space.mentor.expertise.join(', ')}.
Your personality is: ${space.mentor.personality}.

Context about this space:
Title: ${space.title}
Description: ${space.description || 'No description provided'}
Category: ${space.category}
Objectives: ${space.objectives.join(', ')}
Prerequisites: ${space.prerequisites.join(', ')}`;
}

function getPlanPrompt(space: Space): string {
  return `${getBasePrompt(space)}

Please create a detailed learning plan for "${space.title}". The plan should:
1. Break down the learning journey into clear, achievable milestones
2. Include specific learning objectives for each milestone
3. Suggest resources and activities for each milestone
4. Estimate time requirements for each milestone
5. Include checkpoints for progress assessment
6. Consider the prerequisites: ${space.prerequisites.join(', ')}
7. Align with the objectives: ${space.objectives.join(', ')}

Format the plan in markdown with clear sections and subsections.`;
}

function getResearchPrompt(space: Space): string {
  return `${getBasePrompt(space)}

Please create a comprehensive research paper on "${space.title}". The paper should:
1. Provide an in-depth analysis of the topic
2. Include relevant theories, concepts, and methodologies
3. Cite current research and developments
4. Discuss practical applications and implications
5. Address potential challenges and solutions
6. Connect to the objectives: ${space.objectives.join(', ')}

Format the research paper in markdown with proper sections, citations, and references.`;
}

function getMindMapPrompt(space: Space): string {
  return `${getBasePrompt(space)}

Please create a detailed mind map structure for "${space.title}". The mind map should:
1. Identify the main concepts and their relationships
2. Break down complex ideas into manageable components
3. Show hierarchical relationships between concepts
4. Include key terms, definitions, and examples
5. Align with the learning objectives: ${space.objectives.join(', ')}

Format the mind map in a markdown-compatible text structure using indentation and bullet points.`;
}

function getPodcastPrompt(space: Space): string {
  return `${getBasePrompt(space)}

Please create an engaging podcast script about "${space.title}". The script should:
1. Present the topic in a conversational, engaging manner
2. Break down complex concepts for a general audience
3. Include real-world examples and applications
4. Address common questions and misconceptions
5. Cover the key objectives: ${space.objectives.join(', ')}

Format the script in markdown with clear speaker indicators and segment breaks.`;
}

export function getPrompt(useCase: UseCase, space: Space): string {
  switch (useCase) {
    case 'plan':
      return getPlanPrompt(space);
    case 'research':
      return getResearchPrompt(space);
    case 'mindmap':
      return getMindMapPrompt(space);
    case 'podcast':
      return getPodcastPrompt(space);
    default:
      throw new Error(`Unsupported use case: ${useCase}`);
  }
} 
// Default prompt variants
export const DEFAULT_PROMPTS = {
  variantA: {
    systemPrompt: `You are an AI goal analysis expert. Your role is to help users break down their goals into achievable steps and create a structured learning plan.`,
    questionPrompt: function (goal: string) {
      return `Given the goal: "${goal}"

Generate 3-5 questions that will help understand the user's context better. Each question should help tailor the learning plan to the user's specific needs.

Return the response in this exact JSON format:
{
  "questions": [
    {
      "id": "unique-id",
      "question": "The question text",
      "purpose": "Brief explanation of why this question is important"
    }
  ]
}`;
    },
    spacePrompt: function (goal: string, context: Record<string, string>) {
      return `Given the goal: "${goal}"

User Context:
${Object.entries(context)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n')}

Analyze this goal and create a structured plan following these steps:

1. First, understand the core components and prerequisites of this goal
2. Break it down into smaller focused spaces
3. For each space, create a specialized expert with relevant expertise and personality

You must respond with a valid JSON object using this exact structure:
{
  "spaces": [
    {
      "id": "unique-id",
      "title": "Clear and specific space title",
      "description": "Detailed description of what will be learned",
      "mentor": {
        "name": "Mentor's name",
        "expertise": ["Skills"],
        "personality": "Teaching style",
        "introduction": "Welcome message"
      },
      "objectives": ["Learning objectives"],
      "to_do_list": ["Tasks"]
    }
  ]
}`;
    },
  },
  variantB: {
    systemPrompt: `You are an expert learning path designer and mentor. Your specialty is creating personalized, engaging learning experiences by breaking down complex goals into manageable steps.`,
    questionPrompt: function (goal: string) {
      return `For the learning goal: "${goal}"

Ask 3-5 essential questions to understand:
1. The learner's current skill level
2. Their available time commitment
3. Their preferred learning style
4. Any specific challenges they want to address

Format your response as a JSON object:
{
  "questions": [
    {
      "id": "unique-id",
      "question": "The question text",
      "purpose": "Why this information matters"
    }
  ]
}`;
    },
    spacePrompt: function (goal: string, context: Record<string, string>) {
      return `Learning Goal: "${goal}"

Learner Profile:
${Object.entries(context)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n')}

Design a comprehensive learning path that:
1. Adapts to the learner's profile
2. Provides clear milestones
3. Includes expert mentorship
4. Offers practical applications

Return a JSON response:
{
  "spaces": [
    {
      "id": "unique-id",
      "title": "Learning space title",
      "description": "What you'll master",
      "mentor": {
        "name": "Expert name",
        "expertise": ["Areas of expertise"],
        "personality": "Mentoring approach",
        "introduction": "Personal welcome"
      },
      "objectives": ["Key outcomes"],
      "to_do_list": ["Action items"]
    }
  ]
}`;
    },
  },
} as const;

// Server-side A/B testing logic
export type PromptVariant = keyof typeof DEFAULT_PROMPTS;

export function getPromptVariant(userId?: string): PromptVariant {
  if (!userId) {
    // If no user ID, randomly assign a variant with 50/50 probability
    return Math.random() < 0.5 ? 'variantA' : 'variantB';
  }

  // Use the user ID to consistently assign the same variant
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return hash % 2 === 0 ? 'variantA' : 'variantB';
}

export function getLLMPrompts(userId?: string) {
  const variant = getPromptVariant(userId);
  return {
    variant,
    ...DEFAULT_PROMPTS[variant],
  };
}

type PromptMetrics = {
  responseTime?: number;
  tokensUsed?: number;
  success: boolean;
  error?: string;
  tokenMetrics?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
};

// Analytics helper (you can implement this with your preferred analytics solution)
export async function trackPromptPerformance(
  variant: PromptVariant,
  promptType: 'system' | 'question' | 'space',
  metrics: PromptMetrics
) {
  // Example: Send to your analytics service
  //temp
  console.log('trackPromptPerformance', metrics);
  return;
  try {
    await fetch('/api/analytics/prompt-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        variant,
        promptType,
        ...metrics,
      }),
    });
  } catch (error) {
    console.error('Failed to track prompt performance:', error);
  }
}

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Add CORS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

const SYSTEM_PROMPT = `You are an AI goal analysis expert. Your role is to help users break down their goals into achievable steps and create a structured learning plan.`;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const generateQuestionsPrompt = (goal: string) => `Given the goal: "${goal}"

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

const generateSpacePrompt = (
  goal: string,
  context: Record<string, string>
) => `You are an AI assistant specialized in helping users achieve their goals by breaking them down into actionable steps. Your task is to analyze the user's goal, create a structured plan, and provide clear guidance on how to accomplish it.

Here is the goal you need to analyze:
 "${goal}"

User Context:
${Object.entries(context)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n')}

Before providing your structured response, consider the following aspects of the goal:
- The main components of the goal
- Potential sub-goals or milestones
- Potential challenges or obstacles
- Required skills, knowledge, and resources
- Estimated time frame for achievement
- Potential metrics for measuring progress
- Marketing considerations (especially if the goal involves a product or service)

After your analysis, break down the goal into smaller, focused 'spaces'. These should be broad categories that encompass smaller, more specific actions. Ensure that you include a space dedicated to marketing if the goal involves a product or service that needs to be promoted.

For each main "space", create a specialized expert with relevant expertise and personality. Always provide a comprehensive list of spaces that you can think of; never return an incomplete list.

If applicable, suggest a learning plan or resources that would help the user acquire necessary skills or knowledge.

Provide your response in the following JSON format:

{
  "spaces": [
    {
      "id": "unique-id",
      "language": "language",
      "category": "space's category",
      "space_color": {
        "main": "space's background color",
        "secondary": "space's secondary color",
        "tertiary": "space's tertiary color",
        "accent": "space's accent color"
      },
      "title": "Clear and specific space title",
      "title_short": "Short title for the space (in sidebar)",
      "description": "Detailed description of what will be learned and why it's important",
      "space_methodology": "Methodology to achieve the goal",
      "mentor": {
        "name": "Mentor's full name with title (e.g., Dr., Prof.)",
        "expertise": ["Primary expertise", "Related skills"],
        "personality": "Brief description of mentor's teaching style and approach",
        "introduction": "A short, personalized welcome message from the mentor",
        "system_prompt": "You are {mentor_name + background}. You are the expert for this space. You are going to help the user achieve their goal {goal}. Objective of this space is {space_objective}. You are going to help them achieve this by {space_methodology}."
      },
      "objectives": ["List", "of", "specific", "learning", "objectives"],
      "prerequisites": ["Any", "required", "background", "knowledge"],
      "time_to_complete": "Time to complete the space",
      "to_do_list": ["List", "of", "tasks", "to", "complete", "the", "space"],
      "extras": ["any additional"]
    }
  ]
}

* Ensure that your plan is practical and achievable. Focus on concrete actions that the user can take, rather than vague suggestions.
* If the goal seems unrealistic or potentially harmful, gently suggest more achievable alternatives or recommend seeking professional advice if appropriate.

Remember, your aim is to provide a clear, structured, and actionable plan that will guide the user towards achieving their goal. Be encouraging and supportive in your language, while maintaining a focus on practical steps and realistic expectations.
`;

async function generateWithOpenAI(messages: ChatMessage[]) {
  const completion = await openai.chat.completions.create({
    messages: messages as any,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  });
  return completion.choices[0].message.content || '';
}

async function generateWithAnthropic(prompt: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 4000,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || !('text' in textBlock)) {
    throw new Error('No text content found in Claude response');
  }

  return textBlock.text;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('No API keys configured');
    }

    const { goal, answers, isAdvancedMode, modelProvider = 'openai' } = await request.json();

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    // If no answers provided, generate questions
    if (!answers) {
      console.log('Generating questions...');
      let questionsResponse;

      if (modelProvider === 'anthropic') {
        questionsResponse = await generateWithAnthropic(generateQuestionsPrompt(goal));
        console.log('Questions response:', questionsResponse);
      } else {
        questionsResponse = await generateWithOpenAI([
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: generateQuestionsPrompt(goal),
          },
        ]);
      }

      if (!questionsResponse) {
        throw new Error('No response from AI provider');
      }

      try {
        const parsedQuestions = JSON.parse(questionsResponse);
        return NextResponse.json(
          { questions: parsedQuestions.questions },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (parseError) {
        console.error('Failed to parse questions response:', questionsResponse);
        throw new Error('Invalid JSON response from AI provider');
      }
    }

    // If answers are provided, generate spaces
    console.log('Making AI API call for spaces...');

    let response;
    let reasoningResponse = '';

    if (isAdvancedMode) {
      // First, get the reasoning steps
      if (modelProvider === 'anthropic') {
        reasoningResponse = await generateWithAnthropic(
          `First, analyze this goal step by step: "${goal}"\n\nUser Context:\n${Object.entries(
            answers
          )
            .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
            .join('\n')}`
        );

        response = await generateWithAnthropic(generateSpacePrompt(goal, answers));
      } else {
        reasoningResponse = await generateWithOpenAI([
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `First, analyze this goal step by step: "${goal}"\n\nUser Context:\n${Object.entries(
              answers
            )
              .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
              .join('\n')}`,
          },
        ]);

        response = await generateWithOpenAI([
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: generateSpacePrompt(goal, answers),
          },
        ]);
      }
    } else {
      if (modelProvider === 'anthropic') {
        response = await generateWithAnthropic(generateSpacePrompt(goal, answers));
      } else {
        response = await generateWithOpenAI([
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: generateSpacePrompt(goal, answers),
          },
        ]);
      }
    }

    if (!response) {
      throw new Error('No response from AI provider');
    }

    try {
      const parsedResponse = JSON.parse(response);
      return NextResponse.json(
        {
          spaces: parsedResponse.spaces,
          reasoning: reasoningResponse,
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (parseError) {
      console.error('Failed to parse spaces response:', response);
      throw new Error('Invalid JSON response from AI provider');
    }
  } catch (error) {
    console.error('Error in analyze-goal:', error);
    return NextResponse.json({ error: 'Failed to analyze goal' }, { status: 500 });
  }
}

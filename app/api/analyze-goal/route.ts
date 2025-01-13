import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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

const generateSpacePrompt = (goal: string, context: Record<string, string>) => `Given the goal: "${goal}"

User Context:
${Object.entries(context).map(([question, answer]) => `Q: ${question}\nA: ${answer}`).join('\n')}

Analyze this goal and create a structured plan following these steps:

1. First, understand the core components and prerequisites of this goal
2. Break it down into smaller focused spaces
3. For each space, create a specialized expert with relevant expertise and personality

You must respond with a valid JSON object using this exact structure:
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
      "description": "Detailed description of what will be learned and why it's important",
      "space_methodology": "Methodology to achieve the goal",
      "mentor": {
        "name": "Mentor's full name with title (e.g., Dr., Prof.)",
        "expertise": ["Primary expertise", "Related skills"],
        "personality": "Brief description of mentor's teaching style and approach",
        "introduction": "A short, personalized welcome message from the mentor",
        "system_prompt": "You are {mentor_name + backround}. You are the expert for this space. You are going to help the user achieve their goal {goal}. Objective of this space is {space_objective}. You are going to help them achieve this by {space_methodology}."
      },
      "objectives": ["List", "of", "specific", "learning", "objectives"],
      "prerequisites": ["Any", "required", "background", "knowledge"],
      "time_to_complete": "Time to complete the space",
      "to_do_list": ["List", "of", "tasks", "to", "complete", "the", "space"]
    }
  ]
}`;

async function generateWithOpenAI(messages: ChatMessage[]) {
  const completion = await openai.chat.completions.create({
    messages: messages as any,
    model: "gpt-3.5-turbo",
    temperature: 0.7,
  });
  return completion.choices[0].message.content || '';
}

async function generateWithAnthropic(prompt: string) {
  const message = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4000,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find(block => block.type === 'text');
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
      return NextResponse.json(
        { error: 'Goal is required' },
        { status: 400 }
      );
    }

    // If no answers provided, generate questions
    if (!answers) {
      console.log('Generating questions...');
      let questionsResponse;

      if (modelProvider === 'anthropic') {
        questionsResponse = await generateWithAnthropic(generateQuestionsPrompt(goal));
      } else {
        questionsResponse = await generateWithOpenAI([
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: generateQuestionsPrompt(goal)
          }
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
            }
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
          `First, analyze this goal step by step: "${goal}"\n\nUser Context:\n${Object.entries(answers).map(([question, answer]) => `Q: ${question}\nA: ${answer}`).join('\n')}`
        );

        response = await generateWithAnthropic(generateSpacePrompt(goal, answers));
      } else {
        reasoningResponse = await generateWithOpenAI([
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `First, analyze this goal step by step: "${goal}"\n\nUser Context:\n${Object.entries(answers).map(([question, answer]) => `Q: ${question}\nA: ${answer}`).join('\n')}`
          }
        ]);

        response = await generateWithOpenAI([
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: generateSpacePrompt(goal, answers)
          }
        ]);
      }
    } else {
      if (modelProvider === 'anthropic') {
        response = await generateWithAnthropic(generateSpacePrompt(goal, answers));
      } else {
        response = await generateWithOpenAI([
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: generateSpacePrompt(goal, answers)
          }
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
          reasoning: reasoningResponse
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (parseError) {
      console.error('Failed to parse spaces response:', response);
      throw new Error('Invalid JSON response from AI provider');
    }
  } catch (error) {
    console.error('Error in analyze-goal:', error);
    return NextResponse.json(
      { error: 'Failed to analyze goal' },
      { status: 500 }
    );
  }
}

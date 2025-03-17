import { NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { anthropic } from "@ai-sdk/anthropic"
import { deepseek } from "@ai-sdk/deepseek"
import { SpaceSchema as AISpaceSchema, QuestionSchema as AIQuestionSchema } from '@/lib/utils/schemas';
import { shouldUseMockResponse } from '@/lib/utils';
import { mockResponseMap } from '@/lib/utils/mock-data';

const SYSTEM_PROMPT = `You are an AI goal analysis expert. Your role is to help users break down their goals into achievable steps and create a structured plan.`;

const generateQuestionsPrompt = (goal: string) => `Given the goal: "${goal}"

Generate 3-5 questions that will help understand the user's context better. Each question should help tailor the plan to the user's specific needs.

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
  context: Record<string, string>,
  reasoningResponse: string | undefined
) => `You are an AI assistant specialized in helping users achieve their goals by breaking them down into actionable steps. Your task is to analyze the user's goal, create a structured plan, and provide clear guidance on how to accomplish it.

Here is the goal you need to analyze:
 "${goal}"

User Context:
${Object.entries(context)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n')}

${reasoningResponse ? `\nHere is the reasoning:\n${reasoningResponse}` : ''}

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
}`;

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { goal, answers, isAdvancedMode, modelProvider = 'anthropic' } = requestData;

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    // Check if we should use mock responses
    if (shouldUseMockResponse()) {
      console.log('🔄 Using mock response for API call (skipApiCall flag enabled)');
      
      // If no answers provided, return mock questions
      if (!answers) {
        const mockResponse = mockResponseMap['/api/analyze-goal/route']();
        return NextResponse.json({ questions: mockResponse.questions }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        });
      }
      
      // If answers are provided, return mock spaces
      const mockResponse = mockResponseMap['/api/generate-spaces/route']();
      return NextResponse.json({
        spaces: mockResponse.spaces,
        reasoning: "Mock reasoning for testing purposes.",
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      });
    }

    // If no answers provided, generate questions
    if (!answers) {
      console.log('Generating questions...');
      const { object: questionsResponse } = await generateObject({
        model: anthropic('claude-3-sonnet-20240229'),
        schema: AIQuestionSchema,
        prompt: generateQuestionsPrompt(goal)
      });

      if (!questionsResponse) {
        throw new Error('No response from AI provider');
      }

      try {
        return NextResponse.json(
          { questions: questionsResponse.questions },
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

    let response: any = '';
    let reasoningResponse: string | undefined = undefined;

    if (isAdvancedMode) {
      // First, get the reasoning steps
      const { reasoning, text } = await generateText({
        model: deepseek('deepseek-reasoner'),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Analyze goal: "${goal ?? ''}"\nContext:\n${
              Object.entries(answers || {})
                .map(([q, a]) => `Q: ${q}\nA: ${a ?? ''}`)
                .join('\n')
            }`
          }
        ],
      });

      reasoningResponse = reasoning || '';
    } 

    const { object: spaceResponse } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: AISpaceSchema,
      prompt: generateSpacePrompt(goal, answers, reasoningResponse)
    });

    response = spaceResponse;

    if (!response) {
      throw new Error('No response from AI provider');
    }

    try {
      return NextResponse.json(
        {
          spaces: response.spaces,
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

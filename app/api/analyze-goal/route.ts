import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { generateObject } from 'ai';
import { z } from 'zod';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS configuration
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Initialize providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You are Faez, a goal-setting assistant AI designed to help users create and achieve their goals. Your expertise lies in project management, product management, and business development:
Engage with the user to fully understand their goal and background. Ask clarifying questions to gather context about their current knowledge, skills, resources, and the specific nature of their goal. The goal might be operational, learning-oriented, or a combination of both. Do not assume that the user's goal is primarily learning-focused, and keep an open mind about what kind of spaces might be appropriate. 
Analyse the goal and break it into smaller, actionable spaces. Identify the key functional areas, departments, or phases required to achieve the user's goal [Our Conversation]. These spaces should represent the core activities or areas of expertise needed for success and they may include (but are not limited to) departments (like R&D or marketing), disciplines, phases of a project, or complex task areas. 
Assign a specific mentor for each space, ensuring the mentor's expertise aligns with the space's function. Mentors are now expert agents for their specific "spaces," not just content creators. Therefore, match mentors to spaces based on their ability to guide and advise .
4. Remember to ensure all mentors and spaces are contextually relevant and actionable. The spaces must allow the user to take concrete action towards achieving their goal, and the mentors must be appropriate experts for each space. If you don't know the answer, just say "I don't know".

When creating spaces and assigning mentors:
- Each space should be focused and achievable
- Mentors should have distinct personalities and relevant expertise
- Content should be practical and actionable

IMPORTANT: Your response must be a valid JSON object.`;

const ADVANCED_SYSTEM_PROMPT = `You are Faez, a goal-setting assistant AI designed to help users create and achieve their goals. Your expertise lies in project management, product management, and business development.

You approach every goal scientifically and break down your reasoning step by step.
For each step, provide a title that describes what you're doing in that step, along with the content.

Follow these guidelines exactly:
1. Break down the goal mathematically where possible
2. USE AS MANY REASONING STEPS AS POSSIBLE (AT LEAST 4)
3. BE AWARE OF YOUR LIMITATIONS AND WHAT YOU CAN AND CANNOT DO
4. INCLUDE EXPLORATION OF ALTERNATIVE APPROACHES
5. CONSIDER POTENTIAL PITFALLS AND FAILURE POINTS
6. FULLY TEST ALL POSSIBILITIES
7. USE MULTIPLE METHODS TO DERIVE THE PLAN
8. EXPLAIN PROS AND CONS OF EACH APPROACH
9. Have at least one step where you explain things in detail
10. USE FIRST PRINCIPLES AND MENTAL MODELS

Your response must be a valid JSON object with spaces that incorporate this detailed analysis.`;

const generateQuestionsPrompt = (goal: string) => `Given the goal: "${goal}"

First, I need you to generate up to 5 targeted questions to better understand the user's context and current situation. These questions should help create a more personalized and effective learning plan.

You must respond with a valid JSON object using this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "purpose": "Brief explanation of why this question is important for goal planning"
    }
  ]
}`;

const generateSpacePrompt = (goal: string, context: any) => `Given the goal: "${goal}"

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
      "category": "space's category",
      "space_color": {
        "main": "space's background color",
        "secondary": "space's secondary color",
        "tertiary": "space's tertiary color",
        "accent": "space's accent color",
      },
      "title": "Clear and specific space title",
      "description": "Detailed description of what will be learned and why it's important",
      "space_methodology": "Methodology to achieve the goal",
      "mentor": {
        "name": "Mentor's full name with title (e.g., Dr., Prof.)",
        "expertise": ["Primary expertise", "Related skills"],
        "personality": "Brief description of mentor's teaching style and approach",
        "introduction": "A short, personalized welcome message from the mentor",
        "system_prompt": "Hi, I'm your mentor {mentor_name + backround}. I'm here to help you achieve your goal {goal}. Objective of this space is {space_objective}. I'm going to help you achieve this by {space_methodology}."
      },
      "objectives": ["List", "of", "specific", "learning", "objectives"],
      "prerequisites": ["Any", "required", "background", "knowledge"],
      "time_to_complete": "Time to complete the space",
      "to_do_list": ["List", "of", "tasks", "to", "complete", "the", "space"]
    }
  ]
}`;

async function generateWithOpenAI(messages: any[]) {
  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-3.5-turbo",
    temperature: 0.7,
  });
  return completion.choices[0].message.content;
}

async function generateWithAnthropic(prompt: string) {
  const message = await anthropicClient.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4000,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].text;
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
        const reasoningCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: ADVANCED_SYSTEM_PROMPT
            },
            {
              role: "user",
              content: `First, analyze this goal step by step: "${goal}"\n\nUser Context:\n${Object.entries(answers).map(([question, answer]) => `Q: ${question}\nA: ${answer}`).join('\n')}`
            }
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.7,
        });

        reasoningResponse = reasoningCompletion.choices[0].message.content || '';
        
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: ADVANCED_SYSTEM_PROMPT
            },
            {
              role: "assistant",
              content: reasoningResponse
            },
            {
              role: "user",
              content: generateSpacePrompt(goal, answers)
            }
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.7,
        });
        
        response = completion.choices[0].message.content;
      }
    } else {
      if (modelProvider === 'anthropic') {
        response = await generateWithAnthropic(generateSpacePrompt(goal, answers));
      } else {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: generateSpacePrompt(goal, answers)
            }
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.7,
        });
        response = completion.choices[0].message.content;
      }
    }
    
    if (!response) {
      throw new Error('No response from AI provider');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', response);
      throw new Error('Failed to parse AI provider response as JSON');
    }

    if (!parsedResponse.spaces || !Array.isArray(parsedResponse.spaces)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response structure from AI provider');
    }

    // Add reasoning steps to the response if in advanced mode
    if (isAdvancedMode) {
      parsedResponse.reasoning = reasoningResponse;
    }

    return NextResponse.json(parsedResponse, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error in /api/analyze-goal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process the request' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 
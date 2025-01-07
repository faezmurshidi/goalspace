import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Faez, a goal-setting assistant AI designed to help users create and achieve their goals. Your expertise lies in project management, product management, and business development:
1. Understanding and analyzing user goals comprehensively
2. Breaking down goals into specific, measurable, and achievable spaces
3. Assigning specialized AI mentors who are experts in their respective fields
4. Ensuring each space has clear objectives

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

Focus your questions on:
1. Current experience/knowledge level
2. Previous attempts or challenges
3. Available time and resources
4. Specific interests within the goal area
5. Practical application needs

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
3. For each space, create a specialized mentor with relevant expertise and personality

You must respond with a valid JSON object using this exact structure:
{
  "spaces": [
    {
      "id": "unique-id",
      "category": "learning or goal",
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

export async function POST(request: Request) {
  try {
    const { goal, answers, isAdvancedMode } = await request.json();

    // If no answers provided, generate questions
    if (!answers) {
      console.log('Generating questions...');
      const questionsCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: generateQuestionsPrompt(goal)
          }
        ],
        model: "gpt-4-turbo",
        temperature: 0.7,
      });

      const questionsResponse = questionsCompletion.choices[0].message.content;
      if (!questionsResponse) {
        throw new Error('No response from OpenAI for questions');
      }

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
    }

    // If answers are provided, generate spaces
    console.log('Making OpenAI API call for spaces...');
    
    let completion;
    let reasoningResponse = '';
    
    if (isAdvancedMode) {
      // First, get the reasoning steps
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
        model: "gpt-4-turbo",
        temperature: 0.7,
      });

      reasoningResponse = reasoningCompletion.choices[0].message.content || '';
      
      // Then, generate the spaces with the reasoning included
      completion = await openai.chat.completions.create({
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
        model: "gpt-4-turbo",
        temperature: 0.7,
      });
    } else {
      completion = await openai.chat.completions.create({
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
        model: "gpt-4-turbo",
        temperature: 0.7,
      });
    }

    console.log('OpenAI API call completed');
    const response = completion.choices[0].message.content;
    
    if (!response) {
      console.log('Error: No response from OpenAI');
      throw new Error('No response from OpenAI');
    }

    console.log('Parsing OpenAI response...');
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
      console.log('Response parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', response);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    if (!parsedResponse.spaces || !Array.isArray(parsedResponse.spaces)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response structure from OpenAI');
    }

    // Add reasoning steps to the response if in advanced mode
    if (isAdvancedMode) {
      parsedResponse.reasoning = reasoningResponse;
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in /api/analyze-goal:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
} 
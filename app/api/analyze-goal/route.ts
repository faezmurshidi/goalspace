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

IMPORTANT: Your response must be a valid JSON object containing a 'spaces' array.`;

const generateSpacePrompt = (goal: string) => `Given the goal: "${goal}"

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
      "to_do_list": ["List", "of", "tasks", "to", "complete", "the", "space"],
      
    }
  ]
}

Ensure each space:
- Has clear, measurable objectives
- Builds logically on prerequisites
- Has a mentor with relevant expertise
- Includes practical, actionable content

Remember: Your entire response must be a valid JSON object exactly matching this structure.`;

export async function POST(request: Request) {
  try {
    // Log request details
    console.log('Received POST request to /api/analyze-goal');
    
    const body = await request.json();
    const { goal } = body;

    console.log('Goal received:', goal);

    if (!goal) {
      console.log('Error: No goal provided');
      return NextResponse.json(
        { error: 'Goal is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      );
    }

    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: generateSpacePrompt(goal)
        }
      ],
      model: "gpt-4",
      temperature: 0.7,
    });

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

    return NextResponse.json(
      { spaces: parsedResponse.spaces },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (err: any) {
    console.error('Goal analysis error:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });

    return NextResponse.json(
      { error: 'Failed to analyze goal' },
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
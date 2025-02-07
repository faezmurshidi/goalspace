import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';


// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = (spaceDetails: any) => `You are an expert curriculum designer creating structured learning module outlines. Your task is to create a series of progressive learning modules for a learning space.

Follow these guidelines:
1. Create 4-5 modules that build upon each other
2. Each module should have:
   - A unique ID (e.g., "module-1", "intro", etc.)
   - A clear, concise title
   - A brief description of what the module will cover, including:
     * Key learning objectives
     * Main concepts to be covered
     * Skills to be developed
     * Expected outcomes
3. Content should match the space category: ${spaceDetails.category}
4. Target the prerequisites level: ${spaceDetails.prerequisites?.join(', ') || 'Beginner'}
5. Cover these objectives: ${spaceDetails.objectives.join(', ')}

Return a valid JSON array of modules with this structure:
{
  "modules": [
    {
      "id": "string",
      "title": "string",
      "content": "A concise description of what this module will cover and its objectives",
      "isCompleted": false
    }
  ]
}

Make sure:
1. Each module description clearly outlines what will be covered
2. Modules progress logically from basic to advanced concepts
3. Content scope is appropriate for 30-45 minute sessions
4. Topics are relevant to ${spaceDetails.category}
5. Descriptions are clear but brief (full content will be generated separately)`;

const generateModulesPrompt = (spaceDetails: any) => `Create a structured learning path outline for:
**Title:** ${spaceDetails.title}
**Category:** ${spaceDetails.category}
**Key Skills:** ${spaceDetails.objectives.join(', ')}
**Level:** ${spaceDetails.prerequisites?.join(', ') || 'Beginner'}

Generate 4-5 progressive module outlines that:
1. Start with fundamentals
2. Build complexity gradually
3. Cover all key skills
4. Show clear progression
5. Include brief descriptions of what each module will cover

Return as a valid JSON array following the specified structure.
Remember: These are outlines only - detailed content will be generated separately.`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    const { spaceDetails } = await request.json();

    if (!spaceDetails) {
      return NextResponse.json(
        { error: 'Space details are required' },
        { status: 400 }
      );
    }

    //test
    const sampleContent = '## Hello World';
    const sampleTitle = 'Hello World';
    const sampleId = '123';
    const sampleIsCompleted = false;

    const sampleModule = {
      id: sampleId,
      title: sampleTitle,
      content: sampleContent,
      isCompleted: sampleIsCompleted
    };

    const sampleModules = [sampleModule, sampleModule, sampleModule, sampleModule, sampleModule];

    // return NextResponse.json(
    //   { modules: sampleModules },
    //   {
    //     headers: {
    //       'Access-Control-Allow-Origin': '*',
    //       'Content-Type': 'application/json',
    //     },
    //   }
    // );

    // Generate modules using Anthropic
    const completion = await anthropicClient.messages.create({
      messages: [
        {
          role: "user",
          content: generateModulesPrompt(spaceDetails)
        }
      ],
      model: "claude-3-5-sonnet-20240620",
      temperature: 0.7,
      max_tokens: 4000,
      system: SYSTEM_PROMPT(spaceDetails)
    });

    console.log('completion', completion);

    // Get the first content block
    const contentBlock = completion.content[0];
    const contentResponse = typeof contentBlock === 'object' && 'text' in contentBlock 
      ? contentBlock.text 
      : '';
      
    if (!contentResponse) {
      throw new Error('No response from Anthropic for module generation');
    }

    // Clean up the response by removing all text before the first { and after the last }
    const cleanedResponse = contentResponse.replace(/^[^{]+/, '').replace(/[^}]+$/, '');

    // Parse the JSON response
    let parsedResponse: { modules: any[] };
    try {
      parsedResponse = JSON.parse(cleanedResponse);
      return NextResponse.json(
        { modules: parsedResponse.modules },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Failed to parse JSON response:', cleanedResponse);
      throw new Error('Invalid response format from AI');
    }


  } catch (error) {
    console.error('Error in /api/generate-modules:', error);
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
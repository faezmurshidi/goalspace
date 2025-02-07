import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = (spaceDetails: any, moduleInfo: any) => `You are an expert curriculum designer creating detailed learning content for a module. Your task is to create comprehensive, engaging content for a single module in a learning space.

Context:
- Space Title: ${spaceDetails.title}
- Category: ${spaceDetails.category}
- Level: ${spaceDetails.prerequisites?.join(', ') || 'Beginner'}
- Module Title: ${moduleInfo.title}
- Module Overview: ${moduleInfo.content}

Create detailed markdown content that includes:

1. Introduction
   - Brief overview
   - Why this module is important
   - What learners will achieve

2. Learning Objectives
   - Clear, measurable objectives
   - Skills to be developed
   - Real-world applications

3. Core Content
   - Detailed explanations
   - Step-by-step guides
   - Relevant examples
   - Code snippets or diagrams where appropriate
   - Best practices and common pitfalls

4. Practice Exercises
   - Hands-on activities
   - Mini-challenges
   - Self-assessment questions

5. Summary
   - Key takeaways
   - Next steps
   - Additional resources

Format the content using proper markdown with:
- Clear headings (##, ###)
- Code blocks (\`\`\`)
- Lists and bullet points
- Emphasis where needed
- Section breaks (---)

Make the content:
1. Engaging and conversational
2. Technically accurate
3. Practical and hands-on
4. Appropriate for a 30-45 minute session
5. Progressive, building on previous concepts`;

const generateContentPrompt = (spaceDetails: any, moduleInfo: any) => `Create detailed learning content for:
**Module:** ${moduleInfo.title}
**Overview:** ${moduleInfo.content}
**Context:** Part of ${spaceDetails.title} (${spaceDetails.category})
**Level:** ${spaceDetails.prerequisites?.join(', ') || 'Beginner'}

Generate comprehensive markdown content that:
1. Follows the structured format (Intro, Objectives, Content, Practice, Summary)
2. Includes practical examples and exercises
3. Uses proper markdown formatting
4. Is engaging and interactive
5. Can be completed in 30-45 minutes

The content should help learners achieve the module's objectives while maintaining engagement.`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    const { spaceDetails, moduleInfo,  } = await request.json();

    if (!spaceDetails || !moduleInfo) {
      return NextResponse.json(
        { error: 'Space details and module info are required' },
        { status: 400 }
      );
    }

    // const sampleContent = '## Hello World';

    // //test
    // return NextResponse.json(
    //   { content: sampleContent },
    //   {
    //     headers: {
    //       'Access-Control-Allow-Origin': '*',
    //       'Content-Type': 'application/json',
    //     }
    //   }
    // );

    // Generate detailed content using Anthropic
    const completion = await anthropicClient.messages.create({
      messages: [
        {
          role: "user",
          content: generateContentPrompt(spaceDetails, moduleInfo)
        }
      ],
      model: "claude-3-haiku-20240307",
      temperature: 0.7,
      max_tokens: 4000,
      system: SYSTEM_PROMPT(spaceDetails, moduleInfo)
    });

    // Get the first content block
    const contentBlock = completion.content[0];
    const contentResponse = typeof contentBlock === 'object' && 'text' in contentBlock 
      ? contentBlock.text 
      : '';
      
    if (!contentResponse) {
      throw new Error('No response from Anthropic for content generation');
    }

    // Format the markdown content
    const formattedContent = contentResponse
      .trim()
      .replace(/\n#{2,3}/g, '\n\n$&')
      .replace(/^([*-])/gm, '$1 ')
      .replace(/```(\w+)?\n/g, '\n```$1\n')
      .replace(/\n```/g, '\n```\n')
      .replace(/^>/gm, '> ')
      .replace(/^(\s*[-*])/gm, '\n$1');

    // Return the formatted content
    return NextResponse.json(
      { content: formattedContent },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error in /api/generate-module-content:', error);
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
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You are an expert content generator. Your task is to create comprehensive, well-structured content for learning spaces. 
Follow these guidelines:
1. Content should be detailed and informative
2. Use proper markdown formatting:
   - Use # for main title
   - Use ## for major sections
   - Use ### for subsections
   - Use proper line breaks between sections
   - Use - or * for bullet points with proper indentation
   - Use \`\`\` for code blocks
   - Use > for blockquotes
   - Use **bold** and *italic* for emphasis
3. Include code examples where relevant
4. Break down complex topics into digestible sections
5. Include practical examples and real-world applications
6. Add relevant links to documentation or resources

Format the content with clear section breaks and proper spacing. Each section should be separated by a blank line.`;

const generateContentPrompt = (spaceDetails: any) => `Generate comprehensive content for a learning space with the following details:

Title: ${spaceDetails.title}
Description: ${spaceDetails.description}
Category: ${spaceDetails.category}
Objectives: ${JSON.stringify(spaceDetails.objectives)}
Prerequisites: ${JSON.stringify(spaceDetails.prerequisites)}

The content should follow this structure:

# [Title]

Brief introduction paragraph about the topic.

## Overview

Detailed overview of the topic.

## Core Concepts

### [Concept 1]
Explanation of the first core concept.

### [Concept 2]
Explanation of the second core concept.

## Practical Examples

### Example 1
\`\`\`
[Code example if applicable]
\`\`\`

### Example 2
\`\`\`
[Code example if applicable]
\`\`\`

## Best Practices
- Best practice 1
- Best practice 2
- Best practice 3

## Common Pitfalls
> Important: Common mistakes to avoid

## Resources and Further Reading
- [Resource 1](link)
- [Resource 2](link)
- [Resource 3](link)

Please generate the content following this structure and proper markdown formatting.`;

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

    // Generate initial content using Anthropic
    const contentCompletion = await anthropicClient.messages.create({
      messages: [
        {
          role: "user",
          content: generateContentPrompt(spaceDetails)
        }
      ],
      model: "claude-3-sonnet-20240229",
      temperature: 0.7,
      max_tokens: 4000,
      system: SYSTEM_PROMPT
    });

    // Get the first content block
    const contentBlock = contentCompletion.content[0];
    const contentResponse = typeof contentBlock === 'object' && 'text' in contentBlock 
      ? contentBlock.text 
      : '';
      
    if (!contentResponse) {
      throw new Error('No response from Anthropic for content generation');
    }

    // Process and format the content
    const formattedContent = contentResponse
      .trim()
      // Ensure proper line breaks between sections
      .replace(/\n#{2,3}/g, '\n\n$&')
      // Add space after list markers
      .replace(/^([*-])/gm, '$1 ')
      // Ensure code blocks have proper spacing
      .replace(/```(\w+)?\n/g, '\n```$1\n')
      .replace(/\n```/g, '\n```\n')
      // Add space after blockquotes
      .replace(/^>/gm, '> ')
      // Ensure proper spacing for lists
      .replace(/^(\s*[-*])/gm, '\n$1');

    // Return the generated content
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
    console.error('Error in /api/generate-initial-content:', error);
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
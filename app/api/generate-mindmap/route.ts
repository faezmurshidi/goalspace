import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      spaceId,
      category,
      title,
      description,
      objectives,
      prerequisites,
      mentor,
      model,
    } = await req.json();

    const prompt = `Create a comprehensive mind map for the topic "${title}". 
The mind map should be formatted in Mermaid.js mindmap syntax.

Context:
- Category: ${category}
- Description: ${description}
- Objectives: ${objectives}
- Prerequisites: ${prerequisites}
- Mentor/Expert: ${mentor}

Requirements:
1. Use Mermaid.js mindmap syntax (e.g., "mindmap\\n  root((Main Topic))\\n    A[Subtopic]\\n      B[Detail]")
2. Create a hierarchical structure with main concepts and sub-concepts
3. Include key relationships and connections
4. Keep it clear and well-organized
5. Include practical examples and applications
6. Add relevant resources or references
7. Highlight important concepts with appropriate syntax

Example format:
\`\`\`mermaid
mindmap
  root((Main Topic))
    A[Key Concept 1]
      B[Subtopic]
        C[Detail]
      D[Subtopic]
    E[Key Concept 2]
      F[Subtopic]
\`\`\`

Please generate a mind map that helps understand ${title} in a structured and comprehensive way.`;

    let mindmapContent: string | undefined;

    if (model === 'gpt4') {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a mind map expert who creates clear, structured, and comprehensive mind maps using Mermaid.js syntax. Focus on creating hierarchical relationships that are easy to understand."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      mindmapContent = completion.choices[0].message.content || '';
    } else if (model === 'claude') {
      const message = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        system: "You are a mind map expert who creates clear, structured, and comprehensive mind maps using Mermaid.js syntax. Focus on creating hierarchical relationships that are easy to understand.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      if (message.content[0].type === 'text') {
        mindmapContent = message.content[0].text;
      } else {
        throw new Error('Unexpected response format from Claude');
      }
    } else {
      // Perplexity or other models can be added here
      throw new Error('Unsupported model');
    }

    if (!mindmapContent) {
      throw new Error('No content generated from AI model');
    }

    console.log('mindmapContent', mindmapContent);

    // Extract the Mermaid diagram from the response
    const mermaidMatch = mindmapContent.match(/\`\`\`mermaid\n([\s\S]*?)\n\`\`\`/);
    const mindmap = mermaidMatch ? mermaidMatch[1] : mindmapContent;

    // Add markdown wrapper for the mindmap
    const formattedContent = `# Mind Map: ${title}

This mind map provides a structured overview of ${title}, highlighting key concepts, relationships, and important details.

\`\`\`mermaid
${mindmap}
\`\`\`

## How to Use This Mind Map
- Start from the central topic and explore branches
- Each branch represents a key concept or theme
- Sub-branches provide more detailed information
- Use this map for quick reference and understanding
- Click on the mind map to expand/collapse branches

## Note
This mind map was generated using AI and may be refined or expanded based on specific needs.
`;

    return NextResponse.json({ mindmap: formattedContent });
  } catch (error) {
    console.error('Error generating mind map:', error);
    return NextResponse.json(
      { error: 'Failed to generate mind map' },
      { status: 500 }
    );
  }
} 
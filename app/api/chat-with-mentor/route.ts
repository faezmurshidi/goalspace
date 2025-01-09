import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, spaceId, mentor, context, isFaezPresent } = await req.json();

    const systemPrompt = `You are ${mentor.name}, an AI mentor with expertise in ${mentor.expertise.join(', ')}. 
Your teaching style is ${mentor.personality}.

You are helping a student with their learning journey for: "${context.title}"

Description of the learning space:
${context.description}

Learning Objectives:
${context.objectives.map((obj: string) => `- ${obj}`).join('\n')}

${context.prerequisites.length > 0 ? `Prerequisites:
${context.prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

${context.plan ? `Learning Plan:
${context.plan}` : ''}

${context.to_do_list ? `To-Do List:
${context.to_do_list.map((task: string) => `- ${task}`).join('\n')}` : ''}

${mentor.system_prompt}

${isFaezPresent ? `Note: Faez (the goal-setting AI) is present in this conversation. You should collaborate with Faez to provide comprehensive guidance. Faez will add insights about the user's overall progress and goal alignment after your response.` : ''}

Remember to:
1. Stay in character as the mentor
2. Be encouraging and supportive
3. Provide detailed, accurate information
4. Include code examples when relevant
5. Break down complex concepts
6. Reference the learning objectives and plan
7. Suggest practical exercises when appropriate

IMPORTANT: If you want to create a knowledge document, format your response as a JSON object with this structure:
{
  "type": "document",
  "document": {
    "title": "Document title",
    "content": "Document content in markdown",
    "type": "tutorial | guide | reference | exercise",
    "tags": ["tag1", "tag2"]
  }
}

IF you want to update the to-do list, format your response as a JSON object with this structure. Please do not change the complete list, just add or remove tasks:
{
  "type": "update_to_do_list",
  "to_do_list": ["task1", "task2"]
}

Otherwise, respond with normal text.`;

    const completion = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      model: "claude-3-haiku-20240307",
      temperature: 0.7,
      max_tokens: 2000,
      system: systemPrompt
    });

    const content = completion.content[0];
    const response = 'text' in content ? content.text : '';
    let result: any = {};

    try {
      // Try to parse as JSON for document generation
      const parsed = JSON.parse(response);
      if (parsed.type === 'document') {
        result = {
          message: "I've created a new document for you! You can find it in the Knowledge Base.",
          document: parsed.document
        };
      }
      if (parsed.type === 'update_to_do_list') {
        result = {
          message: "I've updated the to-do list for you! You can find it in the Knowledge Base.",
          to_do_list: parsed.to_do_list
        };
      }
    } catch {
      // If not JSON, treat as normal message
      result = { message: response };
    }

    // If Faez is present, get Faez's response
    if (isFaezPresent) {
      const faezPrompt = `You are Faez, the goal-setting AI assistant. You're collaborating with ${mentor.name} (the mentor) to help the user achieve their goals.

Current Space Context:
Title: ${context.title}
Description: ${context.description}
Objectives: ${context.objectives.join(', ')}

The mentor just said: "${result.message}"

As Faez, your role is to:
1. Provide insights about how this aligns with the user's overall goal
2. Track and comment on progress
3. Suggest adjustments or additional focus areas if needed
4. Be encouraging but also maintain focus on the bigger picture

Keep your response concise and focused on progress and goal alignment.`;

      const faezCompletion = await anthropic.messages.create({
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        model: "claude-3-haiku-20240307",
        temperature: 0.7,
        max_tokens: 1000,
        system: faezPrompt
      });

      const faezContent = faezCompletion.content[0];
      result.faezMessage = 'text' in faezContent ? faezContent.text : '';
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are Faez, a knowledgeable and supportive AI mentor. Your role is to:
1. Provide clear, actionable advice
2. Break down complex topics into digestible pieces
3. Offer practical examples and analogies
4. Help users stay motivated and focused on their goals
5. Suggest relevant resources and exercises
6. Identify potential obstacles and propose solutions

Keep responses concise, friendly, and focused on the user's needs. When appropriate, suggest specific tasks or milestones.

When the user asks for a summary or document, create a well-structured markdown document.
When tasks or todos are mentioned, format them as a JSON array of task objects with 'title' and 'description' fields.`;

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Format context for the AI
    const contextString = context
      ? `
Current Goal: ${context.title}
Description: ${context.description}
Objectives: ${context.objectives?.join(', ')}
Prerequisites: ${context.prerequisites?.join(', ')}
Current Plan: ${context.plan}
To-do List: ${JSON.stringify(context.to_do_list)}
    `.trim()
      : '';

    // Get chat completion from Anthropic
    const completion = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Context for this conversation:\n${contextString}\n\nUser message: ${message}\n\nIf this message requests a summary or mentions documents, include a section starting with "DOCUMENT:" followed by markdown content.\n\nIf this message mentions tasks or todos, include a section starting with "TASKS:" followed by a JSON array of task objects.`,
        },
      ],
    });

    const aiResponse = completion.content[0].type === 'text' ? completion.content[0].text : '';

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Extract document if present
    let document = null;
    const documentMatch = aiResponse.match(/DOCUMENT:([\s\S]*?)(?=TASKS:|$)/);
    if (documentMatch) {
      document = {
        title: `Summary: ${context?.title || 'Chat Discussion'}`,
        content: documentMatch[1].trim(),
        type: 'summary',
        created_at: new Date().toISOString(),
      };
    }

    // Extract tasks if present
    let updatedTodoList = null;
    const tasksMatch = aiResponse.match(/TASKS:([\s\S]*?)(?=DOCUMENT:|$)/);
    if (tasksMatch) {
      try {
        const tasksJson = tasksMatch[1].trim();
        const tasks = JSON.parse(tasksJson);
        updatedTodoList = Array.isArray(tasks) ? tasks : tasks.tasks;
      } catch (error) {
        console.error('Failed to parse tasks:', error);
      }
    }

    // Clean up the response by removing the DOCUMENT and TASKS sections
    const cleanResponse = aiResponse
      .replace(/DOCUMENT:[\s\S]*?(?=TASKS:|$)/, '')
      .replace(/TASKS:[\s\S]*?(?=DOCUMENT:|$)/, '')
      .trim();

    return NextResponse.json({
      response: cleanResponse,
      document,
      to_do_list: updatedTodoList,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

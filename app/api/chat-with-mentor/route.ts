import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from "@ai-sdk/anthropic";
import { cookies } from 'next/headers';
import { findSimilarDocuments } from '@/lib/vector';
import { getServerSupabase, getAuthenticatedUser, Document } from '@/lib/store';
import { Space } from '@/lib/types/space';

const MENTOR_PROMPT = `You are a helpful AI mentor. Your goal is to provide clear, concise, and informative answers.
The user will ask questions in a structured format with their chosen response.
Acknowledge their specific response choice and provide a detailed answer that's relevant to their selection.
Use markdown formatting for better readability.
Keep responses focused and actionable.`;

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { messages, space }: { messages: any[], space: Space } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      return new Response(JSON.stringify({ error: 'No message content provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!space || !space.mentor) {
      return new Response(JSON.stringify({ error: 'Invalid space data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find relevant documents using RAG
    let relevantDocs: Document[] = [];
    try {
      relevantDocs = await findSimilarDocuments(lastMessage.content);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      // Continue without relevant docs if there's an error
    }

    // Build the system prompt
    const systemPrompt = `You are ${space.mentor.name}, an AI mentor with expertise in ${space.mentor.expertise.join(', ')}.
Your teaching style is ${space.mentor.personality}.

You are helping a student with their learning journey for: "${space.title}"

Description of the learning space:
${space.description}

Learning Objectives:
${space.objectives.map((obj: string) => `- ${obj}`).join('\n')}

${space.prerequisites?.length > 0 ? `Prerequisites:
${space.prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

${relevantDocs.length > 0 ? `Relevant knowledge base entries:
${relevantDocs.map((doc: any) => `
Title: ${doc.title}
Content: ${doc.content}
---`).join('\n')}` : ''}

${space.mentor.system_prompt}

Remember to:
1. Stay in character as the mentor
2. Be encouraging and supportive
3. Provide detailed, accurate information
4. Include code examples when relevant
5. Break down complex concepts
6. Reference the learning objectives
7. Suggest practical exercises when appropriate
8. Use the knowledge base information when relevant

If you want to create a document or tasks, use this format:
{
  "type": "document" | "tasks",
  "content": {
    // For document:
    "title": "string",
    "content": "string",
    "type": "tutorial" | "guide" | "reference" | "exercise",
    "tags": string[]
    // For tasks:
    "tasks": Array<{ title: string, description: string }>
  }
}`;

    // Create a streaming response using streamText
    const result = await streamText({
      model: anthropic('claude-3-sonnet-20240229'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Return the streaming response
    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error('Error in chat:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

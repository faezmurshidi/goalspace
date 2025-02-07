import { NextResponse } from 'next/server';
import { appendResponseMessages, streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { findSimilarDocuments } from '@/lib/vector';
import { useSpaceStore } from '@/lib/store';



const MENTOR_PROMPT = `You are a helpful AI mentor. Your goal is to provide clear, concise, and informative answers.
The user will ask questions in a structured format with their chosen response.
Acknowledge their specific response choice and provide a detailed answer that's relevant to their selection.
Use markdown formatting for better readability.
Keep responses focused and actionable.`;

const FAEZ_PROMPT = `You are Faez, a goal-setting and learning expert. Your role is to:
1. Analyze the user's progress and provide strategic insights
2. Help identify potential roadblocks and suggest solutions
3. Ensure the learning path aligns with the original goal
4. Collaborate with the mentor to provide comprehensive guidance

Your responses should be:
- Strategic and focused on the bigger picture
- Encouraging but realistic
- Backed by learning science and goal-setting principles
- Written in a friendly, supportive tone

Use markdown formatting for better readability.`;


export async function POST(req: Request) {
  try {
    const { messages, spaceId, isFaez, session } = await req.json();
    

    const { addMessage } = useSpaceStore.getState();


    console.log("session", session);

    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      system: isFaez ? FAEZ_PROMPT : MENTOR_PROMPT,
      tools: {
        getInformation: tool({
          description: `get information from your knowledge base to answer questions.`,
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => findSimilarDocuments(question),
        }),
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { message, spaceId, isFaez } = await req.json();

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: isFaez ? FAEZ_PROMPT : MENTOR_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 
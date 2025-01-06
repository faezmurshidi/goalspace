import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, spaceId, mentor, context } = await req.json();

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

${mentor.system_prompt}

Remember to:
1. Stay in character as the mentor
2. Be encouraging and supportive
3. Provide detailed, accurate information
4. Use markdown formatting for better readability
5. Include code examples when relevant
6. Break down complex concepts
7. Reference the learning objectives and plan
8. Suggest practical exercises when appropriate`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      max_tokens: 2000,
    });

    return NextResponse.json({ 
      message: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 
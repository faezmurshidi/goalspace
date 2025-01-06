import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { spaceId, category, title, description, objectives, prerequisites, mentor } = await req.json();

    const prompt = `As ${mentor.name}, an AI mentor with expertise in ${mentor.expertise.join(', ')}, create a detailed learning plan for:

Title: ${title}
Category: ${category}
Description: ${description}

Learning Objectives:
${objectives.map((obj: string) => `- ${obj}`).join('\n')}

${prerequisites.length > 0 ? `Prerequisites:
${prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

Please create a comprehensive markdown-formatted learning plan that includes:

1. Introduction
2. Detailed breakdown of topics to be covered
3. Step-by-step learning path
4. Recommended resources and materials
5. Practice exercises and projects
6. Assessment methods
7. Tips for success
8. Timeline and milestones

Use your teaching style (${mentor.personality}) to make the plan engaging and effective.
Format the response in Markdown with appropriate headers, lists, code blocks, and emphasis.`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: mentor.system_prompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      max_tokens: 4000,
    });

    const plan = completion.choices[0].message.content;

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error generating plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { spaceId, category, title, description, objectives, prerequisites, mentor, model = 'gpt' } = await req.json();

    const prompt = `As ${mentor.name}, an AI mentor with expertise in ${mentor.expertise.join(', ')}, create a detailed plan for:

Title: ${title}
Category: ${category}
Description: ${description}

Objectives:
${objectives.map((obj: string) => `- ${obj}`).join('\n')}

${prerequisites.length > 0 ? `Prerequisites:
${prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

Please create a comprehensive markdown-formatted plan that includes:

1. Introduction
2. Detailed breakdown of topics to be covered
3. Topics and content (with sections)
4. Recommended resources and materials
5. Practice exercises and projects
6. Assessment methods
7. Tips for success
8. Timeline and milestones

Use your teaching style (${mentor.personality}) to make the plan engaging and effective.
Format the response in Markdown with appropriate headers, lists, code blocks, and emphasis.`;

    if (model === 'gpt') {
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
    } else {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "pplx-7b-chat",
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
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Perplexity API error:', errorData);
        throw new Error('Failed to generate plan');
      }

      const data = await response.json();
      const plan = data.choices[0].message.content;
      return NextResponse.json({ plan });
    }
  } catch (error) {
    console.error('Error generating plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
} 
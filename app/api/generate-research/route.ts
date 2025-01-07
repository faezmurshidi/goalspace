import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { spaceId, category, title, description, objectives, prerequisites, mentor, model = 'gpt' } = await req.json();

    const prompt = `As ${mentor.name}, an AI mentor with expertise in ${mentor.expertise.join(', ')}, create a detailed research paper for:

Title: ${title}
Category: ${category}
Description: ${description}

Research Objectives:
${objectives.map((obj: string) => `- ${obj}`).join('\n')}

${prerequisites.length > 0 ? `Background Knowledge Required:
${prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

Please create a comprehensive research paper in markdown format that includes:

1. Abstract
2. Introduction
   - Background
   - Problem Statement
   - Research Questions
3. Literature Review
4. Methodology
5. Expected Results
6. Discussion
7. Conclusion
8. References

Use academic writing style while maintaining your teaching personality (${mentor.personality}).
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

      const research = completion.choices[0].message.content;
      return NextResponse.json({ research });
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
        throw new Error('Failed to generate research');
      }

      const data = await response.json();
      const research = data.choices[0].message.content;
      return NextResponse.json({ research });
    }
  } catch (error) {
    console.error('Error generating research:', error);
    return NextResponse.json(
      { error: 'Failed to generate research' },
      { status: 500 }
    );
  }
} 
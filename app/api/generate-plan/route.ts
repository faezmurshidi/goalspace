import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

Please create a comprehensive learning plan following this markdown format example:

"Learning Plan: Advanced Machine Learning Concepts

An in-depth exploration of advanced machine learning concepts, focusing on practical implementation and theoretical understanding. This comprehensive plan is designed to guide you through complex ML topics with hands-on exercises and real-world applications.

## Course Overview

This learning path covers advanced machine learning concepts, from theoretical foundations to practical implementations. We'll focus on building a strong understanding while gaining hands-on experience.

## Detailed Topics

### 1. Foundation Review
- Mathematical prerequisites
- Basic ML concepts refresh
- Python programming essentials

### 2. Advanced Concepts
- Deep Learning architectures
- Reinforcement Learning
- Natural Language Processing"

Please include the following sections:

1. Introduction and Overview
2. Detailed Topics Breakdown
3. Learning Resources
4. Practice Projects
5. Assessment Methods
6. Success Metrics
7. Timeline
8. Additional Resources

Use your teaching style (${mentor.personality}) to make the plan engaging and effective.
Remember to use proper markdown formatting with clear headers, lists, and sections.`;

    let plan;

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

      plan = completion.choices[0].message.content;
    } else if (model === 'claude') {
      const message = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        system: mentor.system_prompt,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
      });

      const textBlock = message.content.find(block => block.type === 'text');
      plan = textBlock?.text || 'Failed to generate plan with Claude';
    } else if (model === 'perplexity') {
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
      plan = data.choices[0].message.content;
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error in generate-plan:', error);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
  }
} 
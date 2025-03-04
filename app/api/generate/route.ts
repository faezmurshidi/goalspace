import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Define our own request type to avoid conflicts
interface ApiRequest {
  useCase: string;
  model: 'gpt' | 'claude' | 'perplexity';
  space: {
    id: string;
    title: string;
    description: string | null;
    category: 'learning' | 'achievement';
    mentor: {
      name: string;
      expertise: string[];
      personality: string;
      introduction: string;
      system_prompt: string;
    };
  };
  prompt: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateWithOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  return content;
}

async function generateWithAnthropic(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  if (response.content[0].type !== 'text') {
    throw new Error('Expected text content from Claude');
  }

  return response.content[0].text;
}

async function generateWithPerplexity(prompt: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate with Perplexity');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  return content;
}

export async function POST(request: Request) {
  try {
    const { useCase, model, prompt } = (await request.json()) as ApiRequest;
    
    // Check for missing environment variables based on model
    if (model === 'gpt' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    if (model === 'claude' && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }
    
    if (model === 'perplexity' && !process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API key is not configured' },
        { status: 500 }
      );
    }

    // Generate content
    let content: string;
    switch (model) {
      case 'gpt':
        content = await generateWithOpenAI(prompt);
        break;
      case 'claude':
        content = await generateWithAnthropic(prompt);
        break;
      case 'perplexity':
        content = await generateWithPerplexity(prompt);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported model: ${model}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error generating content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
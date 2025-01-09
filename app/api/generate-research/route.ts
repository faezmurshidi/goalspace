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

    const prompt = `As ${mentor.name}, an AI mentor with expertise in ${mentor.expertise.join(', ')}, create a detailed research paper for:

Title: ${title}
Category: ${category}
Description: ${description}

Research Objectives:
${objectives.map((obj: string) => `- ${obj}`).join('\n')}

${prerequisites.length > 0 ? `Background Knowledge Required:
${prerequisites.map((pre: string) => `- ${pre}`).join('\n')}` : ''}

Please create a comprehensive research paper following this markdown format example:

"AI-Powered Knowledge Base Architecture Design

A comprehensive analysis of modern approaches to building AI-powered knowledge bases, focusing on system architecture, integration patterns, and performance optimization strategies.

## Abstract

This research paper explores the architectural considerations and implementation strategies for building AI-powered knowledge bases. We analyze various approaches to data storage, retrieval mechanisms, and AI model integration while considering scalability and maintainability.

## Introduction

### Background
Knowledge management systems have evolved significantly with the advent of artificial intelligence. Traditional approaches to information storage and retrieval are being transformed by AI capabilities.

### Problem Statement
Organizations face challenges in effectively managing and utilizing their growing knowledge bases. This research addresses the key architectural decisions in building AI-powered solutions.

### Research Questions
- How can AI models be effectively integrated into knowledge base architectures?
- What are the optimal approaches for real-time knowledge retrieval and updates?
- How can we ensure scalability while maintaining system performance?"

Please include the following sections:

1. Abstract
2. Introduction
   - Background
   - Problem Statement
   - Research Questions
3. Literature Review
4. Methodology
5. Results Analysis
6. Discussion
7. Conclusion
8. References

Use academic writing style while maintaining your teaching personality (${mentor.personality}).
Remember to use proper markdown formatting with clear headers, lists, and sections.`;

    let research;

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

      research = completion.choices[0].message.content;
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

      // Claude 3 returns an array of content blocks, find the text block
      const textBlock = message.content.find(block => block.type === 'text');
      research = textBlock?.text || 'Failed to generate research with Claude';
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
        throw new Error('Failed to generate research');
      }

      const data = await response.json();
      research = data.choices[0].message.content;
    }

    return NextResponse.json({ research });
  } catch (error) {
    console.error('Error in generate-research:', error);
    return NextResponse.json({ error: 'Failed to generate research' }, { status: 500 });
  }
} 
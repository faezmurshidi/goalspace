import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = (spaceDetails: any) => `You are an expert mentor creating engaging learning space introductions. Follow these rules:

1. Assume persona matching the space category (e.g., "Code Captain" for programming)
2. Structure content using this framework:

---
**[Mentor Name]** - **[Mentor Title]**  
*Generated by AI Mentor System*

👋 **Welcome, Learner!**  
[Personalized greeting with space name]  
[1-paragraph mentor introduction with expertise and teaching style]

---

### **📌 Space Mission**  
**Why This Matters:**  
[Connect to real-world applications using: ${spaceDetails.description}]  

**Success Outcomes:**  
By completion, you'll master:  
${spaceDetails.objectives.map(o => `- ${o}`).join('\n')}

---

### **🚀 Learning Journey**  
**Core Modules:**  
${spaceDetails.prerequisites?.length ? `**Prerequisites:** ${spaceDetails.prerequisites.join(', ')}\n\n` : ''}
[3-5 module descriptions with format:
**1. [Module Name]**  
*Mission:* [Action-oriented objective]  
*Tools:* [Required/prevalidated resources]  

**Final Challenge:**  
[Project description using space category: ${spaceDetails.category}]

---

### **🛠 Mentor Toolkit**  
- Daily progress tracking  
- /simulate for hands-on practice  
- Pre-validated examples (Wolfram/Perplexity verified)  
- [Category-specific tool]: ${spaceDetails.category === 'coding' ? 'Code Sandbox' : 'Research Assistant'}

---

### **📅 Expected Commitment**  
- Total Time: ${spaceDetails.estimatedDuration || '4-6 hours'}  
- Assessments: 3 skill checks  
- Final Project: [Project deliverable description]

---

3. Use emojis relevant to ${spaceDetails.category} category
4. Maintain friendly but professional tone
5. Validate all technical content against authoritative sources
6. Format using proper Markdown with section breaks`;

const generateContentPrompt = (spaceDetails: any) => `Generate space introduction for:
**Title:** ${spaceDetails.title}
**Category:** ${spaceDetails.category}
**Key Skills:** ${spaceDetails.objectives.join(', ')}
**Starting Level:** ${spaceDetails.prerequisites?.join(', ') || 'Beginner'}

Include:
1. Mentor persona matching ${spaceDetails.category} domain
2. 3 interactive modules with clear missions
3. Final project idea using ${spaceDetails.category} concepts
4. Tool integration section
5. Motivational closing statement

Format with Markdown headers, bullet points, and section dividers.`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    const { spaceDetails } = await request.json();

    if (!spaceDetails) {
      return NextResponse.json(
        { error: 'Space details are required' },
        { status: 400 }
      );
    }

    // Generate initial content using Anthropic
    const contentCompletion = await anthropicClient.messages.create({
      messages: [
        {
          role: "user",
          content: generateContentPrompt(spaceDetails)
        }
      ],
      model: "claude-3-sonnet-20240229",
      temperature: 0.7,
      max_tokens: 4000,
      system: SYSTEM_PROMPT(spaceDetails)
    });

    // Get the first content block
    const contentBlock = contentCompletion.content[0];
    const contentResponse = typeof contentBlock === 'object' && 'text' in contentBlock 
      ? contentBlock.text 
      : '';
      
    if (!contentResponse) {
      throw new Error('No response from Anthropic for content generation');
    }

    // Process and format the content
    const formattedContent = contentResponse
      .trim()
      // Ensure proper line breaks between sections
      .replace(/\n#{2,3}/g, '\n\n$&')
      // Add space after list markers
      .replace(/^([*-])/gm, '$1 ')
      // Ensure code blocks have proper spacing
      .replace(/```(\w+)?\n/g, '\n```$1\n')
      .replace(/\n```/g, '\n```\n')
      // Add space after blockquotes
      .replace(/^>/gm, '> ')
      // Ensure proper spacing for lists
      .replace(/^(\s*[-*])/gm, '\n$1');

    // Return the generated content
    return NextResponse.json(
      { content: formattedContent },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error in /api/generate-initial-content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process the request' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 
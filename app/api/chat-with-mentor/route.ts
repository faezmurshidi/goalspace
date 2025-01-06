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
4. Include code examples when relevant
5. Break down complex concepts
6. Reference the learning objectives and plan
7. Suggest practical exercises when appropriate

IMPORTANT: If you want to create a knowledge document, format your response as a JSON object with this structure:
{
  "type": "document",
  "document": {
    "title": "Document title",
    "content": "Document content in markdown",
    "type": "tutorial | guide | reference | exercise",
    "tags": ["tag1", "tag2"]
  }
}

Otherwise, respond with normal text.`;

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
      model: "gpt-4-turbo",
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "text" }
    });

    const response = completion.choices[0].message.content;
    let result;

    try {
      // Try to parse as JSON for document generation
      const parsed = JSON.parse(response);
      if (parsed.type === 'document') {
        result = {
          message: "I've created a new document for you! You can find it in the Knowledge Base.",
          document: parsed.document
        };
      }
    } catch {
      // If not JSON, treat as normal message
      result = { message: response };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 
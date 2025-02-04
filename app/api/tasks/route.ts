import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { moduleDoc } = await request.json();

    // Generate tasks from module content
    const prompt = `Given this module content, create a max 5 list of actionable tasks. Each task should be specific, achievable, and help reinforce the objectives.

Content:
${moduleDoc.content}

Please format your response as a JSON array of objects, where each object has a 'title' and 'description' property. The title should be concise (under 10 words) and the description should be detailed but actionable. Example format:

{
  "tasks": [
    {
      "title": "Task title here",
      "description": "Detailed description of what needs to be done"
    }
  ]
}

Make sure to return ONLY the JSON object, with no additional text or explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      temperature: 0.7,
      system: "You are a task creation assistant that helps break down learning content into actionable tasks. Always respond with valid JSON containing an array of tasks under the 'tasks' key.",
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
    });

    let tasks = [];
    
    try {
      // Parse the response from Claude's content
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsedResponse = JSON.parse(responseText || '{"tasks": []}');
      tasks = parsedResponse.tasks || [];
    } catch (error) {
      console.error('Error parsing tasks JSON:', error);
      return NextResponse.json(
        { error: 'Failed to parse generated tasks' },
        { status: 500 }
      );
    }

    // Create supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Insert tasks into database
    const { data: insertedTasks, error: insertError } = await supabase
      .from('tasks')
      .insert(
        tasks.map((task: any) => ({
          space_id: moduleDoc.space_id,
          title: task.title,
          description: task.description,
          status: 'pending'
        }))
      )
      .select();

    if (insertError) {
      console.error('Error inserting tasks:', insertError);
      return NextResponse.json(
        { error: 'Failed to save tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: insertedTasks });
  } catch (error) {
    console.error('Error in generate-tasks:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    );
  }
} 
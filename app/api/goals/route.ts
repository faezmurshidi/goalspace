import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize regular Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { goal, userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Insert goal using regular client
    const { data: goalData, error: goalInsertError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: goal.title || 'Test Goal',
        description: goal.description || 'This is a test goal',
        category: goal.category || 'learning',
        status: 'active',
        progress: 0,
      })
      .select()
      .single();

    if (goalInsertError) {
      console.error('Goal insert error:', goalInsertError);
      return NextResponse.json(
        { error: goalInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, goal: goalData });
  } catch (error) {
    console.error('Error in goal creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
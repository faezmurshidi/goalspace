import { NextResponse } from 'next/server';
import { withAuth, parseRequestBody } from '@/utils/supabase/middleware';
import { User } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

// Use the withAuth middleware to protect this route and get authenticated user
export const POST = withAuth(async (request: Request, user: User, supabase: SupabaseClient) => {
  try {
    const body = await parseRequestBody(request);
    
    if (!body || !body.goal) {
      return NextResponse.json(
        { error: 'Goal data is required' },
        { status: 400 }
      );
    }
    
    const { goal } = body;
    
    // Use the authenticated user's ID directly from the session
    const userId = user.id;
    
    // Insert goal using the provided authenticated supabase client
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
});
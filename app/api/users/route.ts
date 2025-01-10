import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize regular Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { user } = await request.json();
    
    if (!user?.id || !user?.email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Insert user using regular client
    const { error: userInsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        created_at: new Date().toISOString(),
      }, { 
        onConflict: 'id'
      });

    if (userInsertError) {
      console.error('User insert error:', userInsertError);
      return NextResponse.json(
        { error: userInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in user creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
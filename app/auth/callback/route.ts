import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import type { Database } from '../../../types/supabase';

// Import helper for analytics
import { trackEvent } from '@/utils/server-analytics';
// Note: We can't use the client-side analytics directly in a Server Component

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    // Redirect to auth page if no code
    return NextResponse.redirect(`${requestUrl.origin}/auth`);
  }

  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=server_configuration`);
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting error
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            // Handle cookie deletion error
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );

  try {
    // Exchange the code for a session
    const { data, error: verifyError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (verifyError) throw verifyError;
    if (!data.user) throw new Error('No user returned from verification');

    // Check if user already exists in the database
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    // Only create user record if it doesn't exist
    if (!existingUser) {
      // Track new user registration
      trackEvent('user_registered', {
        provider: data.user.app_metadata?.provider || 'unknown',
        is_new_user: true,
        timestamp: new Date().toISOString()
      });
      
      // Create user record after verification
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email || '',
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Error creating user record:', dbError);
        // Continue anyway - the auth record exists
      }

      // Create user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: data.user.id,
          api_calls_count: 0,
          theme: 'dark',
        });

      if (settingsError) {
        console.error('Error creating user settings:', settingsError);
        // Continue anyway - the auth and user records exist
      }
    } else {
      // Track returning user login
      trackEvent('user_logged_in', {
        provider: data.user.app_metadata?.provider || 'unknown',
        is_new_user: false,
        timestamp: new Date().toISOString()
      });
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  } catch (error) {
    console.error('Error in verification callback:', error);
    
    // Track authentication error
    trackEvent('auth_error', {
      error_type: 'verification_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Redirect to auth page with error
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=verification_failed`);
  }
}

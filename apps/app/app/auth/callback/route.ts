import { NextResponse } from 'next/server';

// Import helper for analytics
import { trackEvent } from '@/utils/server-analytics';
import { createClient } from '@/utils/supabase/server';

// Note: We can't use the client-side analytics directly in a Server Component

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    // No code to exchange — send the user back to the root; middleware
    // resolves the correct locale from there.
    return NextResponse.redirect(`${requestUrl.origin}/`);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('Missing Supabase environment variables:', error);
    return NextResponse.redirect(`${requestUrl.origin}/?error=server_configuration`);
  }

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
        timestamp: new Date().toISOString(),
      });

      // Create user record after verification
      const { error: dbError } = await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email || '',
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('Error creating user record:', dbError);
        // Continue anyway - the auth record exists
      }

      // Create user settings
      const { error: settingsError } = await supabase.from('user_settings').insert({
        user_id: data.user.id,
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
        timestamp: new Date().toISOString(),
      });
    }

    // Redirect to the root on success; middleware resolves the correct locale.
    return NextResponse.redirect(`${requestUrl.origin}/`);
  } catch (error) {
    console.error('Error in verification callback:', error);

    // Track authentication error
    trackEvent('auth_error', {
      error_type: 'verification_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    // Redirect to the root with an error flag
    return NextResponse.redirect(`${requestUrl.origin}/?error=verification_failed`);
  }
}

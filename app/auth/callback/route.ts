import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CookieOptions } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              cookieStore.delete(name);
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
      const { data: { user }, error: verifyError } = await supabase.auth.exchangeCodeForSession(code);

      if (verifyError) throw verifyError;
      if (!user) throw new Error('No user returned from verification');

      // Create user record after verification
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // Create user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          api_calls_count: 0,
          theme: 'dark',
        });

      if (settingsError) throw settingsError;

      // Redirect to dashboard on success
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    } catch (error) {
      console.error('Error in verification callback:', error);
      // Redirect to auth page with error
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=verification_failed`);
    }
  }

  // Redirect to auth page if no code
  return NextResponse.redirect(`${requestUrl.origin}/auth`);
}

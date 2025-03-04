import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from './server';

/**
 * Middleware to handle authentication for API routes
 * @param handler The route handler function
 * @returns A new handler function with authentication
 */
export function withAuth(handler: Function) {
  return async (request: Request) => {
    try {
      // Create server-side Supabase client with cookies
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      // Verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Call the original handler with authenticated user and supabase client
      return handler(request, user, supabase);
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility function to safely parse JSON request body with error handling
 * @param request The request object
 * @returns Parsed request body or null if parsing fails
 */
export async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}
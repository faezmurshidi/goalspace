import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard', '/chat', '/goals', '/spaces'];
const authRoutes = ['/auth', '/login', '/signup'];

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  try {
    // Initialize the Supabase client with types
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.delete({ name, ...options });
          },
        },
      }
    );

    // Refresh session if it exists
    await supabase.auth.getSession();

    // Get the current path
    const path = req.nextUrl.pathname;

    // Check if the user is accessing a protected route
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
    const isAuthRoute = authRoutes.some(route => path === route);

    const { data: { user } } = await supabase.auth.getUser();

    // If there is no user and trying to access protected route
    if (!user && isProtectedRoute) {
      return handleAuthRedirect(req, false);
    }

    // If there is a user and trying to access auth routes
    if (user && isAuthRoute) {
      return handleAuthRedirect(req, true);
    }

    // Add auth state to headers for client-side use
    response.headers.set('x-auth-state', user ? 'authenticated' : 'unauthenticated');

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of any errors, redirect to auth page
    return handleAuthRedirect(req, false);
  }
}

// Helper function to handle auth redirects
function handleAuthRedirect(req: NextRequest, isAuthenticated: boolean) {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = isAuthenticated ? '/dashboard' : '/auth';
  redirectUrl.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

// Update matcher to include all protected routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth',
    '/login',
    '/signup',
    '/chat/:path*',
    '/goals/:path*',
    '/spaces/:path*',
  ],
}; 
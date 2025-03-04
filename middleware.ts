import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  // Refresh session if expired
  await supabase.auth.getSession()
  
  // Optional: Check for protected routes and redirect if not authenticated
  const path = request.nextUrl.pathname
  const isAuthRoute = path === '/login' || path === '/signup' || path === '/auth' || path.startsWith('/auth/')
  const isApiRoute = path.startsWith('/api/')
  const isPublicRoute = path === '/' || path === '/pricing' || isAuthRoute || isApiRoute
  
  if (!isPublicRoute) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 
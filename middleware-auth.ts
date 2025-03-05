import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  try {
    const supabase = createMiddlewareClient({
      req: request,
      res,
    });

    await supabase.auth.getSession();
    return res;
  } catch (e) {
    return res;
  }
}

export const config = {
  matcher: [
    // Apply to all pages except API routes and static files
    '/((?!api|_next/static|_next/image|.*\\..*).*)' 
  ]
}; 
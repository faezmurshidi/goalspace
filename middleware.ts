import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from './next-intl.config.js';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Step 1: Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales: locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // For better SEO, ensure each locale has its own unique URL
  localeDetection: true
});

// Step 2: Define a combined middleware function
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip auth check for public routes
  const isPublicPage = 
    pathname === '/' || 
    pathname === '/login' ||
    pathname === '/auth' ||
    pathname === '/auth/callback' || 
    pathname.startsWith('/api/') || 
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/dev/site-info' || // Site info debug page
    pathname.includes('favicon') ||
    pathname.includes('.json') ||
    pathname.includes('.webmanifest') ||
    pathname.match(/\.[^/]+$/); // Skip files with extensions
    
  // Check if the path is under a locale
  const isLocalePathPublic = locales.some(locale => 
    pathname === `/${locale}` || // Root path under locale
    pathname === `/${locale}/login` || // Login path under locale
    pathname === `/${locale}/auth` || // Auth path under locale
    pathname === `/${locale}/blog` || // Exact blog route
    pathname.startsWith(`/${locale}/blog/`) // Blog sub-routes
  );
  
  // First, handle internationalization
  const response = intlMiddleware(request);
  
  // Then, handle authentication if needed
  if (!isPublicPage && !isLocalePathPublic) {
    try {
      const supabase = createMiddlewareClient({ req: request, res: response });
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session and this is a protected route, redirect to login
      if (!session) {
        const url = new URL('/login', request.url);
        // Preserve the locale if present in the original URL
        const locale = request.nextUrl.pathname.split('/')[1];
        if (locales.includes(locale)) {
          url.pathname = `/${locale}${url.pathname}`;
        }
        return NextResponse.redirect(url);
      }
    } catch (e) {
      console.error('Middleware authentication error:', e);
      // Fallback to login page on auth errors for security
      const url = new URL('/login', request.url);
      // Preserve locale if present
      const locale = request.nextUrl.pathname.split('/')[1];
      if (locales.includes(locale)) {
        url.pathname = `/${locale}${url.pathname}`;
      }
      return NextResponse.redirect(url);
    }
  }
  
  return response;
}

export const config = {
  // Match all pathnames except for specific static files and system paths
  matcher: [
    // Match all pathnames
    '/((?!_next/static|_next/image).*)',
    // Match specific locale paths
    '/(en|ms)/:path*'
  ]
}; 
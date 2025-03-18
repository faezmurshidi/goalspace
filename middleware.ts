import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Supported locales
export const locales = ['en', 'ms', 'zh'];
export const defaultLocale = 'en';

// Helper function to normalize paths by removing trailing slashes
function normalizePath(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

// Step 1: Define a function to handle locale logic
function getLocale(request: NextRequest) {
  // Check for the cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    console.log(`[Middleware] Using locale from cookie: ${cookieLocale}`);
    return cookieLocale;
  }
  
  // Check for the Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim())
      .find(lang => locales.includes(lang.substring(0, 2)));
    
    if (preferredLocale) {
      const locale = preferredLocale.substring(0, 2);
      console.log(`[Middleware] Using locale from Accept-Language: ${locale}`);
      return locale;
    }
  }
  
  // Use the default locale as fallback
  console.log(`[Middleware] Using default locale: ${defaultLocale}`);
  return defaultLocale;
}

// Step 2: Define a combined middleware function
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  // Normalize the path for consistent checking
  const normalizedPath = normalizePath(pathname);
  
  console.log(`[Middleware] Processing request for: ${pathname} (normalized: ${normalizedPath})`);
  
  // SKIP CONDITION 1: Static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/vercel') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('.webmanifest') ||
    pathname.includes('_ipx') ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/)
  ) {
    console.log(`[Middleware] Skipping static asset: ${pathname}`);
    return NextResponse.next();
  }
  
  // Extract the first segment to check if it's a locale
  const pathSegments = normalizedPath.split('/').filter(Boolean);
  const firstSegment = pathSegments[0] || '';
  const isFirstSegmentLocale = locales.includes(firstSegment);
  
  console.log(`[Middleware] Path segments: ${JSON.stringify(pathSegments)}`);
  console.log(`[Middleware] First segment: "${firstSegment}". Is locale: ${isFirstSegmentLocale}`);
  
  // CRITICAL FIX: Check if the path is a login route (with or without trailing slash)
  const isLoginRoute = pathSegments.length > 1 && pathSegments[1] === 'login';
  
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
    pathname.includes('pricing') ||
    pathname.match(/\.[^/]+$/); // Skip files with extensions
    
  // Check if the path is under a locale and is public
  const isLocalePathPublic = locales.some(locale => {
    // Special case for login paths (both with and without trailing slash)
    if (normalizedPath === `/${locale}/login`) {
      return true;
    }
    
    return (
      normalizedPath === `/${locale}` || // Root path under locale
      normalizedPath === `/${locale}/auth` || // Auth path under locale
      normalizedPath === `/${locale}/blog` || // Exact blog route
      normalizedPath.startsWith(`/${locale}/blog/`) || // Blog sub-routes
      normalizedPath === `/${locale}/pricing` || // Pricing page
      normalizedPath.startsWith(`/${locale}/pricing/`) // Pricing sub-routes
    );
  });
  
  // REDIRECT CONDITION 1: Root path - always redirect to locale
  if (pathname === '/') {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}`, request.url);
    console.log(`[Middleware] Redirecting root path to: ${newUrl.pathname}`);
    
    // Set the locale cookie for react-i18next to use
    const response = NextResponse.redirect(newUrl);
    response.cookies.set('NEXT_LOCALE', locale, { 
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/' 
    });
    
    return response;
  }
  
  // REDIRECT CONDITION 2: No locale in path - redirect to add locale
  if (!isFirstSegmentLocale) {
    const locale = getLocale(request);
    // Ensure we don't double-redirect for the root path
    if (pathname !== '/') {
      const newUrl = new URL(`/${locale}${pathname}`, request.url);
      console.log(`[Middleware] Adding locale to path, redirecting to: ${newUrl.pathname}`);
      
      // Set the locale cookie for react-i18next to use
      const response = NextResponse.redirect(newUrl);
      response.cookies.set('NEXT_LOCALE', locale, { 
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/' 
      });
      
      return response;
    }
  }
  
  // DIRECT LOGIN CHECK: If this is a login page, always allow access
  if (isFirstSegmentLocale && isLoginRoute) {
    console.log(`[Middleware] Allowing access to login page: ${pathname}`);
    
    // Set the locale cookie based on the URL for react-i18next to use
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', firstSegment, { 
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/' 
    });
    
    return response;
  }
  
  // PROTECTION CHECK: Handle Supabase auth for non-public pages
  if (isFirstSegmentLocale && !(isPublicPage || isLocalePathPublic)) {
    console.log(`[Middleware] Checking auth for protected route: ${pathname}`);
    try {
      // Create Supabase middleware client
      const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() });
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      // If user is not authenticated and accessing a protected route, redirect to login
      if (!session) {
        // Extract locale from pathname (we already know it's valid)
        const locale = firstSegment;
        const redirectUrl = new URL(`/${locale}/login`, request.url);
        // Add returnUrl to redirect back after login
        redirectUrl.searchParams.set('returnUrl', pathname);
        console.log(`[Middleware] Not authenticated, redirecting to: ${redirectUrl.pathname}`);
        return NextResponse.redirect(redirectUrl);
      }
      
      console.log(`[Middleware] User authenticated, allowing access to: ${pathname}`);
      
      // Set the locale cookie based on the URL for react-i18next to use
      const response = NextResponse.next();
      response.cookies.set('NEXT_LOCALE', firstSegment, { 
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/' 
      });
      
      return response;
    } catch (error) {
      console.error(`[Middleware] Auth error:`, error);
      // Extract locale from pathname
      const locale = firstSegment;
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // For all other cases (public routes with locale), set the locale cookie
  if (isFirstSegmentLocale) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', firstSegment, { 
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/' 
    });
    
    console.log(`[Middleware] Setting locale cookie for: ${firstSegment}`);
    return response;
  }
  
  // Allow the request to proceed
  console.log(`[Middleware] Allowing request to proceed: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  // Match all pathnames except for specific static files and system paths
  matcher: [
    // Match all pathnames except explicitly excluded ones
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}; 
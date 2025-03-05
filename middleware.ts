import createMiddleware from 'next-intl/middleware';
import { locales } from './next-intl.config.js';

// This middleware intercepts requests and handles locale detection and routing
export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,
  
  // Used when no locale matches
  defaultLocale: 'en',
  
  // This function is called when no locale matches from a URL and the Accept-Language header is used
  localePrefix: 'as-needed',
  
  // For better SEO, we want to make sure each locale has its own unique URL
  localeDetection: true
});

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Static files and assets:
  //   - Next.js system files (/_next/*)
  //   - Vercel system files (/_vercel/*)
  //   - Favicon files (/favicon.ico, /android-chrome-*.png, /apple-touch-icon.png, etc.)
  //   - Manifest files (/manifest.json, /site.webmanifest)
  //   - Any file with an extension (.jpg, .png, .css, etc)
  matcher: [
    // Match all request paths except for the ones starting with:
    '/((?!api|_next|_vercel|android-chrome|apple-touch-icon|favicon|site\\.webmanifest|manifest\\.json|.*\\..*).*)',
    // Optional: Match all request paths that have a locale prefix
    '/(en|ms)/:path*'
  ]
}; 
const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  staticPageGenerationTimeout: 180,
  transpilePackages: ['@goalspace/ui', '@goalspace/i18n'],
  // An unrelated npm project's lockfile in a parent directory
  // (/Users/faez/Documents/package-lock.json) makes Turbopack's automatic
  // workspace-root inference pick the wrong root, which breaks module
  // resolution for the newly-introduced workspace packages. Pin it explicitly
  // to the monorepo root (two levels up from apps/web) so the hoisted
  // node_modules and packages/* workspaces stay inside the project boundary.
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  // Lets `app/global-not-found.tsx` handle genuinely unmatched routes
  // (no `[locale]` segment matched at all) with its own branded, complete
  // `<html>` document instead of Next's built-in fallback, which ships
  // with no `lang` attribute. This is exactly the case the Next.js docs
  // call out for this flag: "your root layout is defined using top-level
  // dynamic segments" (this app's root layout is `app/[locale]/layout.tsx`).
  experimental: {
    globalNotFound: true,
  },
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

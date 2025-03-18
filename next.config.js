/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    // Add explicit revalidation URL for the build process
    NEXT_REVALIDATE_SERVER: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  },
  // Configure static/dynamic rendering behavior
  staticPageGenerationTimeout: 180, // Increase timeout for static page generation (in seconds)
  experimental: {
    // Enable app router to handle params more appropriately for static/dynamic balancing
    serverComponentsExternalPackages: [],
    // Allow more time for page generation
    workerThreads: true,
    // Use the faster Rust compiler (more reliable with complex imports/features)
    swcMinify: true,
    // Opt out of static generation for routes handled by your middleware
    fallbackNodePolyfills: false,
    // Disable ISR cache during build to prevent revalidation errors
    isrMemoryCacheSize: 0,
    incrementalCacheHandlerPath: false
  },
  // Use trailing slash to improve route matching
  trailingSlash: true,
  async headers() {
    const isProd = process.env.NEXT_PUBLIC_ENV === 'production';
    const isPreview = process.env.NEXT_PUBLIC_ENV === 'preview';
    const isDev = process.env.NEXT_PUBLIC_ENV === 'development';
    
    if (!isProd) console.log(`🔍 Configuring API headers for ${process.env.NEXT_PUBLIC_ENV} environment...`);
    
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  webpack: (config, { dev, isServer }) => {
    const environment = process.env.NEXT_PUBLIC_ENV || 'development';
    
    if (dev) {
      console.log(`\n🛠 Webpack configuration starting...`);
      console.log(`📌 Environment: ${environment}`);
      console.log(`📌 Target: ${isServer ? 'Server' : 'Client'}`);
      console.log('\n📦 Initial webpack config state:');
      console.log('- Resolve fallbacks:', config.resolve?.fallback || 'None');
    }

    // Important: Configure client-side fallbacks for Node.js built-ins
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        bufferutil: false,
        'utf-8-validate': false,
      };

      if (dev) console.log('✅ Updated fallbacks:', config.resolve.fallback);
    }

    if (dev) console.log('\n✨ Webpack configuration completed\n');
    return config;
  },
};

module.exports = nextConfig;

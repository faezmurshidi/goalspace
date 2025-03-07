/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  },
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

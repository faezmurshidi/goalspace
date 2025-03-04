/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  // Note: optimizeCss is not a valid Next.js config option
  // Add this to generate source maps in production for debugging
  productionBrowserSourceMaps: true,
  async headers() {
    console.log('🔍 Configuring API headers...');
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
  webpack: (config, { dev, isServer, webpack }) => {
    console.log(`\n🛠 Webpack configuration starting...`);
    console.log(`📌 Environment: ${dev ? 'Development' : 'Production'}`);
    console.log(`📌 Target: ${isServer ? 'Server' : 'Client'}`);
    
    // Log initial config state
    console.log('\n📦 Initial webpack config state:');
    console.log('- Resolve fallbacks:', config.resolve?.fallback || 'None');
    console.log('- Mode:', config.mode);
    console.log('- Target:', config.target);

    if (!isServer) {
      console.log('\n🔧 Configuring client-side fallbacks...');
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
      console.log('✅ Updated fallbacks:', config.resolve.fallback);
      
      // Ensure CSS order is preserved in production
      if (!dev) {
        // This ensures CSS modules are processed in the same order in production as in development
        config.optimization.moduleIds = 'named';
        
        // Disable CSS minification which can cause ordering issues
        const cssRule = config.module.rules.find(rule => rule.oneOf && Array.isArray(rule.oneOf));
        if (cssRule && cssRule.oneOf) {
          cssRule.oneOf.forEach(rule => {
            if (rule.use && Array.isArray(rule.use)) {
              rule.use.forEach(loader => {
                if (loader.loader && loader.loader.includes('css-loader') && loader.options) {
                  // Preserve CSS class names in production
                  loader.options.modules = loader.options.modules || {};
                  if (typeof loader.options.modules === 'object') {
                    loader.options.modules.localIdentName = '[name]__[local]--[hash:base64:5]';
                  }
                }
              });
            }
          });
        }
      }
    }

    // Log final plugins count
    if (dev) {
      // Log final plugins count
      console.log(`\n📊 Final configuration summary:`);
      console.log(`- Total plugins: ${config.plugins?.length || 0}`);
      console.log(`- Total rules: ${config.module?.rules?.length || 0}`);
      console.log(`- Optimization enabled: ${!!config.optimization}`);
      
      // Log memory usage (consider moving to a debug flag)
      const used = process.memoryUsage();
      console.log('\n💾 Current memory usage:');
      for (let key in used) {
        console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
      }
    }

    if (dev) console.log('\n✨ Webpack configuration completed\n');
    return config;
  },
};

// Log when the config is loaded
console.log('\n🚀 Loading Next.js configuration...');
console.log('⚙️  Mode:', process.env.NODE_ENV);
console.log('📍 Current directory:', process.cwd());

module.exports = nextConfig

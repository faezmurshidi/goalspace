/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  async headers() {
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
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `ws` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig

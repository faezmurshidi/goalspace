const env = process.env.NEXT_PUBLIC_ENV || 'development';

export const isProduction = env === 'production';
export const isStaging = env === 'staging';
export const isDevelopment = env === 'development';

export const config = {
  env,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
  },
  analytics: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    id: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
  },
  features: {
    chat: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',
    skillTree: process.env.NEXT_PUBLIC_ENABLE_SKILL_TREE === 'true',
  },
  performance: {
    cache: isProduction && process.env.NEXT_PUBLIC_ENABLE_CACHE === 'true',
    cacheMaxAge: parseInt(process.env.NEXT_PUBLIC_CACHE_MAX_AGE || '3600', 10),
    cdn: isProduction && process.env.NEXT_PUBLIC_ENABLE_CDN === 'true',
  },
} as const;

// Type-safe config accessor
export function getConfig<K extends keyof typeof config>(key: K): typeof config[K] {
  return config[key];
}

// Validate required environment variables
export function validateConfig() {
  const required = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

type EnvConfig = {
  apiTimeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'error';
};

const envConfigs: Record<string, EnvConfig> = {
  development: {
    apiTimeout: 5000,
    maxRetries: 3,
    logLevel: 'debug',
  },
  staging: {
    apiTimeout: 10000,
    maxRetries: 3,
    logLevel: 'info',
  },
  production: {
    apiTimeout: 15000,
    maxRetries: 5,
    logLevel: 'error',
  },
};

export const envConfig: EnvConfig = envConfigs[env] || envConfigs.development; 
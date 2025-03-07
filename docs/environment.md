# Environment Configuration

The Goalspace application uses different environment configurations based on deployment context:

## Environments

### Development (Local)
- Used for local development
- Environment variables in `.env.development`
- No analytics enabled
- All feature flags can be toggled

### Preview (Vercel Preview Deployments)
- Used for PR previews and branch deployments
- Environment variables in `.env.preview`
- Shares same API keys with development
- No analytics enabled
- Feature flags match development

### Production
- Used for the live production site
- Environment variables in `.env.production`
- Full analytics enabled
- All stable features enabled

## Setting Up Environment Variables

1. Copy `.env.example` to create your local environment files
2. For local development:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in the required API keys in `.env.local`

## Environment Variables

Key environment variables include:

```
# Environment
NEXT_PUBLIC_ENV=development # or preview or production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI Services
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
# (other API keys)

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SKILL_TREE=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Development Flags
NEXT_PUBLIC_SKIP_API_CALL=false  # Set to 'true' to use mock data instead of real API calls
```

## Development Flags

### Skip API Calls (NEXT_PUBLIC_SKIP_API_CALL)

When this flag is set to `true` in development, the application will use mock data instead of making real API calls to external LLM providers. This is useful for:

- Reducing development costs by avoiding unnecessary API calls
- Testing flows and UI without dependent services
- Speeding up development cycles with consistent responses

To enable this flag:

```bash
# In .env.local
NEXT_PUBLIC_SKIP_API_CALL=true
```

Mock responses are located in `/lib/utils/mock-data.ts` and can be modified to test different scenarios.

## Vercel Deployment

For Vercel deployments:

1. Production environment uses `.env.production`
2. Preview deployments use `.env.preview`
3. Environment variables should be set in the Vercel project settings
4. System environment variables in Vercel will override values in the files
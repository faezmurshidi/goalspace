# GoalSpace Development Guidelines

## Build Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for current environment
- `pnpm build:staging` - Build for staging
- `pnpm build:production` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm clean` - Clean build cache
- `pnpm build:clean` - Clean cache and build for production

## Code Structure
- `app/` - Next.js app directory (App Router)
- `components/` - Reusable React components
- `lib/` - Utilities, types, and helpers
- `supabase/` - Database migrations and schema

## Code Style
- **React/Next.js**: Use App Router patterns with TypeScript
- **Styling**: Tailwind CSS with cn() utility for conditional classes
- **State**: React hooks for local state, Zustand for global state
- **Components**: Mobile-first, accessible, performance-optimized
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Imports**: Group imports (React, external, internal, types)
- **Error Handling**: Proper loading states and error messages
- **Database**: RLS policies for all tables with appropriate permissions

## Supabase Guidelines
- Migration files follow YYYYMMDDHHMMSS_description.sql naming
- SQL should be lowercase with thorough comments
- All tables must have Row Level Security enabled
- Always use auth.uid() instead of current_user
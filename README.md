# GoalSpace

A modern web application for goal setting and tracking, powered by AI mentors and multilingual support.

## Features

- **AI-Powered Mentorship**: Set goals and get personalized guidance from AI mentors
- **Learning Spaces**: Organize your learning journey with dedicated spaces for each goal
- **Multilingual Support**: Available in English, Malay, and Chinese
- **Blog & Knowledge Base**: Access learning resources and articles in your preferred language
- **Progress Tracking**: Monitor your advancement with visual indicators and task management

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Authentication**: Supabase Auth with email verification
- **Internationalization**: react-i18next for translations and locale management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Environment variables set up

### Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SKIP_API_CALL=true # Optional: for development without API calls
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/goalspace.git
cd goalspace
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

## Internationalization

GoalSpace supports multiple languages through the react-i18next package:

- English (en) - Default
- Malay (ms) 
- Chinese (zh)

Translation files are located in the `/locales` directory. To add a new language:

1. Create a new JSON file in the `/locales` directory (e.g., `fr.json`)
2. Update the `i18n.ts` configuration file to include the new locale
3. Add language selector option in the `language-selector.tsx` component

## Project Structure

```
goalspace/
├── app/                    # Next.js app router pages
│   ├── [locale]/           # Internationalized routes
│   │   ├── blog/           # Blog pages and articles
│   │   ├── login/          # Authentication pages
│   │   └── page.tsx        # Landing page
│   ├── (authenticated)/    # Protected routes
│   ├── (dashboard)/        # Dashboard routes
│   ├── auth/               # Auth callback routes
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # UI components (shadcn)
│   ├── sections/           # Page sections
│   └── ...                 # Feature components
├── lib/                    # Utility functions
│   ├── auth.ts            # Auth utilities
│   ├── store.ts           # Zustand store
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
├── locales/                # Translation files
│   ├── en.json            # English translations
│   ├── ms.json            # Malay translations
│   └── zh.json            # Chinese translations
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   ├── schema/            # Database schema files
│   └── seed.sql           # Seed data
└── docs/                  # Documentation
    ├── design-guidelines.md  # Design guidelines
    └── ...                # Other documentation
```

## Authentication Flow

1. **Sign Up**
   - User enters email and password
   - Verification email is sent
   - User must verify email before accessing the app

2. **Email Verification**
   - User clicks verification link in email
   - Redirected to `/auth/callback`
   - User record and settings created after verification
   - Redirected to dashboard with correct locale

3. **Sign In**
   - User enters verified email and password or uses OAuth provider
   - Redirected to locale-specific dashboard on success

## Security

- Row Level Security (RLS) enabled on all tables
- Email verification required
- Secure session management
- Protected API routes
- XSS protection through proper content sanitization

## Development Features

- **Skip API Calls**: Set `NEXT_PUBLIC_SKIP_API_CALL=true` in `.env.local` to use mock data
- **Mock Data**: Located in `/lib/utils/mock-data.ts` for development without API costs
- **Blog Mock Data**: Test the blog feature with mock articles in `/app/[locale]/blog/mock-data.ts`

## Development Workflow

1. **Database Changes**
   - Add migrations in `supabase/migrations/`
   - Apply using Supabase CLI or dashboard

2. **Feature Development**
   - Create components in `components/`
   - Add routes in appropriate locale directories
   - Update types as needed
   - Add translations to locale JSON files

3. **Testing**
   - Test authentication flows
   - Verify RLS policies
   - Check internationalization works across locales

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
# GoalSpace

A modern web application for goal setting and tracking, powered by AI mentors.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Authentication**: Supabase Auth with email verification

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
```

3. Run the development server:
```bash
npm run dev
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'dark' NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);
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
   - Redirected to dashboard

3. **Sign In**
   - User enters verified email and password
   - Redirected to dashboard on success

## Project Structure

```
goalspace/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication routes
│   ├── dashboard/         # Dashboard routes
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # UI components (shadcn)
│   └── ...               # Feature components
├── lib/                   # Utility functions
│   ├── auth.ts           # Auth utilities
│   ├── store.ts          # Zustand store
│   └── supabase/         # Supabase client
└── supabase/             # Supabase configuration
    ├── migrations/       # Database migrations
    └── schema.sql       # Database schema
```

## Security

- Row Level Security (RLS) enabled on all tables
- Email verification required
- Secure session management
- Protected API routes

## Development Workflow

1. **Database Changes**
   - Add migrations in `supabase/migrations/`
   - Apply using Supabase CLI or dashboard

2. **Feature Development**
   - Create components in `components/`
   - Add routes in `app/`
   - Update types as needed

3. **Testing**
   - Test authentication flows
   - Verify RLS policies
   - Check email verification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

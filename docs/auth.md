# Authentication Documentation

## Overview

GoalSpace uses Supabase Authentication with email verification. This document outlines the authentication flow, database structure, and security measures.

## Authentication Flow

### Sign Up Process

1. **Client-Side Initiation**
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback`
     }
   });
   ```

2. **Email Verification**
   - Verification email sent to user
   - Contains link to `/auth/callback?code=xxx`
   - No database records created until verification

3. **Verification Callback**
   - Handles email verification at `/auth/callback`
   - Exchanges code for session
   - Creates user records in database
   - Redirects to dashboard

### Sign In Process

1. **Client-Side Authentication**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   });
   ```

2. **Session Management**
   - Session stored in cookies
   - Automatic token refresh
   - Secure session persistence

## Database Structure

### Auth Schema (Managed by Supabase)
- `auth.users`: Core user authentication data
- Handles passwords, email verification, sessions

### Public Schema (Our Application)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User Settings Table
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'dark' NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## Security Measures

### Row Level Security (RLS)

1. **Users Table Policies**
```sql
-- Allow users to view own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

2. **User Settings Policies**
```sql
-- Allow users to view own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);
```

### Email Verification

- Required before account activation
- Secure token-based verification
- Limited-time verification links

### Session Management

- Secure cookie-based sessions
- Automatic token refresh
- Cross-tab session synchronization

## Error Handling

1. **Sign Up Errors**
   - Email already exists
   - Invalid email format
   - Weak password
   - Verification email sending failure

2. **Sign In Errors**
   - Invalid credentials
   - Unverified email
   - Rate limiting

3. **Verification Errors**
   - Invalid/expired verification code
   - Database creation failures
   - Session creation issues

## Client Integration

### Protected Routes
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(...);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return res;
}
```

### Auth State Management
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
```

## Testing Authentication

1. **Manual Testing**
   - Sign up flow
   - Email verification
   - Sign in with verified email
   - Password reset flow
   - Session persistence
   - Protected route access

2. **Error Scenarios**
   - Invalid credentials
   - Expired verification links
   - Network failures
   - Database constraints

## Deployment Considerations

1. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **Email Provider Setup**
   - Configure SMTP in Supabase
   - Test email delivery
   - Monitor bounce rates

3. **Security Headers**
   - CSP configuration
   - CORS settings
   - Cookie security

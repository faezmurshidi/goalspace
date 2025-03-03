# Authentication Guidelines

This document outlines the standard authentication approach for all API routes in GoalSpace.

## Core Authentication Principles

1. **All API routes must use server-side authentication via Supabase SSR**
2. **Never trust client-supplied user IDs**
3. **Use consistent error handling for authentication failures**
4. **Apply the principle of least privilege**

## Using the Authentication Middleware

We've implemented a standardized authentication middleware in `utils/supabase/middleware.ts` that should be used for all API routes:

```typescript
// Example API route with authentication
import { withAuth } from '@/utils/supabase/middleware';
import { User } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

export const POST = withAuth(async (request: Request, user: User, supabase: SupabaseClient) => {
  // Your authenticated API logic here
  // User is already authenticated and available as 'user'
  // Supabase client is already set up with the user's session
  
  return NextResponse.json({ success: true, data: result });
});
```

## Benefits

- Consistent authentication across all routes
- Automatic error handling for unauthorized requests
- Server-side validation of user sessions
- Type safety with TypeScript
- Security best practices enforced across the application

## Additional Utility Functions

- `parseRequestBody(request)` - Safely parse JSON request body with error handling

## Error Responses

Authentication errors are standardized:

- 401 Unauthorized - When the user is not authenticated
- 500 Internal Server Error - When an unexpected error occurs during authentication

## Security Recommendations

1. Use Row Level Security (RLS) in Supabase for data-level authorization
2. Add rate limiting for sensitive operations
3. Implement audit logging for important actions
4. Consider adding CSRF protection for additional security
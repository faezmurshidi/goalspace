import { Suspense } from 'react';

import { AuthForm } from '@/components/auth-form';

// AuthForm constructs a Supabase client at render time, so this route must
// not be statically prerendered — that would require Supabase env vars to
// be present at build time.
export const dynamic = 'force-dynamic'

function AuthPageContent() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <AuthForm />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
    >
      <AuthPageContent />
    </Suspense>
  );
}

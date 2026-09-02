import { Suspense } from 'react';

import { AuthForm } from '@/components/auth/auth-form';
import { AuthMasthead } from '@/components/auth/auth-masthead';

// AuthForm builds a Supabase client at render time, so this route must not be
// statically prerendered: that would require the Supabase env vars to exist at
// build time.
export const dynamic = 'force-dynamic';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-paper flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <AuthMasthead />
        {children}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Frame>
          {/* A shaped skeleton rather than the word "Loading", so the plate
              holds its footprint and the page does not jump when the form
              arrives. */}
          <div className="border-rule bg-paper-shade h-[34rem] border" />
        </Frame>
      }
    >
      <Frame>
        <AuthForm />
      </Frame>
    </Suspense>
  );
}

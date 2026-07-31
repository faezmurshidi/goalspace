'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';

function AuthPageContent() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <AuthForm />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
} 
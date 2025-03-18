'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { Background } from '@/components/background';

function AuthPageContent() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Background />
      <LoginForm />
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
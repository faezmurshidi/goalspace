import { AuthForm } from '@/components/auth-form';
import { Background } from '@/components/background';

export default function AuthPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Background />
      <AuthForm />
    </div>
  );
} 
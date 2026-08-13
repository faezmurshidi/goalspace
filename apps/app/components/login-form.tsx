'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Apple, Chrome } from 'lucide-react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, cn } from '@goalspace/ui';
import { identifyUser, trackError, trackEvent } from '@/app/_lib/analytics';
import { createClient } from '@/utils/supabase/client';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get('returnUrl') || '/';
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Track login attempt
      trackEvent('login_attempt', { method: 'email' });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Successful login tracking
      trackEvent('login_success', { method: 'email' });

      // Identify user for future analytics
      if (data.user) {
        identifyUser(data.user.id, {
          email: data.user.email,
          auth_method: 'email',
          last_login: new Date().toISOString(),
        });
      }

      router.push(returnUrl);
      router.refresh();
    } catch (error) {
      console.error('Error logging in:', error);
      trackError('login_error', 'Email login failed', {
        email: email,
        // Don't include password in error tracking for security
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'apple' | 'google') => {
    try {
      // Track OAuth login attempt
      trackEvent('login_attempt', { method: provider });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // We can't track success here since OAuth redirects away
      // Success tracking should happen in the callback handler
    } catch (error) {
      console.error('Error with OAuth login:', error);
      trackError('login_error', `${provider} login failed`, {
        provider,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Login with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin('apple')}
                >
                  <Apple className="mr-2 size-4" />
                  Login with Apple
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin('google')}
                >
                  <Chrome className="mr-2 size-4" />
                  Login with Google
                </Button>
              </div>
              <div className="relative text-center">
                <span className="relative z-10 bg-background px-2 text-sm text-muted-foreground">
                  Or continue with
                </span>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 border-t border-border" />
              </div>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    className="h-11"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <a
                      href="#"
                      className="ml-auto text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    className="h-11"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{' '}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}

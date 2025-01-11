'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSignIn(data: AuthFormValues) {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      router.push('/dashboard');
      toast({
        title: 'Success',
        description: 'You have successfully signed in.',
      });
    } catch (error) {
      console.error('Signin error:', error);
      toast({
        title: 'Error',
        description: 'Invalid email or password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSignUp(data: AuthFormValues) {
    setIsLoading(true);
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: data.email,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      if (authData.user.identities?.length === 0) {
        toast({
          title: 'Account exists',
          description: 'An account with this email already exists. Please sign in instead.',
          variant: 'destructive',
        });
        return;
      }

      if (authData.session === null) {
        toast({
          title: 'Verify your email',
          description: 'Please check your email to verify your account before signing in.',
        });
        return;
      }

      // If we have a session (email verification is disabled), proceed with user creation
      router.push('/dashboard');
      toast({
        title: 'Success',
        description: 'Your account has been created successfully.',
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[400px] bg-background/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Welcome to GoalSpace</CardTitle>
        <CardDescription>Sign in or create an account to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSignIn)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="signup">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSignUp)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        Protected by Supabase Auth
      </CardFooter>
    </Card>
  );
}

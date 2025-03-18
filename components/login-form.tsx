"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Apple, Chrome } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { trackEvent, trackError, identifyUser } from "@/app/_lib/analytics"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"

// Validation schema
const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Login form
  const loginForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup form
  const signupForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleEmailLogin = async (data: AuthFormValues) => {
    setLoading(true)
    
    try {
      // Track login attempt
      trackEvent('login_attempt', { method: 'email' })
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error
      
      // Successful login tracking
      trackEvent('login_success', { method: 'email' })
      
      // Identify user for future analytics
      if (authData.user) {
        identifyUser(authData.user.id, {
          email: authData.user.email,
          auth_method: 'email',
          last_login: new Date().toISOString()
        })
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      })
      
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error logging in:", error)
      trackError('login_error', 'Email login failed', { 
        email: data.email,
        // Don't include password in error tracking for security
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (data: AuthFormValues) => {
    setLoading(true)
    
    try {
      // Track signup attempt
      trackEvent('signup_attempt', { method: 'email' })
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) throw error
      
      // Successful signup tracking
      trackEvent('signup_success', { method: 'email' })
      
      if (authData.user && authData.session) {
        // Auto-login if session is available (email verification disabled)
        identifyUser(authData.user.id, {
          email: authData.user.email,
          auth_method: 'email',
          signup_date: new Date().toISOString()
        })
        
        toast({
          title: "Account created",
          description: "Welcome to GoalSpace!",
        })
        
        router.push("/dashboard")
        router.refresh()
      } else {
        // Email verification required
        toast({
          title: "Verification required",
          description: "Please check your email to verify your account before signing in.",
        })
      }
    } catch (error) {
      console.error("Error signing up:", error)
      trackError('signup_error', 'Email signup failed', { 
        email: data.email,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "An error occurred during signup",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'apple' | 'google', isSignUp = false) => {
    try {
      // Track OAuth attempt
      trackEvent(isSignUp ? 'signup_attempt' : 'login_attempt', { method: provider })
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      // We can't track success here since OAuth redirects away
      // Success tracking should happen in the callback handler
    } catch (error) {
      console.error(`Error with ${provider} authentication:`, error)
      trackError(isSignUp ? 'signup_error' : 'login_error', `${provider} authentication failed`, { 
        provider,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      toast({
        title: "Authentication failed",
        description: `Failed to sign in with ${provider}.`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center space-y-1.5">
          <CardTitle className="text-xl font-semibold">Welcome to GoalSpace</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Login or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="login" 
            className="w-full"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "login" | "signup")}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
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
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleEmailLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="m@example.com"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <a
                              href="#"
                              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 underline-offset-4 hover:underline"
                            >
                              Forgot password?
                            </a>
                          </div>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-11"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('apple', true)}
                  >
                    <Apple className="mr-2 size-4" />
                    Sign up with Apple
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('google', true)}
                  >
                    <Chrome className="mr-2 size-4" />
                    Sign up with Google
                  </Button>
                </div>
                <div className="relative text-center">
                  <span className="relative z-10 bg-background px-2 text-sm text-muted-foreground">
                    Or continue with
                  </span>
                  <div className="absolute inset-0 top-1/2 -translate-y-1/2 border-t border-border" />
                </div>
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="m@example.com"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-11"
                      disabled={loading}
                    >
                      {loading ? "Signing up..." : "Sign up"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}

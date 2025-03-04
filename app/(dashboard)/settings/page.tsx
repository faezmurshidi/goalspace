'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/lib/hooks/useUser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { getSubscriptionFeatures } from '@/lib/utils/paywall';

const settingsSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email_notifications: z.boolean(),
  theme_preference: z.enum(['light', 'dark', 'system']),
  ai_model_preference: z.enum(['gpt-3.5-turbo', 'gpt-4', 'claude-3']),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { profile, settings, apiUsage, subscription } = useUser();
  const supabase = createClient();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: '',
      email_notifications: true,
      theme_preference: 'system',
      ai_model_preference: 'gpt-3.5-turbo',
    },
  });

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        form.reset({
          full_name: settings.full_name || '',
          email_notifications: settings.email_notifications === null ? false : settings.email_notifications,
          theme_preference: settings.theme_preference || 'system',
          ai_model_preference: settings.ai_model_preference || 'gpt-3.5-turbo',
        });
      }
    }

    loadSettings();
  }, [form, supabase]);

  // Get subscription features based on current tier
  const features = {
    maxTokensPerMonth: 100000,
    maxSpaces: 5,
    maxDocuments: 20,
    aiModels: ['gpt-3.5-turbo'],
    maxMentorsPerSpace: 3,
  };

  // Calculate token usage percentage
  const tokenUsagePercentage = apiUsage ? ((apiUsage.api_calls_count || 0) / features.maxTokensPerMonth) * 100 : 0;

  // Mock data for the charts - replace with real data from your API
  const monthlyUsageData = [
    { name: 'Week 1', tokens: 25000 },
    { name: 'Week 2', tokens: 35000 },
    { name: 'Week 3', tokens: 28000 },
    { name: 'Week 4', tokens: 40000 },
  ];

  const modelUsageData = [
    { name: 'GPT-3.5', usage: 45 },
    { name: 'GPT-4', usage: 30 },
    { name: 'Claude', usage: 25 },
  ];

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Settings updated',
        description: 'Your settings have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Usage & Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your profile information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name that will be displayed on your profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="theme_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme Preference</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose your preferred theme for the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ai_model_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default AI Model</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an AI model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="claude-3">Claude 3</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select your preferred AI model for generating content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive email notifications about your progress and updates.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Your current plan and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">
                      {subscription?.subscription_type.toUpperCase() || 'FREE'} Plan
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Billing period: {subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString() : 'N/A'} 
                      {subscription?.end_date ? ` - ${new Date(subscription.end_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-sm font-medium">Token Usage</span>
                      <span>{apiUsage?.api_calls_count?.toLocaleString() || '0'} / {features.maxTokensPerMonth.toLocaleString()}</span>
                    </div>
                    <Progress value={tokenUsagePercentage} />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Monthly Token Usage</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyUsageData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="tokens" stroke="#2563eb" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Model Usage Distribution</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modelUsageData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="usage" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Plan Features</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between text-sm">
                        <span>Max Spaces</span>
                        <span>{features.maxSpaces}</span>
                      </li>
                      <li className="flex justify-between text-sm">
                        <span>Monthly Tokens</span>
                        <span>{features.maxTokensPerMonth.toLocaleString()}</span>
                      </li>
                      <li className="flex justify-between text-sm">
                        <span>Available Models</span>
                        <span>{features.aiModels.join(', ')}</span>
                      </li>
                      <li className="flex justify-between text-sm">
                        <span>Mentors per Space</span>
                        <span>{features.maxMentorsPerSpace}</span>
                      </li>
                    </ul>
                  </div>

                  {subscription?.subscription_type !== 'pro' && (
                    <Button className="w-full">
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
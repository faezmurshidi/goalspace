'use client';

import { useEffect, useMemo, useState } from 'react';
import { User, UserSettings, UserApiUsage, UserSubscriptionHistory } from '@/lib/types/database';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export type UserData = {
  profile: User | null;
  settings: UserSettings | null;
  apiUsage: UserApiUsage | null;
  subscription: UserSubscriptionHistory | null;
  isLoading: boolean;
  error: Error | null;
};

export function useUser() {
  const [userData, setUserData] = useState<UserData>({
    profile: null,
    settings: null,
    apiUsage: null,
    subscription: null,
    isLoading: true,
    error: null,
  });
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          setUserData(prev => ({ ...prev, isLoading: false }));
          router.push('/auth');
          return;
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) throw profileError;

        // Fetch user settings
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (settingsError) throw settingsError;

        // Fetch API usage
        const { data: apiUsage, error: apiUsageError } = await supabase
          .from('user_api_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (apiUsageError) throw apiUsageError;

        // Fetch active subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from('user_subscription_history')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          throw subscriptionError;
        }

        setUserData({
          profile,
          settings,
          apiUsage,
          subscription,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }
    };

    fetchUserData();

    // Set up realtime subscriptions
    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userData.profile?.id}`,
        },
        (payload: any) => {
          setUserData(prev => ({
            ...prev,
            profile: payload.new as User,
          }));
        }
      )
      .subscribe();

    const settingsSubscription = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userData.profile?.id}`,
        },
        (payload: any) => {
          setUserData(prev => ({
            ...prev,
            settings: payload.new as UserSettings,
          }));
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
    };
  }, []);

  return userData;
} 
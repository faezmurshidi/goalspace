import { supabase } from './supabase/client';
import { useSpaceStore } from './store';

export async function signUp(email: string, password: string) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // Only create user record if email verification is disabled (session exists)
    if (authData.session) {
      // Create a user record in the database
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          created_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // Create user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: authData.user.id,
          api_calls_count: 0,
          theme: 'dark',
        });

      if (settingsError) throw settingsError;
    }

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Error in signUp:', error);
    return { user: null, error };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error in signIn:', error);
    return { user: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Reset the store
    useSpaceStore.getState().reset();

    return { error: null };
  } catch (error) {
    console.error('Error in signOut:', error);
    return { error };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return { user: null, error };
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Error in getSession:', error);
    return { session: null, error };
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.test' });

const url = process.env.API_URL!;
const anonKey = process.env.ANON_KEY!;
const serviceKey = process.env.SERVICE_ROLE_KEY!;

export type TestUser = { id: string; email: string; client: SupabaseClient };

export function adminClient(): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function createTestUser(email: string): Promise<TestUser> {
  const admin = adminClient();
  const password = 'test-password-123!';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;

  // public.users is a separate profile table; its id must match auth.uid().
  const { error: profileError } = await admin.from('users').insert({ id, email });
  if (profileError) throw profileError;

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id, email, client };
}

export async function deleteTestUser(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}

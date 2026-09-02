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

  // The profile row is created by the `on_auth_user_created` trigger, in the
  // same transaction as the auth insert above. This helper used to insert it
  // by hand, which now always collides on the primary key.
  //
  // Asserting instead of inserting keeps the check that matters: every
  // phase-1 table keys owner_id off users(id), so a missing profile makes
  // every subsequent write in these tests fail on a foreign key, with an
  // error that points at the write rather than at the real cause.
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (profileError || !profile) {
    // The auth user exists by now. Without this cleanup it is orphaned: the
    // caller's variable is never assigned, so afterAll has no id to delete,
    // and the rows accumulate silently across every later run.
    await admin.auth.admin.deleteUser(id);
    throw (
      profileError ??
      new Error(`Trigger on_auth_user_created did not provision public.users for ${email}`)
    );
  }

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

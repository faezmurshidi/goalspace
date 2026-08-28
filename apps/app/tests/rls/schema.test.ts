import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

config({ path: '.env.test' });

const admin = createClient(process.env.API_URL!, process.env.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

describe('phase 1 schema', () => {
  it('creates every table phase 1 needs', async () => {
    for (const table of [
      'users',
      'user_settings',
      'projects',
      'entries',
      'work_items',
      'documents',
      'document_revisions',
      'attachments',
    ]) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should exist`).toBeNull();
    }
  });

  it('exposes the account preference columns added for settings', async () => {
    // Same shape as the table-existence test above: a select that names the
    // columns fails with a PostgREST error if either is missing, which is
    // the regression this guards.
    const { error } = await admin.from('user_settings').select('locale, time_zone').limit(1);
    expect(error).toBeNull();
  });

  it('carries no legacy tables', async () => {
    for (const table of [
      'goals',
      'spaces',
      'modules',
      'tasks',
      'chat_messages',
      'blog_posts',
      'document_embeddings',
    ]) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should not exist`).not.toBeNull();
    }
  });
});

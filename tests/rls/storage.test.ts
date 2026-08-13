import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser;
let bob: TestUser;
let path: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`sa-${stamp}@example.test`);
  bob = await createTestUser(`sb-${stamp}@example.test`);
  path = `${alice.id}/project/weld.txt`;

  // storage-js drops the `contentType` upload option for Blob bodies and instead
  // relies on the Blob's own `type`, so it must be set on the Blob itself or the
  // server sees `application/octet-stream`, which is outside allowed_mime_types.
  const { error } = await alice.client.storage
    .from('attachments')
    .upload(path, new Blob(['weld photo stand-in'], { type: 'text/plain' }), {
      contentType: 'text/plain',
    });
  if (error) throw error;
});

afterAll(async () => {
  await alice.client.storage.from('attachments').remove([path]);
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
});

it('the owner can download their own attachment', async () => {
  const { data, error } = await alice.client.storage.from('attachments').download(path);
  expect(error).toBeNull();
  expect(data).not.toBeNull();
});

it('another user cannot download it', async () => {
  const { data } = await bob.client.storage.from('attachments').download(path);
  expect(data).toBeNull();
});

it("another user cannot upload into someone else's prefix", async () => {
  const { error } = await bob.client.storage
    .from('attachments')
    .upload(`${alice.id}/project/intrusion.txt`, new Blob(['x']));
  expect(error).not.toBeNull();
});

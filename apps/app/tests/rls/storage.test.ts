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
  const { error } = await alice.client.storage.from('attachments').remove([path]);
  if (error) throw error;
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
});

describe('read access', () => {
  it('the owner can download their own attachment', async () => {
    const { data, error } = await alice.client.storage.from('attachments').download(path);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('another user cannot download it', async () => {
    const { data } = await bob.client.storage.from('attachments').download(path);
    expect(data).toBeNull();
  });
});

describe('insert access', () => {
  it("another user cannot upload into someone else's prefix", async () => {
    // Use an allowed content type here. Without it, the upload is rejected
    // by the bucket's allowed_mime_types check regardless of who the caller
    // is, which would make this test pass even if attachments_insert were
    // deleted entirely — no discriminating power. With an allowed type, the
    // only thing left that can reject this upload is the path-prefix check,
    // so we assert on the RLS-specific status/message, not just "some error".
    const { error } = await bob.client.storage
      .from('attachments')
      .upload(`${alice.id}/project/intrusion.txt`, new Blob(['x'], { type: 'text/plain' }));
    expect(error).not.toBeNull();
    expect(error?.statusCode).toBe('403');
    expect(error?.message).toMatch(/row-level security/i);
  });
});

describe('update access', () => {
  let updatePath: string;

  beforeAll(async () => {
    updatePath = `${alice.id}/project/update-target.txt`;
    const { error } = await alice.client.storage
      .from('attachments')
      .upload(updatePath, new Blob(['v1'], { type: 'text/plain' }));
    if (error) throw error;
  });

  afterAll(async () => {
    const { error } = await alice.client.storage.from('attachments').remove([updatePath]);
    if (error) throw error;
  });

  it('the owner can overwrite their own attachment', async () => {
    const { error } = await alice.client.storage
      .from('attachments')
      .update(updatePath, new Blob(['v2'], { type: 'text/plain' }));
    expect(error).toBeNull();

    const { data } = await alice.client.storage.from('attachments').download(updatePath);
    await expect(data?.text()).resolves.toBe('v2');
  });

  it('another user cannot overwrite it', async () => {
    const { error } = await bob.client.storage
      .from('attachments')
      .update(updatePath, new Blob(['hacked'], { type: 'text/plain' }));
    expect(error).not.toBeNull();
    expect(error?.statusCode).toBe('403');
    expect(error?.message).toMatch(/row-level security/i);

    const { data } = await alice.client.storage.from('attachments').download(updatePath);
    await expect(data?.text()).resolves.toBe('v2');
  });
});

describe('delete access', () => {
  let deletePath: string;

  beforeAll(async () => {
    deletePath = `${alice.id}/project/delete-target.txt`;
    const { error } = await alice.client.storage
      .from('attachments')
      .upload(deletePath, new Blob(['gone soon'], { type: 'text/plain' }));
    if (error) throw error;
  });

  it('another user cannot delete it', async () => {
    // storage's bulk remove() does not surface an RLS rejection as an error:
    // like a table-level DELETE filtered by a USING clause, zero rows match
    // for the caller, and the endpoint reports success with an empty result.
    // The object's continued existence is the only signal a policy held.
    const { data, error } = await bob.client.storage.from('attachments').remove([deletePath]);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillThere, error: downloadError } = await alice.client.storage
      .from('attachments')
      .download(deletePath);
    expect(downloadError).toBeNull();
    expect(stillThere).not.toBeNull();
  });

  it('the owner can delete their own attachment', async () => {
    const { data, error } = await alice.client.storage.from('attachments').remove([deletePath]);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const { data: afterDelete } = await alice.client.storage
      .from('attachments')
      .download(deletePath);
    expect(afterDelete).toBeNull();
  });
});

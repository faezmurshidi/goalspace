import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProjectId: string;
let aliceEntryId: string;
let aliceWorkItemId: string;
let aliceDocumentId: string;
let aliceDocumentRevisionId: string;
let aliceAttachmentId: string;
let alicePublicProjectId: string;
let alicePublicEntryId: string;
let bobProjectId: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`alice-${stamp}@example.test`);
  bob = await createTestUser(`bob-${stamp}@example.test`);

  const { data: project, error: projectError } = await alice.client
    .from('projects')
    .insert({
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
      kind: 'build',
    })
    .select()
    .single();
  if (projectError) throw projectError;
  aliceProjectId = project.id;

  const { data: entry, error: entryError } = await alice.client
    .from('entries')
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      kind: 'decision',
      title: '18650 over 21700',
      body: 'Sourcing lead time 6 weeks vs 14.',
    })
    .select()
    .single();
  if (entryError) throw entryError;
  aliceEntryId = entry.id;

  const { data: item, error: itemError } = await alice.client
    .from('work_items')
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: 'Design BMS',
    })
    .select()
    .single();
  if (itemError) throw itemError;
  aliceWorkItemId = item.id;

  const { data: doc, error: docError } = await alice.client
    .from('documents')
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: 'Frame geometry spec',
      body: 'v1',
    })
    .select()
    .single();
  if (docError) throw docError;
  aliceDocumentId = doc.id;

  const { data: revision, error: revisionError } = await alice.client
    .from('document_revisions')
    .insert({
      document_id: aliceDocumentId,
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: 'Frame geometry spec',
      body: 'v1',
    })
    .select()
    .single();
  if (revisionError) throw revisionError;
  aliceDocumentRevisionId = revision.id;

  const { data: attachment, error: attachmentError } = await alice.client
    .from('attachments')
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      entry_id: aliceEntryId,
      storage_path: 'ev-bike/decision-note.pdf',
      mime_type: 'application/pdf',
      byte_size: 1024,
    })
    .select()
    .single();
  if (attachmentError) throw attachmentError;
  aliceAttachmentId = attachment.id;

  const { data: publicProject, error: publicProjectError } = await alice.client
    .from('projects')
    .insert({
      owner_id: alice.id,
      slug: 'public-notes',
      title: 'Public build notes',
      kind: 'build',
      visibility: 'public',
    })
    .select()
    .single();
  if (publicProjectError) throw publicProjectError;
  alicePublicProjectId = publicProject.id;

  const { data: publicEntry, error: publicEntryError } = await alice.client
    .from('entries')
    .insert({
      project_id: alicePublicProjectId,
      owner_id: alice.id,
      kind: 'note',
      body: 'Visible to anyone.',
    })
    .select()
    .single();
  if (publicEntryError) throw publicEntryError;
  alicePublicEntryId = publicEntry.id;

  const { data: bobProject, error: bobProjectError } = await bob.client
    .from('projects')
    .insert({
      owner_id: bob.id,
      slug: 'bobs-project',
      title: "Bob's own project",
      kind: 'build',
    })
    .select()
    .single();
  if (bobProjectError) throw bobProjectError;
  bobProjectId = bobProject.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('owner can reach their own rows', () => {
  it('reads their project', async () => {
    const { data } = await alice!.client.from('projects').select('id').eq('id', aliceProjectId);
    expect(data).toHaveLength(1);
  });

  it('reads their document revision', async () => {
    const { data } = await alice!.client
      .from('document_revisions')
      .select('id')
      .eq('id', aliceDocumentRevisionId);
    expect(data).toHaveLength(1);
  });

  it('reads their attachment', async () => {
    const { data } = await alice!.client
      .from('attachments')
      .select('id')
      .eq('id', aliceAttachmentId);
    expect(data).toHaveLength(1);
  });
});

describe('a second user is fully isolated', () => {
  it('cannot read the project', async () => {
    const { data } = await bob!.client.from('projects').select('id').eq('id', aliceProjectId);
    expect(data).toEqual([]);
  });

  it('cannot read entries', async () => {
    const { data } = await bob!.client.from('entries').select('id').eq('id', aliceEntryId);
    expect(data).toEqual([]);
  });

  it('cannot read work items', async () => {
    const { data } = await bob!.client.from('work_items').select('id').eq('id', aliceWorkItemId);
    expect(data).toEqual([]);
  });

  it('cannot read documents', async () => {
    const { data } = await bob!.client.from('documents').select('id').eq('id', aliceDocumentId);
    expect(data).toEqual([]);
  });

  it('cannot read document revisions', async () => {
    const { data } = await bob!.client
      .from('document_revisions')
      .select('id')
      .eq('id', aliceDocumentRevisionId);
    expect(data).toEqual([]);
  });

  it('cannot read attachments', async () => {
    const { data } = await bob!.client.from('attachments').select('id').eq('id', aliceAttachmentId);
    expect(data).toEqual([]);
  });

  it('cannot update the project', async () => {
    await bob!.client.from('projects').update({ title: 'hijacked' }).eq('id', aliceProjectId);

    const { data } = await alice!.client
      .from('projects')
      .select('title')
      .eq('id', aliceProjectId)
      .single();
    expect(data!.title).toBe('Custom EV bike');
  });

  it('cannot delete the project', async () => {
    await bob!.client.from('projects').delete().eq('id', aliceProjectId);

    const { data } = await alice!.client.from('projects').select('id').eq('id', aliceProjectId);
    expect(data).toHaveLength(1);
  });

  it("cannot insert a row into another user's project", async () => {
    const { error } = await bob!.client.from('entries').insert({
      project_id: aliceProjectId,
      owner_id: bob!.id,
      kind: 'note',
      body: 'intrusion',
    });
    expect(error?.code).toBe('42501');
  });

  it('cannot forge ownership by setting owner_id to the victim', async () => {
    const { error } = await bob!.client.from('entries').insert({
      project_id: aliceProjectId,
      owner_id: alice!.id,
      kind: 'note',
      body: 'forged',
    });
    expect(error?.code).toBe('42501');
  });

  // The test above sets both owner_id and project_id to values that fail
  // independently, so it cannot tell you which half of the insert check did
  // the blocking — delete `owner_id = auth.uid()` from every insert policy
  // and it would stay green. This one isolates the owner_id half: the
  // parent-project check passes (it's Bob's own project), so only forged
  // ownership can be responsible for the rejection.
  it('cannot forge ownership when inserting into their own project', async () => {
    const { error } = await bob!.client.from('entries').insert({
      project_id: bobProjectId,
      owner_id: alice!.id,
      kind: 'note',
      body: "forged, but at least it's my own project",
    });
    expect(error?.code).toBe('42501');
  });

  it("cannot insert a document revision into another user's project", async () => {
    const { error } = await bob!.client.from('document_revisions').insert({
      document_id: aliceDocumentId,
      project_id: aliceProjectId,
      owner_id: bob!.id,
      title: 'hijacked revision',
      body: 'intrusion',
    });
    expect(error?.code).toBe('42501');
  });

  it("cannot insert an attachment into another user's project", async () => {
    const { error } = await bob!.client.from('attachments').insert({
      project_id: aliceProjectId,
      owner_id: bob!.id,
      entry_id: aliceEntryId,
      storage_path: 'ev-bike/intrusion.pdf',
      mime_type: 'application/pdf',
      byte_size: 1,
    });
    expect(error?.code).toBe('42501');
  });
});

describe('public projects are readable, private projects stay hidden', () => {
  it('a stranger can read a public project', async () => {
    const { data } = await bob!.client.from('projects').select('id').eq('id', alicePublicProjectId);
    expect(data).toHaveLength(1);
  });

  it('a stranger can read entries under a public project', async () => {
    const { data } = await bob!.client.from('entries').select('id').eq('id', alicePublicEntryId);
    expect(data).toHaveLength(1);
  });

  it("the public branch does not leak a different private project's rows", async () => {
    const { data } = await bob!.client
      .from('entries')
      .select('id')
      .eq('project_id', aliceProjectId);
    expect(data).toEqual([]);
  });
});

describe("a row's project_id cannot be relocated across owners", () => {
  it("the owner cannot move their own entry into another user's project", async () => {
    const { error } = await alice!.client
      .from('entries')
      .update({ project_id: bobProjectId })
      .eq('id', aliceEntryId);
    expect(error?.code).toBe('42501');

    const { data } = await alice!.client
      .from('entries')
      .select('project_id')
      .eq('id', aliceEntryId)
      .single();
    expect(data!.project_id).toBe(aliceProjectId);
  });
});

describe('composite foreign keys guard against a mismatched project_id', () => {
  it("rejects a document revision whose project_id disagrees with its document's", async () => {
    // Both projects belong to Alice, so the RLS insert check (parent project
    // owned by the caller) passes for either one — this isolates the
    // composite FK on document_revisions(document_id, project_id) as the
    // thing doing the rejecting, not row-level security.
    const { data: secondProject, error: secondProjectError } = await alice!.client
      .from('projects')
      .insert({
        owner_id: alice!.id,
        slug: 'second-project',
        title: 'A second, unrelated project',
        kind: 'build',
      })
      .select()
      .single();
    if (secondProjectError) throw secondProjectError;

    const { error } = await alice!.client.from('document_revisions').insert({
      document_id: aliceDocumentId,
      project_id: secondProject.id,
      owner_id: alice!.id,
      title: 'mismatched revision',
      body: 'should be rejected by the composite FK',
    });
    expect(error?.code).toBe('23503');
  });
});

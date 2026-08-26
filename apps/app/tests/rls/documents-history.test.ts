import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getRevision, listRevisions, updateDocument } from '@/lib/db/documents';

/**
 * Revision authorship and the compare-and-set, against a real database.
 *
 * Both are behaviours of `apply_document_edit`, a Postgres function holding a
 * row lock. A stubbed client would only prove the stub agrees with the code.
 */

let alice: TestUser | undefined;
let projectId: string;
let agentId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as Record<string, unknown> & { id: string };
};

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`docs-${Date.now()}@example.test`);

  projectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
      kind: 'build',
    })
  ).id;

  agentId = (
    await insert(alice, 'agents', {
      project_id: projectId,
      owner_id: alice.id,
      slug: 'tutor',
      name: 'Tutor',
      system_prompt: 'Draft things.',
      tools: ['read_document'],
    })
  ).id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
});

describe('revision authorship', () => {
  it('records the agent that wrote the body being replaced', async () => {
    // The document's current body was written by an agent; replacing it must
    // preserve that fact on the revision, not on the new body.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Build notes',
      body: 'Agent wrote this.',
      agent_id: agentId,
    });

    const updated = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'The owner rewrote it.' },
      agentId: null,
      expectedUpdatedAt: document.updated_at as string,
    });
    expect(updated).not.toBeNull();

    const revisions = await listRevisions(client(), projectId, document.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0].agent_id).toBe(agentId);

    const preserved = await getRevision(client(), projectId, revisions[0].id);
    expect(preserved!.body).toBe('Agent wrote this.');

    // And the document itself is now human-authored.
    expect(updated!.agent_id).toBeNull();
  });

  it('records a null author when a person wrote the replaced body', async () => {
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Human notes',
      body: 'The owner wrote this.',
    });

    await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Rewritten.' },
      expectedUpdatedAt: document.updated_at as string,
    });

    const revisions = await listRevisions(client(), projectId, document.id);
    expect(revisions[0].agent_id).toBeNull();
  });
});

describe('the compare-and-set a human edit relies on', () => {
  it('refuses a save based on a version that has moved', async () => {
    // Two tabs, one stale. The loser must be told, not silently win.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Contended',
      body: 'Version one.',
    });
    const staleVersion = document.updated_at as string;

    const first = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Saved by the first tab.' },
      expectedUpdatedAt: staleVersion,
    });
    expect(first).not.toBeNull();

    const second = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Saved by the stale tab.' },
      expectedUpdatedAt: staleVersion,
    });
    expect(second).toBeNull();

    const { data: after } = await alice!.client
      .from('documents')
      .select('body')
      .eq('id', document.id)
      .single();
    expect(after!.body).toBe('Saved by the first tab.');
  });

  it('restoring an old body makes the current one a revision in turn', async () => {
    // This is what makes restore reversible by repeating it.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Round trip',
      body: 'Original.',
    });

    const edited = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Edited.' },
      expectedUpdatedAt: document.updated_at as string,
    });

    // The list carries no bodies — restoring reads the one revision it needs.
    const [summary] = await listRevisions(client(), projectId, document.id);
    const original = await getRevision(client(), projectId, summary.id);
    expect(original!.body).toBe('Original.');

    await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: original!.body },
      expectedUpdatedAt: edited!.updated_at,
    });

    const revisions = await listRevisions(client(), projectId, document.id);
    const bodies = await Promise.all(
      revisions.map(async (r) => (await getRevision(client(), projectId, r.id))!.body)
    );
    expect(bodies).toEqual(['Edited.', 'Original.']);
  });
});

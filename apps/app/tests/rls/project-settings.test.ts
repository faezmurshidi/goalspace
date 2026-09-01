import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { deleteProject, getProjectBySlug, updateProject } from '@/lib/db/projects';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let slug: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`proj-settings-${Date.now()}@example.test`);
  bob = await createTestUser(`proj-bob-${Date.now()}@example.test`);
  slug = `robot-${Date.now()}`;

  const { data, error } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug, kind: 'build' })
    .select()
    .single();
  if (error) throw error;
  projectId = data.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('updateProject', () => {
  // The values object carries `id` because updateProjectSchema requires it —
  // this is the payload the action actually sends, so the test must send it
  // too, or it exercises a shape that never occurs and does not typecheck.
  it('changes title, brief and status', async () => {
    const updated = await updateProject(client(), {
      id: projectId,
      ownerId: alice!.id,
      values: { id: projectId, title: 'Desk robot', brief: 'Sits on a desk.', status: 'paused' },
    });
    expect(updated?.title).toBe('Desk robot');
    expect(updated?.status).toBe('paused');
  });

  it('leaves the slug alone', async () => {
    const after = await getProjectBySlug(client(), alice!.id, slug);
    expect(after?.slug).toBe(slug);
  });

  it('ignores an id in the payload that disagrees with the row being updated', async () => {
    // A client that sends someone else's id must not steer the write. The row
    // is chosen by the id argument; the payload's id is discarded.
    const other = '22222222-2222-4222-8222-222222222222';
    const updated = await updateProject(client(), {
      id: projectId,
      ownerId: alice!.id,
      values: { id: other, title: 'Still mine', brief: '', status: 'active' },
    });
    expect(updated?.id).toBe(projectId);
    expect(updated?.title).toBe('Still mine');
  });

  it('returns null for a project this caller cannot write', async () => {
    // Bob passes ALICE's ownerId, so the explicit .eq('owner_id') filter
    // cannot be what refuses this — RLS has to. Passing bob's own id would
    // make the test pass even with RLS disabled.
    //
    // Read the title immediately before the refused write and compare
    // against the same title read after, rather than asserting a literal:
    // this test must prove "a refused write changes nothing" on its own,
    // regardless of what any earlier test in this file did or did not set
    // the title to.
    const before = await getProjectBySlug(client(), alice!.id, slug);

    const updated = await updateProject(bob!.client as never, {
      id: projectId,
      ownerId: alice!.id,
      values: { id: projectId, title: 'Bob was here', brief: '', status: 'active' },
    });
    expect(updated).toBeNull();

    const after = await getProjectBySlug(client(), alice!.id, slug);
    expect(after?.title).toBe(before?.title);
  });
});

describe('deleteProject', () => {
  it('refuses a caller who does not own it, and leaves it standing', async () => {
    // Again with alice's ownerId, so RLS is what refuses.
    const removed = await deleteProject(bob!.client as never, {
      id: projectId,
      ownerId: alice!.id,
    });
    expect(removed).toBe(false);
    expect(await getProjectBySlug(client(), alice!.id, slug)).not.toBeNull();
  });

  it('deletes the owner’s own project and cascades across the whole graph', async () => {
    // One row per cascading table, including the three with the more involved
    // foreign-key graph — a run, its usage, and a proposal — because those are
    // the ones a cascade is most likely to trip over, and §6.4 names them.
    const { data: entry } = await alice!.client
      .from('entries')
      .insert({ project_id: projectId, owner_id: alice!.id, kind: 'note', body: 'x' })
      .select()
      .single();
    const { data: doc } = await alice!.client
      .from('documents')
      .insert({ project_id: projectId, owner_id: alice!.id, title: 'D', body: 'x' })
      .select()
      .single();
    const { data: agent } = await alice!.client
      .from('agents')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        slug: 'critic',
        name: 'Critic',
        system_prompt: 'Review.',
        model: 'openai/gpt-4o-mini',
      })
      .select()
      .single();
    const { data: run } = await alice!.client
      .from('agent_runs')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        agent_id: agent!.id,
        trigger: 'conversation',
        status: 'succeeded',
      })
      .select()
      .single();
    const { data: usage } = await alice!.client
      .from('ai_usage')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        run_id: run!.id,
        model: 'openai/gpt-4o-mini',
        cost_usd: 0.5,
      })
      .select()
      .single();
    const { data: proposal } = await alice!.client
      .from('proposals')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        agent_id: agent!.id,
        run_id: run!.id,
        kind: 'entry',
        payload: { kind: 'note', body: 'x' },
        rationale: 'because',
      })
      .select()
      .single();

    expect(await deleteProject(client(), { id: projectId, ownerId: alice!.id })).toBe(true);
    expect(await getProjectBySlug(client(), alice!.id, slug)).toBeNull();

    for (const [table, id] of [
      ['entries', entry!.id],
      ['documents', doc!.id],
      ['agents', agent!.id],
      ['agent_runs', run!.id],
      ['ai_usage', usage!.id],
      ['proposals', proposal!.id],
    ] as const) {
      const { data } = await alice!.client.from(table).select('id').eq('id', id);
      expect({ table, rows: data }).toEqual({ table, rows: [] });
    }
  });
});

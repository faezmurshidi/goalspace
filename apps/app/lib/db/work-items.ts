import type { SupabaseClient } from '@supabase/supabase-js';

import type { WorkItemKind, WorkItemStatus } from '@/lib/schemas/common';
import type { ChangeStatusValues, CreateWorkItemValues } from '@/lib/schemas/work-item';
import type { Database, Tables } from '@/types/supabase';
import { createEntry } from './entries';

type Client = SupabaseClient<Database>;

export type WorkItem = Omit<Tables<'work_items'>, 'kind' | 'status'> & {
  kind: WorkItemKind;
  status: WorkItemStatus;
};

const WORK_ITEM_COLUMNS =
  'id, project_id, owner_id, agent_id, parent_id, order_index, kind, status, title, body, wake_at, closed_by_entry_id, created_at, updated_at, status_changed_at, closed_at';

/** Statuses that close an item, and so stamp `closed_at`. */
const CLOSING_STATUSES: readonly WorkItemStatus[] = ['done', 'dropped'];

/**
 * The whole tree for a project, flat.
 *
 * Deliberately unpaginated: `buildTree` and `computeProgress` are defined over
 * the complete set, and a partial fetch would silently produce wrong progress
 * ratios rather than an error. Trees at this scale are hundreds of rows, not
 * millions.
 */
export async function listWorkItems(supabase: Client, projectId: string): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from('work_items')
    .select(WORK_ITEM_COLUMNS)
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkItem[];
}

export async function getWorkItem(
  supabase: Client,
  projectId: string,
  id: string
): Promise<WorkItem | null> {
  const { data, error } = await supabase
    .from('work_items')
    .select(WORK_ITEM_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as WorkItem) ?? null;
}

/** The most recent status change, used alongside the latest entry to measure absence. */
export async function getLatestStatusChangeAt(
  supabase: Client,
  projectId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('work_items')
    .select('status_changed_at')
    .eq('project_id', projectId)
    .order('status_changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.status_changed_at ?? null;
}

export async function createWorkItem(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: CreateWorkItemValues;
    /** Provenance, as on createEntry. Null means human-authored. */
    agentId?: string | null;
  }
): Promise<WorkItem> {
  const { projectId, ownerId, values, agentId = null } = params;

  // New siblings go last. Computed rather than defaulted to 0, because a
  // default would silently stack every new item at the top of its level and
  // rely on the id tiebreak for an order the user never chose.
  const { data: siblings, error: siblingError } = await supabase
    .from('work_items')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (siblingError) throw siblingError;

  const { data, error } = await supabase
    .from('work_items')
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      agent_id: agentId,
      title: values.title,
      body: values.body ?? '',
      kind: values.kind,
      parent_id: values.parent_id,
      wake_at: values.wake_at,
      order_index: (siblings?.order_index ?? -1) + 1,
    })
    .select(WORK_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data as WorkItem;
}

/**
 * Change status, optionally recording the entry that closed the item.
 *
 * Write order matters and is not arbitrary. The entry goes in first, because
 * it is the thing the user typed, and losing captured text is the worst
 * failure this product has. If the status update then fails, the result is an
 * entry in the log and an item still open: visible, recoverable, and honest.
 * The reverse order could close the item and lose the writing that justified
 * it, which is silent and unrecoverable.
 *
 * These are two statements rather than one transaction because PostgREST has
 * no multi-statement transaction. Making it atomic would mean a database
 * function, which moves this logic out of TypeScript where it is testable and
 * inspectable; the failure mode above is mild enough not to be worth that.
 */
export async function changeWorkItemStatus(
  supabase: Client,
  params: { projectId: string; ownerId: string; values: ChangeStatusValues }
): Promise<WorkItem> {
  const { projectId, ownerId, values } = params;

  let closingEntryId: string | null = null;
  if (values.closingEntryBody) {
    const entry = await createEntry(supabase, {
      projectId,
      ownerId,
      values: {
        kind: 'session',
        body: values.closingEntryBody,
        title: null,
        work_item_id: values.id,
      },
    });
    closingEntryId = entry.id;
  }

  const now = new Date().toISOString();
  const patch: Database['public']['Tables']['work_items']['Update'] = {
    status: values.status,
    // Set here rather than by a trigger so the write path stays inspectable in
    // TypeScript, per the spec. "Blocked" is a fact; "blocked since March" is
    // the version that makes someone act, and this column is what renders it.
    status_changed_at: now,
    closed_at: CLOSING_STATUSES.includes(values.status) ? now : null,
    // Reopening has to drop the closing reference too. Clearing closed_at
    // alone leaves a row that is open but still points at the entry that once
    // closed it, so any read treating that column as proof of closure
    // disagrees with `status`.
    ...(CLOSING_STATUSES.includes(values.status) ? {} : { closed_by_entry_id: null }),
  };

  if (closingEntryId) patch.closed_by_entry_id = closingEntryId;

  // Leaving `blocked` clears the wake date, so a finished item cannot
  // resurface later on the resume view as something still being waited on.
  if (values.status !== 'blocked') patch.wake_at = null;
  else if (values.wake_at !== undefined) patch.wake_at = values.wake_at;

  const { data, error } = await supabase
    .from('work_items')
    .update(patch)
    .eq('id', values.id)
    .eq('project_id', projectId)
    .select(WORK_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data as WorkItem;
}

export async function updateWorkItem(
  supabase: Client,
  params: {
    projectId: string;
    id: string;
    patch: { title?: string; body?: string | null; kind?: WorkItemKind; wake_at?: string | null };
  }
): Promise<WorkItem> {
  const { projectId, id, patch } = params;

  const { data, error } = await supabase
    .from('work_items')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body ?? '' } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.wake_at !== undefined ? { wake_at: patch.wake_at } : {}),
    })
    .eq('id', id)
    .eq('project_id', projectId)
    .select(WORK_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data as WorkItem;
}

/**
 * Reparent and reorder.
 *
 * The ancestor walk is the cycle guard. Postgres cannot express "no cycles"
 * declaratively, and a recursive trigger would cost more than it saves for
 * trees this size, so the check lives here and `tree.ts` treats any cycle that
 * still reaches it as corrupt data.
 */
export async function moveWorkItem(
  supabase: Client,
  params: { projectId: string; id: string; parentId: string | null; orderIndex: number }
): Promise<WorkItem> {
  const { projectId, id, parentId, orderIndex } = params;

  if (parentId !== null) {
    if (parentId === id) {
      throw new Error('A work item cannot be its own parent.');
    }

    const all = await listWorkItems(supabase, projectId);
    const parentOf = new Map(all.map((item) => [item.id, item.parent_id]));

    // The composite foreign key already refuses a parent from another project,
    // but it surfaces as an opaque constraint violation. Checking here turns
    // that into a message, and stops the walk below from silently treating an
    // unknown id as a root.
    if (!parentOf.has(parentId)) {
      throw new Error('That parent work item is not part of this project.');
    }

    // Walk up from the proposed parent. Meeting the moving item means the move
    // would close a loop. The step cap is a backstop against pre-existing
    // corrupt data, so a bad row cannot hang the request.
    let cursor: string | null = parentId;
    for (let steps = 0; cursor !== null && steps <= all.length; steps += 1) {
      if (cursor === id) {
        throw new Error('That move would put a work item inside its own subtree.');
      }
      cursor = parentOf.get(cursor) ?? null;
    }
  }

  const { data, error } = await supabase
    .from('work_items')
    .update({ parent_id: parentId, order_index: orderIndex })
    .eq('id', id)
    .eq('project_id', projectId)
    .select(WORK_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data as WorkItem;
}

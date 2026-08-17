import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { EntryKind } from '@/lib/schemas/common';
import type { CreateEntryValues } from '@/lib/schemas/entry';

type Client = SupabaseClient<Database>;

export type Entry = Omit<Tables<'entries'>, 'kind'> & { kind: EntryKind };

const ENTRY_COLUMNS =
  'id, project_id, owner_id, agent_id, kind, title, body, occurred_at, created_at, updated_at, work_item_id';

export interface ListEntriesOptions {
  /** Restrict to these kinds. Omit or pass an empty array for all of them. */
  kinds?: readonly EntryKind[];
  /** Only entries attached to this work item, for the per-area timeline. */
  workItemId?: string;
  limit?: number;
  /** Rows to skip, for the log's pagination. */
  offset?: number;
}

/**
 * The log, newest first.
 *
 * Ordered by `occurred_at` rather than `created_at`, because entries can be
 * backdated and the timeline is about when work happened, not when it was
 * typed. `id` breaks ties so that pagination cannot show or skip a row when
 * several entries share a timestamp, which is common right after a bulk
 * capture.
 */
export async function listEntries(
  supabase: Client,
  projectId: string,
  options: ListEntriesOptions = {}
): Promise<Entry[]> {
  const { kinds, workItemId, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  if (kinds && kinds.length > 0) query = query.in('kind', kinds as unknown as string[]);
  if (workItemId) query = query.eq('work_item_id', workItemId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Entry[];
}

/** The single most recent entry, used to measure how long the project sat. */
export async function getLatestEntryAt(
  supabase: Client,
  projectId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('occurred_at')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.occurred_at ?? null;
}

export async function createEntry(
  supabase: Client,
  params: { projectId: string; ownerId: string; values: CreateEntryValues }
): Promise<Entry> {
  const { projectId, ownerId, values } = params;

  const { data, error } = await supabase
    .from('entries')
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      kind: values.kind,
      title: values.title,
      body: values.body,
      work_item_id: values.work_item_id,
      // Omitted rather than defaulted in TypeScript, so the column default
      // (now(), on the database clock) applies. Using the server's clock here
      // would drift against every other timestamp in the row.
      ...(values.occurred_at ? { occurred_at: values.occurred_at } : {}),
    })
    .select(ENTRY_COLUMNS)
    .single();

  if (error) throw error;
  return data as Entry;
}

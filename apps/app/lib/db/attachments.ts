import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type Attachment = Tables<'attachments'>;

const COLUMNS =
  'id, project_id, owner_id, entry_id, document_id, storage_path, mime_type, byte_size, created_at';

export const ATTACHMENTS_BUCKET = 'attachments';

/**
 * Where an object lives in the bucket.
 *
 * The first segment is the owner's uuid because storage RLS checks exactly
 * that: `(storage.foldername(name))[1] = auth.uid()::text`. Getting this wrong
 * does not produce a mis-filed object, it produces a refused upload.
 *
 * The project id is next so a project's files are enumerable and, one day,
 * removable together — `deleteProject` cascades the rows and leaves the objects
 * behind, which this layout at least makes fixable.
 *
 * The stored name is prefixed with a random id: two photographs of a lathe are
 * both called IMG_1024.jpg, and the second must not replace the first.
 */
export function storagePathFor(params: {
  ownerId: string;
  projectId: string;
  filename: string;
}): string {
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  return `${params.ownerId}/${params.projectId}/${crypto.randomUUID()}-${safe}`;
}

/** The display name, recovered from a stored path. */
export function filenameFrom(storagePath: string): string {
  const base = storagePath.split('/').pop() ?? storagePath;
  // Strip the uuid prefix and its separating hyphen.
  return base.replace(/^[0-9a-f-]{36}-/i, '');
}

export async function listAttachments(
  supabase: Client,
  params: { documentId?: string; entryId?: string }
): Promise<Attachment[]> {
  let query = supabase.from('attachments').select(COLUMNS).order('created_at', { ascending: true });

  if (params.documentId) query = query.eq('document_id', params.documentId);
  else if (params.entryId) query = query.eq('entry_id', params.entryId);
  else return [];

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function recordAttachment(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    documentId?: string | null;
    entryId?: string | null;
    storagePath: string;
    mimeType: string;
    byteSize: number;
  }
): Promise<Attachment> {
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: params.projectId,
      owner_id: params.ownerId,
      // The table's own check constraint requires exactly one of these, which
      // is why both are passed explicitly rather than spread conditionally: a
      // silently omitted key would read as null either way, and stating both
      // makes the intent legible next to the constraint that enforces it.
      document_id: params.documentId ?? null,
      entry_id: params.entryId ?? null,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      byte_size: params.byteSize,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data as Attachment;
}

export async function deleteAttachment(
  supabase: Client,
  id: string
): Promise<{ storagePath: string } | null> {
  const { data, error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)
    .select('storage_path')
    .maybeSingle();

  if (error) throw error;
  return data ? { storagePath: data.storage_path } : null;
}

/**
 * A time-limited URL for a private object.
 *
 * The bucket is not public, so nothing can be linked to directly. An hour is
 * long enough to read a page and short enough that a copied URL is not a
 * lasting leak.
 */
export async function signedUrlFor(supabase: Client, storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) return null;
  return data?.signedUrl ?? null;
}

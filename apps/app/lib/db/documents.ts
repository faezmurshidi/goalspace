import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { CreateDocumentValues, UpdateDocumentValues } from '@/lib/schemas/document';

type Client = SupabaseClient<Database>;

export type Document = Omit<Tables<'documents'>, 'search_tsv'>;

const DOCUMENT_COLUMNS = 'id, project_id, owner_id, agent_id, title, body, created_at, updated_at';

export async function listDocuments(supabase: Client, projectId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getDocument(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Document | null;
}

export async function createDocument(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: CreateDocumentValues;
    agentId?: string | null;
  }
): Promise<Document> {
  const { projectId, ownerId, values, agentId = null } = params;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      agent_id: agentId,
      title: values.title,
      body: values.body,
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Update a document, keeping what it said before.
 *
 * The work happens in `apply_document_edit`, a single transaction that takes a
 * row lock, checks the version, records the body being replaced, and writes
 * the new one. Doing those as separate round trips cannot be made correct: put
 * the revision first and a losing edit leaves a revision for a change that
 * never applied; put it second and a failed insert loses the previous body
 * altogether. The lock removes the choice.
 *
 * `expectedUpdatedAt` omitted means "no expectation" — the first-party edit
 * shape, where nothing was read in advance to be stale against.
 *
 * Returns null when the document is gone or has moved, which the caller
 * reports as superseded.
 */
export async function updateDocument(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: UpdateDocumentValues;
    agentId?: string | null;
    expectedUpdatedAt?: string;
  }
): Promise<Document | null> {
  const { projectId, ownerId, values, agentId = null, expectedUpdatedAt } = params;

  const { data: appliedId, error } = await supabase.rpc('apply_document_edit', {
    p_document_id: values.id,
    p_project_id: projectId,
    p_owner_id: ownerId,
    // Null means human-authored. Set on every update, so the column describes
    // the current body's author rather than the last agent ever to touch it.
    p_agent_id: agentId as string,
    p_expected_updated_at: (expectedUpdatedAt ?? null) as string,
    p_title: (values.title ?? null) as string,
    p_body: (values.body ?? null) as string,
  });

  if (error) throw error;
  if (!appliedId) return null;

  return getDocument(supabase, projectId, appliedId);
}

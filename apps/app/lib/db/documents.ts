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
 * `expectedUpdatedAt` is a compare-and-set, not an optimisation. Reading the
 * document, deciding it is current, and then updating by id alone lets two
 * edits based on the same version both pass that check and overwrite each
 * other — and the first body written never becomes a revision, so it is gone
 * from the history that exists to make edits reversible. The guard is on the
 * update itself, so the loser matches no row and is told.
 *
 * The revision is written *first* and records the state being replaced. If the
 * guarded update then matches nothing, that revision duplicates the current
 * body: a tidy-up cost, against the alternative of losing the previous body
 * entirely when the insert is what fails.
 *
 * Returns null when the version moved, which the caller reports as superseded.
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

  const current = await getDocument(supabase, projectId, values.id);
  if (!current) return null;
  if (expectedUpdatedAt !== undefined && current.updated_at !== expectedUpdatedAt) return null;

  const { error: revisionError } = await supabase.from('document_revisions').insert({
    document_id: current.id,
    project_id: projectId,
    owner_id: ownerId,
    title: current.title,
    body: current.body,
  });
  if (revisionError) throw revisionError;

  let query = supabase
    .from('documents')
    .update({
      ...(values.title !== undefined ? { title: values.title } : {}),
      ...(values.body !== undefined ? { body: values.body } : {}),
      // Null means human-authored. An agent-applied edit stamps the agent that
      // proposed it; a human edit clears it back to null, so the column always
      // describes the *current* body rather than the last agent to touch it.
      agent_id: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('id', values.id);

  // The compare-and-set. Between the read above and this write another edit
  // can land; matching on the version we read is what makes the loser lose.
  if (expectedUpdatedAt !== undefined) query = query.eq('updated_at', expectedUpdatedAt);

  const { data, error } = await query.select(DOCUMENT_COLUMNS).maybeSingle();

  if (error) throw error;
  return (data ?? null) as Document | null;
}

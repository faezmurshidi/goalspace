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
 * The revision is written *first*, and it records the state being replaced
 * rather than the state being written. Ordering it this way means a failure
 * between the two statements leaves a redundant revision, which costs a row;
 * the other order would lose the previous body, which costs the undo path
 * this whole table exists to provide.
 *
 * This is what makes an accepted agent edit safe to accept: the owner can
 * always get back to what they wrote themselves.
 */
export async function updateDocument(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: UpdateDocumentValues;
    agentId?: string | null;
  }
): Promise<Document> {
  const { projectId, ownerId, values, agentId = null } = params;

  const current = await getDocument(supabase, projectId, values.id);
  if (!current) throw new Error(`Document ${values.id} not found in this project`);

  const { error: revisionError } = await supabase.from('document_revisions').insert({
    document_id: current.id,
    project_id: projectId,
    owner_id: ownerId,
    title: current.title,
    body: current.body,
  });
  if (revisionError) throw revisionError;

  const { data, error } = await supabase
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
    .eq('id', values.id)
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) throw error;
  return data as Document;
}

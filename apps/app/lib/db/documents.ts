import type { SupabaseClient } from '@supabase/supabase-js';

import type { CreateDocumentValues, UpdateDocumentValues } from '@/lib/schemas/document';
import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type Document = Omit<Tables<'documents'>, 'search_tsv'>;

const DOCUMENT_COLUMNS =
  'id, project_id, owner_id, agent_id, title, body, created_at, updated_at, synthesised_through';

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

export type DocumentRevision = Tables<'document_revisions'>;

/**
 * A revision as the history list needs it: everything but the body.
 *
 * One revision is written per save, so a long-lived document accumulates them
 * without bound. Carrying every superseded body into a list that renders none
 * of them would make the page cost grow with the document's whole edit history.
 */
export type DocumentRevisionSummary = Omit<DocumentRevision, 'body'>;

const REVISION_COLUMNS = 'id, document_id, project_id, owner_id, title, body, agent_id, created_at';

const REVISION_LIST_COLUMNS = 'id, document_id, project_id, owner_id, title, agent_id, created_at';

/**
 * A document's history, newest first.
 *
 * Each row is a body that was replaced, so the list reads as "what it said
 * before" — the newest revision is the body immediately prior to the current
 * one, not the current one itself. Use `getRevision` to read one body.
 */
export async function listRevisions(
  supabase: Client,
  projectId: string,
  documentId: string
): Promise<DocumentRevisionSummary[]> {
  const { data, error } = await supabase
    .from('document_revisions')
    .select(REVISION_LIST_COLUMNS)
    .eq('project_id', projectId)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRevisionSummary[];
}

export async function getRevision(
  supabase: Client,
  projectId: string,
  revisionId: string
): Promise<DocumentRevision | null> {
  const { data, error } = await supabase
    .from('document_revisions')
    .select(REVISION_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', revisionId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DocumentRevision | null;
}

/**
 * Every entry's occurred_at for a project, newest first.
 *
 * One query rather than one per document, because the list page renders all of
 * them and a count-per-row would be a query-per-row. Timestamps only: the
 * counter needs nothing else, and pulling bodies to count them would make the
 * page cost grow with the size of the log rather than its length.
 */
export async function listEntryTimes(supabase: Client, projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('occurred_at')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => row.occurred_at);
}

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Citation, ProposalKind } from '@/lib/schemas/proposal';
import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

/**
 * The generated types widen the check-constrained columns to `string` and the
 * jsonb columns to `Json`. Narrowed here rather than at each call site: the
 * CHECK constraints guarantee kind and status, and `citations` is written by
 * exactly one function — storeProposal — which validates through
 * citationsSchema first.
 */
export type Proposal = Omit<Tables<'proposals'>, 'kind' | 'status' | 'citations'> & {
  kind: ProposalKind;
  status: 'pending' | 'accepted' | 'rejected' | 'superseded';
  citations: Citation[];
};

export const PROPOSAL_COLUMNS =
  'id, project_id, owner_id, agent_id, run_id, kind, target_id, payload, rationale, citations, status, edited, applied_id, created_at, decided_at';

export async function listPendingProposals(
  supabase: Client,
  projectId: string
): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Proposal[];
}

/**
 * All proposals a run produced, oldest first — the run trace's proposal
 * section. Ascending for the same reason `listToolCalls` is: it is a
 * narrative of what the run did, not a list of what changed.
 */
export async function listRunProposals(supabase: Client, runId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Proposal[];
}

/**
 * Pending counts for every project the caller owns, in one round trip.
 *
 * The nav needs a badge per project and there is no sensible per-project query
 * to run from a component that renders them all. RLS scopes the read to the
 * owner, so counting client-side over the returned ids is safe and costs one
 * request instead of one per project.
 */
export async function countPendingByProject(supabase: Client): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('proposals')
    .select('project_id')
    .eq('status', 'pending');

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Pending count for a single project. The single-project counterpart to
 * `countPendingByProject`, which stays as-is because the nav badge genuinely
 * needs every project in one round trip. A head-only exact count, so no rows
 * travel for a number the caller is about to discard down to one integer.
 */
export async function countPendingProposals(supabase: Client, projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}

export async function getProposal(supabase: Client, id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as Proposal | null;
}

/**
 * Take a pending proposal off the board before applying it.
 *
 * The `eq('status', 'pending')` guard is the whole point: it makes the claim
 * conditional, so two tabs racing to accept the same proposal produce one
 * winner and one no-op instead of two entries. Returns null when the claim
 * lost, which the caller reports rather than treating as an error.
 */
export async function claimProposal(supabase: Client, id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .update({ status: 'accepted', decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select(PROPOSAL_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as Proposal | null;
}

/**
 * Put a claimed proposal back, for when applying it failed.
 *
 * Guarded on 'accepted' — the state claimProposal leaves behind. Without the
 * guard a late release could resurrect a proposal that some other request had
 * already settled, putting a decided suggestion back in the inbox.
 */
export async function releaseProposal(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('proposals')
    .update({ status: 'pending', decided_at: null })
    .eq('id', id)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/**
 * Move a proposal to its final state.
 *
 * `from` is required rather than optional because every transition here has
 * exactly one legal predecessor, and updating by id alone let a stale request
 * flip an already-applied proposal to 'rejected' — leaving a real row in the
 * log whose proposal claims it was refused. Returns false when the guard
 * matched nothing, which the caller reports rather than ignoring.
 */
export async function settleProposal(
  supabase: Client,
  id: string,
  status: 'accepted' | 'rejected' | 'superseded',
  params: { from: 'pending' | 'accepted'; appliedId?: string | null; edited?: boolean }
): Promise<boolean> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status,
      decided_at: new Date().toISOString(),
      ...(params.appliedId !== undefined ? { applied_id: params.appliedId } : {}),
      ...(params.edited !== undefined ? { edited: params.edited } : {}),
    })
    .eq('id', id)
    .eq('status', params.from)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

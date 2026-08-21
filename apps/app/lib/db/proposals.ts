import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { Citation, ProposalKind } from '@/lib/schemas/proposal';

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

const PROPOSAL_COLUMNS =
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

/** Put a claimed proposal back, for when applying it failed. */
export async function releaseProposal(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'pending', decided_at: null })
    .eq('id', id);

  if (error) throw error;
}

export async function settleProposal(
  supabase: Client,
  id: string,
  status: 'accepted' | 'rejected' | 'superseded',
  params: { appliedId?: string | null; edited?: boolean } = {}
): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({
      status,
      decided_at: new Date().toISOString(),
      ...(params.appliedId !== undefined ? { applied_id: params.appliedId } : {}),
      ...(params.edited !== undefined ? { edited: params.edited } : {}),
    })
    .eq('id', id);

  if (error) throw error;
}

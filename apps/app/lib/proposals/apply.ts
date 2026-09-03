import type { SupabaseClient } from '@supabase/supabase-js';

import { payloadSchemaFor } from '@/lib/schemas/proposal';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type ApplyOutcome =
  | { status: 'applied'; appliedId: string }
  | { status: 'superseded' }
  | { status: 'gone' }
  | { status: 'invalid'; message: string };

/**
 * Accept a proposal and produce the real row.
 *
 * Everything after validation happens inside `apply_proposal`, in one
 * transaction: the proposal is locked, the row is created, and the proposal is
 * settled with the new id. There is no longer a moment where one of those has
 * happened and the others have not.
 *
 * What this replaced was four round trips — claim, insert, settle, and release
 * on failure — with an unprotected window between the insert and the settle. A
 * connection lost there left the created row in place and the proposal back in
 * the inbox looking undecided, so accepting it again produced a second row.
 * That could not be fixed at this layer: there is no ordering of four separate
 * statements that is safe without a transaction around them.
 *
 * The payload is validated here rather than in the database, and validated
 * again even though the tool validated it at propose time, because the owner
 * may have edited it in the inbox. That edited payload is what applies, and
 * `edited` records that it was not the agent's words that landed.
 */
export async function applyProposal(
  supabase: Client,
  params: {
    proposalId: string;
    ownerId: string;
    payloadOverride?: unknown;
  }
): Promise<ApplyOutcome> {
  // Read only to learn the kind, which selects the schema. The value is not
  // trusted for anything else — the function re-reads the proposal under its
  // own lock, so a row that changed in between is caught there rather than
  // acted on from this snapshot.
  const { data: proposal, error: readError } = await supabase
    .from('proposals')
    .select('kind, payload')
    .eq('id', params.proposalId)
    .maybeSingle();

  if (readError) throw readError;
  if (!proposal) return { status: 'gone' };

  const edited = params.payloadOverride !== undefined;
  const raw = edited ? params.payloadOverride : proposal.payload;

  const parsed = payloadSchemaFor(proposal.kind as never).safeParse(raw);
  if (!parsed.success) return { status: 'invalid', message: 'app.errors.validation' };

  const { data, error } = await supabase.rpc('apply_proposal', {
    p_proposal_id: params.proposalId,
    p_payload: parsed.data as never,
    p_edited: edited,
  });

  if (error) throw error;

  const outcome = data as { status: string; applied_id?: string } | null;
  if (!outcome) return { status: 'gone' };

  if (outcome.status === 'applied' && outcome.applied_id) {
    return { status: 'applied', appliedId: outcome.applied_id };
  }
  if (outcome.status === 'superseded') return { status: 'superseded' };
  return { status: 'gone' };
}

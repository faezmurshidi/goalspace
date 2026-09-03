import type { SupabaseClient } from '@supabase/supabase-js';

import { createDocument, getDocument, updateDocument } from '@/lib/db/documents';
import { createEntry } from '@/lib/db/entries';
import { claimProposal, releaseProposal, settleProposal, type Proposal } from '@/lib/db/proposals';
import { createWorkItem } from '@/lib/db/work-items';
import type { CreateDocumentValues, UpdateDocumentValues } from '@/lib/schemas/document';
import type { CreateEntryValues } from '@/lib/schemas/entry';
import { payloadSchemaFor } from '@/lib/schemas/proposal';
import type { CreateWorkItemValues } from '@/lib/schemas/work-item';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type ApplyOutcome =
  | { status: 'applied'; appliedId: string }
  | { status: 'superseded' }
  | { status: 'gone' }
  | { status: 'invalid'; message: string };

/**
 * Has the document moved since the agent read it?
 *
 * Compared as instants rather than strings, because Postgres renders
 * timestamptz as `2026-08-21 00:00:00+00` while the payload carries an ISO
 * string with a `Z`. Comparing those textually marks every edit stale.
 *
 * An unparseable base is treated as superseded. Failing closed costs the owner
 * a re-run; failing open overwrites their work.
 */
export function isSuperseded(baseUpdatedAt: string, currentUpdatedAt: string): boolean {
  const base = Date.parse(baseUpdatedAt);
  const current = Date.parse(currentUpdatedAt);
  if (Number.isNaN(base) || Number.isNaN(current)) return true;
  return current > base;
}

/**
 * Accept a proposal and produce the real row.
 *
 * Claim first, apply second. The claim is a conditional update that only
 * succeeds from `pending`, so two tabs racing to accept the same proposal
 * yield one entry rather than two; if applying then fails, the claim is
 * released and the proposal returns to the inbox. The alternative ordering —
 * apply then mark — leaves an orphan row behind on any failure between them.
 *
 * The payload is validated again here even though the tool validated it at
 * propose time, because the owner may have edited it in the inbox. That edited
 * payload is what applies, and `edited` records that it was not the agent's
 * words that landed.
 */
export async function applyProposal(
  supabase: Client,
  params: {
    proposalId: string;
    ownerId: string;
    payloadOverride?: unknown;
  }
): Promise<ApplyOutcome> {
  const claimed = await claimProposal(supabase, params.proposalId);
  if (!claimed) return { status: 'gone' };

  const edited = params.payloadOverride !== undefined;
  const raw = edited ? params.payloadOverride : claimed.payload;

  const parsed = payloadSchemaFor(claimed.kind).safeParse(raw);
  if (!parsed.success) {
    await releaseProposal(supabase, claimed.id);
    return { status: 'invalid', message: 'app.errors.validation' };
  }

  try {
    const appliedId = await applyByKind(supabase, claimed, parsed.data, params.ownerId);
    if (appliedId === null) {
      await settleProposal(supabase, claimed.id, 'superseded', { from: 'accepted' });
      return { status: 'superseded' };
    }

    await settleProposal(supabase, claimed.id, 'accepted', { from: 'accepted', appliedId, edited });
    return { status: 'applied', appliedId };
  } catch (error) {
    await releaseProposal(supabase, claimed.id);
    throw error;
  }
}

/** Returns the new row's id, or null when the proposal turned out to be stale. */
async function applyByKind(
  supabase: Client,
  proposal: Proposal,
  payload: unknown,
  ownerId: string
): Promise<string | null> {
  // A switch rather than an if-chain, so that adding a kind to ProposalKind
  // without adding a case here fails to compile instead of silently falling
  // into whichever branch happens to be last. payloadSchemaFor is exhaustive
  // for the same reason; this keeps the two in lockstep.
  switch (proposal.kind) {
    case 'entry': {
      // agent_id is stamped on the insert, not by a follow-up update. It comes
      // from the proposal, never from the payload — the owner edits content in
      // the inbox, not authorship — and doing it in one statement means a failed
      // second write cannot leave an accepted proposal whose entry claims to be
      // human-authored.
      const entry = await createEntry(supabase, {
        projectId: proposal.project_id,
        ownerId,
        values: payload as CreateEntryValues,
        agentId: proposal.agent_id,
      });
      return entry.id;
    }

    case 'work_item': {
      const item = await createWorkItem(supabase, {
        projectId: proposal.project_id,
        ownerId,
        values: payload as CreateWorkItemValues,
        agentId: proposal.agent_id,
      });
      return item.id;
    }

    case 'document': {
      // A create cannot be superseded — there is no prior version to be stale
      // against, which is the whole difference between this kind and
      // document_edit. So no read, no version check, and no null return.
      const document = await createDocument(supabase, {
        projectId: proposal.project_id,
        ownerId,
        values: payload as CreateDocumentValues,
        agentId: proposal.agent_id,
      });
      return document.id;
    }

    case 'document_edit': {
      const edit = payload as { id: string; base_updated_at: string };
      const current = await getDocument(supabase, proposal.project_id, edit.id);
      if (!current) return null;
      if (isSuperseded(edit.base_updated_at, current.updated_at)) return null;

      // The read above answers "is this proposal stale"; expectedUpdatedAt answers
      // "did it go stale while we were deciding". Both are needed: the first gives
      // the owner a truthful superseded, the second stops two proposals built on
      // one version from overwriting each other.
      //
      // updateDocument writes the revision before the update, so this is where
      // phase 1's revision table gives every agent edit its undo path.
      const updated = await updateDocument(supabase, {
        projectId: proposal.project_id,
        ownerId,
        values: payload as UpdateDocumentValues,
        agentId: proposal.agent_id,
        expectedUpdatedAt: current.updated_at,
      });
      return updated?.id ?? null;
    }

    default: {
      // Unreachable as long as ProposalKind and this switch agree. If they
      // ever drift, this line — not a runtime uuid error three calls deep —
      // is where the compiler stops the build.
      const exhaustive: never = proposal.kind;
      throw new Error(`Unhandled proposal kind: ${exhaustive}`);
    }
  }
}

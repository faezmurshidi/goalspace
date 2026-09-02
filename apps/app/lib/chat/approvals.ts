/**
 * Entries the Partner wants to write, waiting on the owner's decision.
 *
 * Read off the message parts: a tool configured for approval reaches the client
 * as `state: 'approval-requested'` carrying the input it intends to run with,
 * and executes only after `addToolApprovalResponse`.
 *
 * This is what lets "agents propose, they never write" stand unamended for
 * record_entry. The earlier design wrote directly and justified it by requiring
 * the agent to cite the message it was transcribing — but a citation constrains
 * only which message is named, never what goes in the body. A person reading the
 * body before it lands is the guarantee the citation was standing in for.
 */
export interface PendingEntry {
  approvalId: string;
  kind: string;
  title: string | null;
  body: string;
}

interface MaybePart {
  type?: string;
  state?: string;
  input?: unknown;
  approval?: { id?: unknown; approved?: unknown };
}

export function approvalRequestsFrom(parts: readonly MaybePart[] | undefined): PendingEntry[] {
  const pending: PendingEntry[] = [];

  for (const part of parts ?? []) {
    if (part?.type !== 'tool-record_entry') continue;
    if (part.state !== 'approval-requested') continue;

    const approvalId = part.approval?.id;
    const payload = (part.input as { payload?: Record<string, unknown> } | undefined)?.payload;
    if (typeof approvalId !== 'string' || !payload) continue;

    const body = typeof payload.body === 'string' ? payload.body : '';
    // An empty body is nothing to decide about, and rendering an approval for it
    // would ask the owner to accept a blank entry.
    if (!body.trim()) continue;

    pending.push({
      approvalId,
      kind: typeof payload.kind === 'string' ? payload.kind : 'note',
      title: typeof payload.title === 'string' ? payload.title : null,
      body,
    });
  }

  return pending;
}

/** Whether a decision has been given, so the composer can say which. */
export function approvalOutcomesFrom(
  parts: readonly MaybePart[] | undefined
): { approvalId: string; approved: boolean }[] {
  const outcomes: { approvalId: string; approved: boolean }[] = [];

  for (const part of parts ?? []) {
    if (part?.type !== 'tool-record_entry') continue;
    const id = part.approval?.id;
    const approved = part.approval?.approved;
    if (typeof id !== 'string' || typeof approved !== 'boolean') continue;
    outcomes.push({ approvalId: id, approved });
  }

  return outcomes;
}

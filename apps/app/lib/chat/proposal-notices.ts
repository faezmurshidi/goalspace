/**
 * What a delegated run actually filed, read off the message rather than the prose.
 *
 * `ask_agent`'s return value reaches the client as a `tool-ask_agent` part, so
 * the count here comes from rows in `proposals` that the delegated run
 * produced — counted server-side, after the run ended.
 *
 * This exists because the Partner's own account is not a control. Asked to
 * delegate, it once told the owner that four proposals were "waiting in your
 * inbox" when the delegated run had never called propose_work_item at all. The
 * tool boundary held — nothing was written — but the only thing the owner could
 * see was a sentence, and the sentence was wrong. A number that came from the
 * table cannot be.
 *
 * Zero renders nothing, which is the point: when the agent claims a proposal
 * and none exists, its claim stands alone and unaccompanied.
 */
export interface ProposalNotice {
  agent: string;
  count: number;
}

interface MaybeToolPart {
  type?: string;
  output?: unknown;
}

export function proposalNoticesFrom(parts: readonly MaybeToolPart[] | undefined): ProposalNotice[] {
  const notices: ProposalNotice[] = [];

  for (const part of parts ?? []) {
    if (part?.type !== 'tool-ask_agent') continue;

    const output = part.output as { agent?: unknown; proposals?: unknown } | undefined;
    const count = typeof output?.proposals === 'number' ? output.proposals : 0;
    const agent = typeof output?.agent === 'string' ? output.agent : '';

    if (count > 0 && agent) notices.push({ agent, count });
  }

  return notices;
}

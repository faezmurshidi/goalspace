/**
 * A turn that said nothing.
 *
 * An assistant turn renders as its text, and a run that ends without emitting
 * any is drawn as a speaker label above blank space — indistinguishable from a
 * turn still streaming, or from the chat being broken.
 *
 * That is not hypothetical. A live Tutor run spent twelve steps failing the
 * same tool call, produced no text and no proposal, and showed the owner a
 * "Tutor" label and nothing else. The run cost real money and reported
 * `succeeded`.
 *
 * So the transcript needs to be able to say "it did this much and did not
 * answer". Counting the tool calls is what makes that sentence specific enough
 * to act on: zero means the model declined outright, twelve means it fought
 * something. The alternative — a bare "no response" — tells the owner nothing
 * they could take to the run trace.
 *
 * Returns null when the turn has anything to show, so the caller renders
 * normally. Never returns null and a count both.
 */
export function silentTurnFrom(parts: readonly unknown[] | undefined): { toolCalls: number } | null {
  const list = parts ?? [];

  let toolCalls = 0;
  let hasVisible = false;

  for (const part of list) {
    if (typeof part !== 'object' || part === null) continue;
    const type = (part as { type?: unknown }).type;
    if (typeof type !== 'string') continue;

    // Text is the turn speaking. Reasoning is deliberately not counted: it is
    // folded away by default, so a turn carrying only reasoning still reads as
    // blank, which is the case this exists to catch.
    if (type === 'text') {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim().length > 0) hasVisible = true;
      continue;
    }

    if (type.startsWith('tool-')) {
      toolCalls += 1;
      // An approval request is a control the owner must answer, so a turn
      // carrying one is not silent even with no prose around it.
      const state = (part as { state?: unknown }).state;
      if (state === 'approval-requested') hasVisible = true;
    }
  }

  if (hasVisible) return null;
  return { toolCalls };
}

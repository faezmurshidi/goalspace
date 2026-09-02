/**
 * Who a message is addressed to.
 *
 * `@critic is this decision sound?` goes to the Critic; anything else goes to
 * the Partner. Parsed from the owner's own text rather than from a picker,
 * because addressing someone is a thing you type mid-sentence, not a mode you
 * enter first.
 *
 * Matched against the project's actual agents, not a hard-coded list: an owner
 * who renamed or deleted one should find that `@` reflects what they have.
 * An unknown handle is deliberately not a mention — `@` appears in prose, and
 * a stray one must not silently redirect the turn.
 */
export interface Mention {
  agentSlug: string;
  question: string;
}

export function parseMention(text: string, knownSlugs: readonly string[]): Mention | null {
  const match = /^\s*@([a-z0-9-]+)\b[ \t]*/i.exec(text);
  if (!match) return null;

  const slug = match[1].toLowerCase();
  if (!knownSlugs.includes(slug)) return null;

  const question = text.slice(match[0].length).trim();
  // A bare handle is not a question. Treating it as one would start a paid run
  // with nothing to answer.
  if (question.length === 0) return null;

  return { agentSlug: slug, question };
}

/**
 * Which cited message ids the owner did not write.
 *
 * The whole of the rule that makes `record_entry` safe, kept pure so it is
 * tested directly rather than through a stubbed database. The caller supplies
 * the allowed set from `listUserMessageIds`, which restricts to `role = 'user'`
 * in the query — so an assistant turn is simply absent here and needs no
 * special case.
 *
 * An empty citation list is a failure, not a trivial pass. A record_entry
 * citing nothing is the agent authoring an entry in the owner's log, which is
 * exactly what the design forbids; returning `[]` for it would let the one case
 * that matters through the one check that exists.
 */
export function unresolvedSources(cited: string[], allowed: Set<string>): string[] {
  if (cited.length === 0) return ['(none cited)'];
  return cited.filter((id) => !allowed.has(id));
}

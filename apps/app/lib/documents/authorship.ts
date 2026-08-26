/**
 * Who wrote the body a revision preserves.
 *
 * A revision records the body being *replaced*, so its author is whoever wrote
 * that body — `documents.agent_id` at the moment of replacement, which the
 * migration in Task 1 now carries onto the revision.
 *
 * Null means human-authored, the same convention entries, work items and
 * documents already use. There is deliberately no third "unknown" state: the
 * column ships before any document can be authored, so a revision predating it
 * cannot exist.
 */

export type Authorship = { by: 'agent'; agentId: string } | { by: 'owner' };

export function authorshipOf(row: { agent_id: string | null }): Authorship {
  // A blank id is not provenance — treat it as unset rather than naming an
  // author that does not exist.
  return row.agent_id ? { by: 'agent', agentId: row.agent_id } : { by: 'owner' };
}

/**
 * The i18n key for each possible `Authorship['by']`. Kept beside the function
 * that produces those values, so a third state could never be added here
 * without also being added to its label.
 */
export const AUTHOR_KEY = {
  agent: 'app.documents.byAgent',
  owner: 'app.documents.byOwner',
} as const;

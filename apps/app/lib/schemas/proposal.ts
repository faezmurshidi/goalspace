import { z } from 'zod';

import { createEntrySchema } from './entry';
import { createWorkItemSchema } from './work-item';
import {
  CHANGES_SOMETHING_MESSAGE,
  changesSomething,
  updateDocumentFields,
} from './document';

export const proposalKinds = ['entry', 'work_item', 'document_edit'] as const;
export const proposalKindSchema = z.enum(proposalKinds);
export type ProposalKind = z.infer<typeof proposalKindSchema>;

/**
 * What an agent may cite.
 *
 * Ids inside the project, and nothing else. A URL has no place here yet:
 * §6.3 validates every citation against the project, and there is no
 * `web_search` to produce one. When it arrives, that is a spec decision about
 * how external findings are cited — not a quiet widening of this enum.
 */
export const citationSchema = z.object({
  type: z.enum(['entry', 'work_item', 'document']),
  id: z.string().uuid(),
});

export const citationsSchema = z.array(citationSchema).max(50);
export type Citation = z.infer<typeof citationSchema>;

/**
 * A document edit carries the `updated_at` the agent read.
 *
 * This is what makes `superseded` decidable. Without it, accepting a proposal
 * generated an hour ago would overwrite whatever the owner has written since,
 * and neither side would know.
 */
export const documentEditPayloadSchema = updateDocumentFields
  .extend({ base_updated_at: z.string().datetime({ offset: true }) })
  // Extends the fields rather than the refined schema, because .refine turns a
  // ZodObject into a ZodEffects and ZodEffects has no .extend. The rule is
  // re-applied from the same predicate so the two cannot drift.
  .refine(changesSomething, { message: CHANGES_SOMETHING_MESSAGE });

/**
 * One validation path.
 *
 * These are the phase-1 schemas the human forms already post through — not a
 * parallel set with agent-specific rules. If a payload would be rejected from
 * a form, it is rejected from a proposal, and the reverse.
 */
export function payloadSchemaFor(kind: ProposalKind): z.ZodTypeAny {
  switch (kind) {
    case 'entry':
      return createEntrySchema;
    case 'work_item':
      return createWorkItemSchema;
    case 'document_edit':
      return documentEditPayloadSchema;
  }
}

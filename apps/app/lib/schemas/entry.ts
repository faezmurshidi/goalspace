import { z } from 'zod';

import { entryKindSchema, optionalText, requiredText } from './common';

/**
 * Quick capture. This is the highest-frequency interaction in the product and
 * the one the whole thesis rests on: if capture is more than a keystroke away
 * the record never accumulates, and every later phase has nothing to stand on.
 *
 * So the required set is deliberately tiny. Only `kind` and `body`. A title is
 * optional because most captures are a sentence, and forcing a title on a
 * sentence is how journals die.
 */
export const createEntrySchema = z.object({
  kind: entryKindSchema,
  body: requiredText(20_000),
  title: optionalText(200).optional().default(null),

  /**
   * The weaker of the two entry-to-work-item relations: *this happened while
   * working on X*. It is what lets the log filter by area. The stronger one,
   * `work_items.closed_by_entry_id`, is written by the close flow instead.
   */
  work_item_id: z.string().uuid().nullable().optional().default(null),

  /**
   * Separate from `created_at` so work can be backdated. Someone writing up
   * Saturday's session on Monday should be able to say so, and the log should
   * order it by when it happened.
   */
  occurred_at: z.string().datetime({ offset: true }).optional(),
});

export const updateEntrySchema = z.object({
  id: z.string().uuid(),
  kind: entryKindSchema.optional(),
  body: requiredText(20_000).optional(),
  title: optionalText(200).optional(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
});

export type CreateEntryInput = z.input<typeof createEntrySchema>;
export type CreateEntryValues = z.output<typeof createEntrySchema>;
export type UpdateEntryValues = z.output<typeof updateEntrySchema>;

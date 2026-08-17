import { z } from 'zod';

import { optionalText, requiredText, workItemKindSchema, workItemStatusSchema } from './common';

export const createWorkItemSchema = z.object({
  title: requiredText(200),
  body: optionalText(20_000).optional().default(null),
  kind: workItemKindSchema.default('task'),
  parent_id: z.string().uuid().nullable().optional().default(null),

  /**
   * "Motor ordered, six-week lead time." Settable at creation because the
   * waiting often starts the moment the item exists.
   */
  wake_at: z.string().datetime({ offset: true }).nullable().optional().default(null),
});

export const updateWorkItemSchema = z.object({
  id: z.string().uuid(),
  title: requiredText(200).optional(),
  body: optionalText(20_000).optional(),
  kind: workItemKindSchema.optional(),
  wake_at: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Closing an item prompts for the entry that closed it. That prompt is the
 * engine of the whole product: nobody sits down to write documentation, they
 * just finish things, and the record accrues as a by-product.
 *
 * The entry is optional rather than required. Making it mandatory would turn
 * every status change into a writing task, and the predictable result is that
 * people stop marking things done, which costs more than the missing prose.
 */
export const changeStatusSchema = z
  .object({
    id: z.string().uuid(),
    status: workItemStatusSchema,
    closingEntryBody: requiredText(20_000).optional(),

    /**
     * Only meaningful when moving to `blocked`. Sent as null to clear a wake
     * date when leaving that status.
     */
    wake_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    // A closing entry only makes sense for a status that closes something.
    // Accepting one on a move to `doing` would file an entry claiming to have
    // closed an item that is still open.
    if (value.closingEntryBody !== undefined && value.status !== 'done') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closingEntryBody'],
        message: 'A closing entry can only accompany a move to done.',
      });
    }

    // wake_at describes what is being waited on. Carrying one onto a done or
    // dropped item leaves a date that will later surface the item as overdue
    // on the resume view, long after it stopped mattering.
    if (
      value.wake_at !== undefined &&
      value.wake_at !== null &&
      value.status !== 'blocked'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wake_at'],
        message: 'A wake date only applies to a blocked item.',
      });
    }
  });

/** Reparenting and reordering, used by the work tree. */
export const moveWorkItemSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  order_index: z.number().int().min(0).max(1_000_000),
});

export type CreateWorkItemInput = z.input<typeof createWorkItemSchema>;
export type CreateWorkItemValues = z.output<typeof createWorkItemSchema>;
export type UpdateWorkItemValues = z.output<typeof updateWorkItemSchema>;
export type ChangeStatusValues = z.output<typeof changeStatusSchema>;
export type MoveWorkItemValues = z.output<typeof moveWorkItemSchema>;

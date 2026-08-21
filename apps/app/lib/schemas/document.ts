import { z } from 'zod';

import { requiredText } from './common';

/**
 * Documents are living artifacts, not log entries: they are rewritten in
 * place, and every rewrite is kept as a revision. The body budget is an order
 * of magnitude larger than an entry's for that reason — a document is the
 * thing an entry refers to.
 *
 * The body defaults to empty rather than null because the column is
 * `not null default ''`. A schema that permitted null would validate happily
 * and then be rejected by the database, which is the least useful place to
 * find out.
 */
export const createDocumentSchema = z.object({
  title: requiredText(200),
  body: z.string().max(200_000).default(''),
});

export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  title: requiredText(200).optional(),
  body: z.string().max(200_000).optional(),
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type CreateDocumentValues = z.output<typeof createDocumentSchema>;
export type UpdateDocumentValues = z.output<typeof updateDocumentSchema>;

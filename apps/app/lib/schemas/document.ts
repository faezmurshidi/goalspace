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

/**
 * An update has to change something.
 *
 * Without the refinement an id-only payload validates, writes a revision, and
 * advances updated_at — producing a revision identical to the current body and
 * invalidating every proposal based on the previous version, all for an edit
 * that changed nothing.
 */
export const updateDocumentFields = z.object({
  id: z.string().uuid(),
  title: requiredText(200).optional(),
  body: z.string().max(200_000).optional(),
});

/** Shared so the proposal payload can extend the fields and keep the rule. */
export const changesSomething = (values: { title?: unknown; body?: unknown }) =>
  values.title !== undefined || values.body !== undefined;

export const CHANGES_SOMETHING_MESSAGE = 'An update must change the title or the body.';

export const updateDocumentSchema = updateDocumentFields.refine(changesSomething, {
  message: CHANGES_SOMETHING_MESSAGE,
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type CreateDocumentValues = z.output<typeof createDocumentSchema>;
export type UpdateDocumentValues = z.output<typeof updateDocumentSchema>;

import { z } from 'zod';

import { optionalText, projectKindSchema, projectStatusSchema, requiredText } from './common';

/**
 * The slug is not in this schema on purpose. It is derived from the title on
 * the server, then de-duplicated against `unique (owner_id, slug)`. Asking a
 * user to invent a URL segment before they have written down what they are
 * building is friction in the one place the product cannot afford it.
 */
export const createProjectSchema = z.object({
  title: requiredText(120),
  brief: optionalText(2_000),
  kind: projectKindSchema,
});

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  title: requiredText(120).optional(),
  brief: optionalText(2_000).optional(),
  status: projectStatusSchema.optional(),
});

/**
 * Deleting a project is the one irreversible act in the product.
 *
 * The typed slug is checked against the resolved project on the server, not
 * only in the browser — a confirmation that lives only in the client is a
 * speed bump rather than a control.
 *
 * Note what is absent: the slug is not editable anywhere in this schema file.
 * It is the project's identity — in every URL, in bookmarks, and in the
 * `unique (owner_id, slug)` constraint — so renaming it would be a migration
 * of the user's own links, and needs its own design if it is ever wanted.
 */
export const deleteProjectSchema = z.object({
  confirmSlug: requiredText(200),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectValues = z.output<typeof createProjectSchema>;
export type UpdateProjectValues = z.output<typeof updateProjectSchema>;
export type DeleteProjectValues = z.output<typeof deleteProjectSchema>;

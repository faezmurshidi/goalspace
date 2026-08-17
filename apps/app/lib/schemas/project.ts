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

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectValues = z.output<typeof createProjectSchema>;
export type UpdateProjectValues = z.output<typeof updateProjectSchema>;

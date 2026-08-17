import { z } from 'zod';

/**
 * The domain vocabulary, as literal unions.
 *
 * Postgres enforces these with CHECK constraints rather than enum types, so
 * the generated Supabase types widen every one of them to plain `string`.
 * That means the compiler alone cannot stop `status: 'inprogress'` reaching
 * the database and being rejected at runtime. These schemas are the narrowing
 * layer, and they are shared by the forms and the server actions so both agree
 * on what a valid value is.
 *
 * Keep in step with the CHECK constraints in
 * supabase/migrations/20260730000100_phase1_baseline.sql.
 */

export const projectKinds = ['build', 'learn', 'research'] as const;
export const projectStatuses = ['active', 'paused', 'done', 'abandoned'] as const;
export const projectVisibilities = ['private', 'public'] as const;

/** What happened. Strictly a record of the past; open loops are work items. */
export const entryKinds = ['note', 'decision', 'source', 'session'] as const;

/** A question is an open loop, which is why it lives here and not in entries. */
export const workItemKinds = ['task', 'question'] as const;
export const workItemStatuses = ['open', 'doing', 'blocked', 'done', 'dropped'] as const;

export const projectKindSchema = z.enum(projectKinds);
export const projectStatusSchema = z.enum(projectStatuses);
export const projectVisibilitySchema = z.enum(projectVisibilities);
export const entryKindSchema = z.enum(entryKinds);
export const workItemKindSchema = z.enum(workItemKinds);
export const workItemStatusSchema = z.enum(workItemStatuses);

export type ProjectKind = z.infer<typeof projectKindSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectVisibility = z.infer<typeof projectVisibilitySchema>;
export type EntryKind = z.infer<typeof entryKindSchema>;
export type WorkItemKind = z.infer<typeof workItemKindSchema>;
export type WorkItemStatus = z.infer<typeof workItemStatusSchema>;

export const uuidSchema = z.string().uuid();

/**
 * Slugs are lowercase, hyphen-separated, and never hyphen-topped-or-tailed.
 * Length is capped well under any URL limit because the slug is derived from a
 * title the user typed, and a 200-character URL segment is a worse outcome
 * than a truncated one.
 *
 * The character class is Unicode-aware rather than `[a-z0-9]`. The interface
 * serves zh, and an ASCII-only rule would reject every slug derived from a
 * Chinese title, which `slugify` legitimately produces. Modern browsers and
 * Postgres both handle these in a path segment; the encoding is the
 * transport's problem, not the data model's.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
    'Slugs are lowercase words separated by hyphens.'
  );

/**
 * Derive a slug from a title.
 *
 * Unicode-aware on purpose: a naive `[^a-z0-9]` filter reduces a Chinese title
 * to the empty string, so every zh project would collide on one fallback slug.
 * Latin accents are decomposed and stripped, so "Réparation" gives
 * "reparation"; scripts with no Latin form are kept as they are.
 *
 * Returns null when nothing usable survives, so the caller picks a fallback
 * rather than this function silently persisting an empty slug.
 */
export function slugify(title: string): string | null {
  const slug = title
    .normalize('NFKD')
    // Combining marks left behind by the decomposition above.
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    // Any run of non-alphanumerics becomes a single separator.
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 64)
    // Truncation can land on a separator and leave it dangling.
    .replace(/-+$/gu, '');

  return slug.length > 0 ? slug : null;
}

/**
 * Trim, then reject empties. Used wherever the database column is `not null`
 * but the default is `''`: a body of three spaces is not content, and storing
 * it produces an entry that renders as a blank row forever.
 */
export const requiredText = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1).max(max));

/** Same, but an empty result becomes null rather than an error. */
export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import { slugSchema, slugify } from '@/lib/schemas/common';
import { agentRowsFor } from '@/lib/agents/templates';
import type { CreateProjectValues, UpdateProjectValues } from '@/lib/schemas/project';
import type { ProjectKind, ProjectStatus, ProjectVisibility } from '@/lib/schemas/common';

type Client = SupabaseClient<Database>;

/**
 * A project with its CHECK-constrained columns narrowed to the domain unions.
 * The generated types widen all three to `string`, which would otherwise leak
 * `string` into every component that renders a status.
 */
export type Project = Omit<Tables<'projects'>, 'kind' | 'status' | 'visibility'> & {
  kind: ProjectKind;
  status: ProjectStatus;
  visibility: ProjectVisibility;
};

const PROJECT_COLUMNS = 'id, owner_id, slug, title, brief, kind, visibility, status, created_at, updated_at';

function asProject(row: Tables<'projects'>): Project {
  return row as Project;
}

/**
 * Every project the user owns, most recently touched first.
 *
 * RLS restricts this to `owner_id = auth.uid()` (plus anything public, which
 * nothing can set from the UI in phase 1), so no explicit owner filter is
 * needed. It is included anyway: relying on a policy for correctness rather
 * than only for security means a policy change silently changes results.
 */
export async function listProjects(supabase: Client, ownerId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(asProject);
}

/**
 * The project a returning user should land on.
 *
 * Prefers an active project over a paused or finished one, then falls back to
 * whatever was touched last, so someone whose only project is `done` still
 * lands somewhere real instead of on an empty state that implies their work
 * was lost. Returns null only when the user genuinely has no projects, which
 * is the first-run case.
 *
 * One query rather than two: a user has a handful of projects, and the
 * round-trip costs more than the rows.
 */
export async function getLandingProject(
  supabase: Client,
  ownerId: string
): Promise<Project | null> {
  const projects = await listProjects(supabase, ownerId);
  if (projects.length === 0) return null;
  return projects.find((p) => p.status === 'active') ?? projects[0];
}

/**
 * A single project by slug, or null when it does not exist *or* is not
 * visible to this user.
 *
 * The two cases are deliberately collapsed. RLS returns no rows rather than
 * erroring, so "forbidden" and "absent" are indistinguishable here by design:
 * telling the difference would confirm to a stranger that a given slug exists
 * under someone else's account. The caller routes both to a 404.
 */
export async function getProjectBySlug(
  supabase: Client,
  ownerId: string,
  slug: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data ? asProject(data) : null;
}

/**
 * Create a project, deriving a slug that is unique for this owner.
 *
 * The uniqueness loop reads before writing, which is a race in principle: two
 * simultaneous creations could settle on the same suffix. `unique (owner_id,
 * slug)` is the actual guarantee, so the loser gets a constraint violation
 * rather than a duplicate. Retrying on 23505 keeps that from surfacing to a
 * user who simply double-clicked.
 */
/**
 * Slugs that would collide with a static route under /projects.
 *
 * Next resolves a static segment ahead of a dynamic one, so a project whose
 * slug is "new" would be permanently unreachable: /projects/new always renders
 * the create form. Suffixing at creation keeps the URL space unambiguous, and
 * a user who names a project "New" simply gets `new-2`.
 */
const RESERVED_SLUGS = new Set(['new']);

/**
 * Gives a new project its seeded agents.
 *
 * A failure here is logged and swallowed on purpose. A project without a
 * Critic is a perfectly usable project — the log is the whole product, the
 * agents are an accessory to it — so a seeding error must not undo a creation
 * the owner just completed. The agents can be added later; the project cannot
 * be un-lost.
 */
async function seedAgents(supabase: Client, projectId: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('agents').insert(agentRowsFor(projectId, ownerId));
  if (error) console.error('Could not seed agents for project', projectId, error);
}

export async function createProject(
  supabase: Client,
  ownerId: string,
  values: CreateProjectValues
): Promise<Project> {
  // A title in a script that survives slugification gives a readable slug; one
  // that reduces to nothing (an emoji-only title, say) falls back to the kind.
  const derived = slugify(values.title) ?? values.kind;
  const candidate = RESERVED_SLUGS.has(derived) ? `${derived}-project` : derived;

  // slugify is the only producer, but running its output through the schema
  // keeps the two from drifting apart: a slug that the rest of the system
  // would reject must never reach the database.
  const base = slugSchema.safeParse(candidate).success ? candidate : values.kind;

  const { data: taken, error: takenError } = await supabase
    .from('projects')
    .select('slug')
    .eq('owner_id', ownerId)
    .like('slug', `${base}%`);

  if (takenError) throw takenError;

  const used = new Set((taken ?? []).map((r) => r.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        slug,
        title: values.title,
        brief: values.brief,
        kind: values.kind,
      })
      .select(PROJECT_COLUMNS)
      .single();

    if (!error) {
      await seedAgents(supabase, data.id, ownerId);
      return asProject(data);
    }
    // 23505 is unique_violation: someone took this slug between the read and
    // the write. Any other error is real and should surface.
    if (error.code !== '23505') throw error;
    slug = `${base}-${Date.now().toString(36).slice(-4)}-${attempt}`;
  }

  throw new Error(`Could not find a free slug for "${values.title}"`);
}

/**
 * Update a project's own fields.
 *
 * Filtered on `owner_id` as well as `id`. RLS already refuses another owner's
 * row, but stating ownership here means the function returns null rather than
 * relying on a policy to raise — and null is what lets the caller tell
 * "refused" from "changed" instead of reporting a silent no-op as success.
 *
 * `updated_at` is not set here: `update_projects_updated_at` already does it.
 * (`project_budgets` has no such trigger, which is why `updateBudget` does set
 * it — the asymmetry is in the schema, not an oversight here.)
 */
export async function updateProject(
  supabase: Client,
  { id, ownerId, values }: { id: string; ownerId: string; values: UpdateProjectValues }
): Promise<Project | null> {
  // `values` carries the client's id. It names nothing here — the row is
  // chosen by the `id` argument, resolved from the slug — so it must not reach
  // the SET clause, where it would rewrite a primary key or trip the child
  // foreign keys. Same destructure as `updateAgent` in lib/db/agents.ts.
  const { id: _clientId, ...fields } = values;

  const { data, error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Project | null;
}

/**
 * Delete a project and everything that hangs off it.
 *
 * Every child table declares `on delete cascade` against `projects(id)`, so
 * this one statement removes entries, work items, documents and their
 * revisions, attachment rows, agents, runs, tool calls, proposals, and usage
 * rows. That breadth is the reason the caller must confirm by typing the slug.
 *
 * What it does not remove: the objects those attachment rows point at in
 * Supabase Storage. Nothing cleans that bucket up, so deleting a project
 * orphans its files. No upload path exists yet, so this is a note for whoever
 * builds one, not a live leak — but the user-facing copy must not claim the
 * files are gone.
 *
 * Returns whether a row was actually removed, so a refusal is distinguishable
 * from a success. `select()` after `delete()` returns the deleted rows, which
 * is how we know.
 */
export async function deleteProject(
  supabase: Client,
  { id, ownerId }: { id: string; ownerId: string }
): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('id');

  if (error) throw error;
  return (data ?? []).length > 0;
}

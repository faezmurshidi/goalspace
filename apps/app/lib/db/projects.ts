import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import { slugify } from '@/lib/schemas/common';
import type { CreateProjectValues } from '@/lib/schemas/project';
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

export async function createProject(
  supabase: Client,
  ownerId: string,
  values: CreateProjectValues
): Promise<Project> {
  // A title in a script that survives slugification gives a readable slug; one
  // that reduces to nothing (an emoji-only title, say) falls back to the kind.
  const derived = slugify(values.title) ?? values.kind;
  const base = RESERVED_SLUGS.has(derived) ? `${derived}-project` : derived;

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

    if (!error) return asProject(data);
    // 23505 is unique_violation: someone took this slug between the read and
    // the write. Any other error is real and should surface.
    if (error.code !== '23505') throw error;
    slug = `${base}-${Date.now().toString(36).slice(-4)}-${attempt}`;
  }

  throw new Error(`Could not find a free slug for "${values.title}"`);
}

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type { ToolName } from '@/lib/agents/tools/registry';
import { citationsSchema, payloadSchemaFor, type ProposalKind } from '@/lib/schemas/proposal';
import { resolveCitations } from '@/lib/proposals/citations';

/**
 * Every handler takes its project from the run context, never from the model.
 *
 * RLS is the real boundary — these queries run as the owner, so another
 * project's rows are invisible regardless. Scoping here as well means a
 * confused model gets an empty result instead of an error, and it keeps the
 * rule readable in one place: the model chooses what to ask, never whose.
 */
export interface ToolContext {
  supabase: SupabaseClient<Database>;
  projectId: string;
  /**
   * Provenance for anything this run proposes. Read tools ignore these; a
   * proposal row cannot be written without them, and none of them may come
   * from the model — an agent that could name its own owner_id could write
   * into someone else's inbox.
   */
  ownerId: string;
  agentId: string;
  runId: string;
}

/**
 * The single writer of the `proposals` table.
 *
 * Validation happens twice on the way in, and both halves matter. The payload
 * goes through the same schema the human form posts through, so an agent
 * cannot propose something a person could not have typed. The citations are
 * resolved against the project, so a model that invents an id is told so and
 * can correct itself — a stored proposal citing nothing would look better
 * evidenced than one citing nothing at all, which is the worse outcome.
 */
async function storeProposal(
  ctx: ToolContext,
  kind: ProposalKind,
  payload: unknown,
  rationale: string,
  rawCitations: unknown,
  targetId: string | null
): Promise<{ proposal_id: string }> {
  const parsedPayload = payloadSchemaFor(kind).safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error(
      `That payload is not valid for a ${kind} proposal: ${parsedPayload.error.issues
        .map((issue) => `${issue.path.join('.') || 'payload'} ${issue.message}`)
        .join('; ')}`
    );
  }

  const parsedCitations = citationsSchema.safeParse(rawCitations ?? []);
  if (!parsedCitations.success) {
    throw new Error('Citations must be {type, id} objects with uuid ids.');
  }

  const check = await resolveCitations(ctx.supabase, ctx.projectId, parsedCitations.data);
  if (!check.ok) {
    throw new Error(
      `These citations do not exist in this project: ${check.missing
        .map((citation) => `${citation.type} ${citation.id}`)
        .join(', ')}. Cite only ids you have seen in a tool result.`
    );
  }

  const { data, error } = await ctx.supabase
    .from('proposals')
    .insert({
      project_id: ctx.projectId,
      owner_id: ctx.ownerId,
      agent_id: ctx.agentId,
      run_id: ctx.runId,
      kind,
      target_id: targetId,
      payload: parsedPayload.data as never,
      rationale,
      citations: parsedCitations.data as never,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { proposal_id: data.id };
}

const ENTRY_COLUMNS = 'id, kind, title, body, occurred_at, work_item_id';
const WORK_ITEM_COLUMNS = 'id, parent_id, kind, status, title, body, wake_at, order_index';

export const HANDLERS: Record<ToolName, (ctx: ToolContext, args: never) => Promise<unknown>> = {
  async search_repo(ctx, args: { query: string; limit?: number }) {
    const { data, error } = await ctx.supabase.rpc('search_repo', {
      p_project_id: ctx.projectId,
      p_query: args.query,
      p_limit: args.limit ?? 20,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async list_entries(ctx, args: { kinds?: string[]; work_item_id?: string; limit?: number }) {
    let query = ctx.supabase
      .from('entries')
      .select(ENTRY_COLUMNS)
      .eq('project_id', ctx.projectId)
      .order('occurred_at', { ascending: false })
      .limit(args.limit ?? 50);
    if (args.kinds?.length) query = query.in('kind', args.kinds);
    if (args.work_item_id) query = query.eq('work_item_id', args.work_item_id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async list_work_items(ctx, args: { status?: string[]; parent_id?: string | null }) {
    let query = ctx.supabase
      .from('work_items')
      .select(WORK_ITEM_COLUMNS)
      .eq('project_id', ctx.projectId)
      .order('order_index', { ascending: true });
    if (args.status?.length) query = query.in('status', args.status);
    if (args.parent_id !== undefined && args.parent_id !== null) {
      query = query.eq('parent_id', args.parent_id);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async get_work_item(ctx, args: { id: string; with_descendants?: boolean }) {
    const { data, error } = await ctx.supabase
      .from('work_items')
      .select(WORK_ITEM_COLUMNS)
      .eq('project_id', ctx.projectId)
      .eq('id', args.id);
    if (error) throw new Error(error.message);
    const item = (data ?? [])[0];
    if (!item) return null;
    if (!args.with_descendants) return item;

    const { data: all, error: allError } = await ctx.supabase
      .from('work_items')
      .select(WORK_ITEM_COLUMNS)
      .eq('project_id', ctx.projectId);
    if (allError) throw new Error(allError.message);

    const children = new Map<string | null, NonNullable<typeof all>>();
    for (const row of all ?? []) {
      const siblings = children.get(row.parent_id) ?? [];
      siblings.push(row);
      children.set(row.parent_id, siblings);
    }
    const descendants: unknown[] = [];
    const walk = (id: string) => {
      for (const child of children.get(id) ?? []) {
        descendants.push(child);
        walk(child.id);
      }
    };
    walk(args.id);
    return { ...item, descendants };
  },

  async read_document(ctx, args: { id: string }) {
    const { data, error } = await ctx.supabase
      .from('documents')
      .select('id, title, body, updated_at')
      .eq('project_id', ctx.projectId)
      .eq('id', args.id);
    if (error) throw new Error(error.message);
    return (data ?? [])[0] ?? null;
  },

  async propose_entry(ctx, args: { payload: unknown; rationale: string; citations?: unknown }) {
    return storeProposal(ctx, 'entry', args.payload, args.rationale, args.citations, null);
  },

  async propose_work_item(ctx, args: { payload: unknown; rationale: string; citations?: unknown }) {
    return storeProposal(ctx, 'work_item', args.payload, args.rationale, args.citations, null);
  },

  async propose_document_edit(
    ctx,
    args: {
      payload: { id: string; title?: string; body?: string };
      rationale: string;
      citations?: unknown;
    }
  ) {
    // base_updated_at is read from the row, never taken from the model. It is
    // the evidence that this edit was written against the version now on
    // record, and a model that supplied its own could defeat the staleness
    // check simply by claiming a newer one.
    const { data, error } = await ctx.supabase
      .from('documents')
      .select('id, updated_at')
      .eq('project_id', ctx.projectId)
      .eq('id', args.payload.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error(`No document ${args.payload.id} in this project.`);

    return storeProposal(
      ctx,
      'document_edit',
      { ...args.payload, base_updated_at: data.updated_at },
      args.rationale,
      args.citations,
      args.payload.id
    );
  },
};

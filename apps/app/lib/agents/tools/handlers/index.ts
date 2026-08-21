import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type { ToolName } from '@/lib/agents/tools/registry';

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
};

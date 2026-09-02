import type { SupabaseClient } from '@supabase/supabase-js';

import type { ToolName } from '@/lib/agents/tools/registry';
import { unresolvedSources } from '@/lib/agents/tools/sources';
import { listUserMessageIds } from '@/lib/db/conversations';
import { createEntry } from '@/lib/db/entries';
import { resolveCitations } from '@/lib/proposals/citations';
import { createEntrySchema } from '@/lib/schemas/entry';
import { citationsSchema, payloadSchemaFor, type ProposalKind } from '@/lib/schemas/proposal';
import type { Database } from '@/types/supabase';

/**
 * Every handler takes its project from the run context, never from the model.
 *
 * RLS is the real boundary — these queries run as the owner, so another
 * project's rows are invisible regardless. Scoping here as well means a
 * confused model gets an empty result instead of an error, and it keeps the
 * rule readable in one place: the model chooses what to ask, never whose.
 */
export type DelegateFn = (
  agentSlug: string,
  question: string
) => Promise<{ ok: true; text: string; proposals: number } | { ok: false; message: string }>;

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
  /**
   * The `updated_at` each document had when this run read it, keyed by id.
   *
   * Written by read_document, required by propose_document_edit. It exists
   * because the obvious alternative — looking the version up when the proposal
   * is stored — records the version *now*, not the version the edit was
   * written against. An owner who edits between the agent's read and its
   * proposal would then see the staleness check pass and their work
   * overwritten, which is the exact failure superseding exists to prevent.
   *
   * Lives on the context rather than in the model's arguments for the same
   * reason project_id does: a model that could name its own base version could
   * defeat the check by claiming a newer one.
   */
  documentVersions: Map<string, string>;
  /**
   * Runs another agent, under that agent's own allowlist.
   *
   * Injected rather than imported. `ask_agent` needs `runTooled`, and importing
   * it here would close the cycle handlers → tooled → executor → handlers.
   * Injection also makes delegation testable without a model, which an import
   * would not.
   *
   * Absent on runs that may not delegate — which is every run except the
   * Partner's. A handler reached without it is a wiring bug, not a refusal.
   */
  delegate?: DelegateFn;
  /**
   * The conversation this run belongs to. Present only on conversation runs.
   *
   * record_entry validates its sources against this conversation's user turns,
   * so a run without one has nothing to validate against and must not record.
   */
  conversationId?: string;
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
    // An invented filter id is rejected, exactly as an invented citation is.
    //
    // Without this the call succeeds and returns nothing, because a filter on a
    // work item that does not exist is a legal query with an empty result. A
    // model that guessed the id then reads "0 rows" as "the record is empty"
    // and proposes from nothing — observed three times: the intake Planner,
    // and again through delegation. A silent zero is the worst answer a tool
    // can give, because it is indistinguishable from a true one.
    if (args.work_item_id) {
      const { data: target } = await ctx.supabase
        .from('work_items')
        .select('id')
        .eq('project_id', ctx.projectId)
        .eq('id', args.work_item_id)
        .maybeSingle();

      if (!target) {
        throw new Error(
          `No work item ${args.work_item_id} in this project. Omit work_item_id to list the ` +
            'whole log, or call list_work_items first to get a real id.'
        );
      }
    }

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

    const document = (data ?? [])[0] ?? null;
    // Remember what this run saw. propose_document_edit needs the version the
    // agent actually read, not whatever is current when it proposes.
    if (document) ctx.documentVersions.set(document.id, document.updated_at);
    return document;
  },

  /**
   * One entry by id.
   *
   * Unlike read_document this records nothing on the context. read_document
   * remembers the version it saw because propose_document_edit needs the
   * version the edit was written against; there is no entry-edit proposal, so
   * there is no version to carry.
   */
  async read_entry(ctx, args: { id: string }) {
    const { data, error } = await ctx.supabase
      .from('entries')
      .select(ENTRY_COLUMNS)
      .eq('project_id', ctx.projectId)
      .eq('id', args.id);
    if (error) throw new Error(error.message);
    return (data ?? [])[0] ?? null;
  },

  async ask_agent(ctx, args: { agent_slug: string; question: string }) {
    if (!ctx.delegate) {
      // Loud on purpose. An agent holding ask_agent in a run wired without a
      // delegate is a bug in the caller; answering "I cannot" would let it ship
      // looking like a model limitation.
      throw new Error(
        `ask_agent was called on run ${ctx.runId} with no delegate wired into the context.`
      );
    }

    const outcome = await ctx.delegate(args.agent_slug, args.question);

    // A refusal is data, not an exception. A delegated run stopped by the
    // monthly cap should leave the Partner able to say so and carry on.
    // The count is what the composer renders an inbox affordance from. It
    // matters because the alternative is the Partner's prose, and prose is not
    // a control: asked to delegate, it once reported four proposals "waiting in
    // your inbox" when the delegated run had made no proposal call at all.
    // A number from the proposals table cannot say that.
    return outcome.ok
      ? { agent: args.agent_slug, answer: outcome.text, proposals: outcome.proposals }
      : { agent: args.agent_slug, refused: outcome.message, proposals: 0 };
  },

  async record_entry(
    ctx,
    args: {
      payload: { kind: string; title?: string | null; body: string };
      source_message_ids: string[];
    }
  ) {
    if (!ctx.conversationId) {
      // Loud, as with ask_agent: an agent holding record_entry outside a
      // conversation is a wiring bug, and there is no conversation whose user
      // turns could validate the sources.
      throw new Error(
        `record_entry was called on run ${ctx.runId} with no conversationId in the context.`
      );
    }

    const allowed = await listUserMessageIds(ctx.supabase, ctx.conversationId);
    const unresolved = unresolvedSources(args.source_message_ids, allowed);
    if (unresolved.length > 0) {
      // Returned rather than thrown: the model can correct itself, and the
      // owner should not lose a run because an agent cited badly once.
      return {
        recorded: false,
        error:
          `These are not messages the owner wrote in this conversation: ${unresolved.join(', ')}. ` +
          'Record only what they told you, citing the message ids you are recording from.',
      };
    }

    // The one validation path, as everywhere else: the schema the human capture
    // form posts through is the schema this passes through.
    const parsed = createEntrySchema.safeParse({
      kind: args.payload.kind,
      title: args.payload.title ?? null,
      body: args.payload.body,
      work_item_id: null,
    });
    if (!parsed.success) {
      return { recorded: false, error: 'That entry is not valid.' };
    }

    const entry = await createEntry(ctx.supabase, {
      projectId: ctx.projectId,
      ownerId: ctx.ownerId,
      // Stamped, not laundered to null. The words are the owner's; the decision
      // to write them down, and the kind and title, are the agent's.
      agentId: ctx.agentId,
      values: parsed.data,
    });

    return { recorded: true, id: entry.id, kind: entry.kind };
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
    // The base version comes from what read_document returned during this run,
    // never from a fresh lookup and never from the model. Looking it up here
    // would stamp the version at *proposal* time: if the owner edited between
    // the agent's read and this call, the payload was written against the old
    // body but would carry the new version, the staleness check would pass,
    // and the owner's work would be overwritten.
    const baseUpdatedAt = ctx.documentVersions.get(args.payload.id);
    if (!baseUpdatedAt) {
      throw new Error(
        `Read document ${args.payload.id} with read_document before proposing an edit to it. ` +
          'An edit has to be written against a version you have actually seen.'
      );
    }

    return storeProposal(
      ctx,
      'document_edit',
      { ...args.payload, base_updated_at: baseUpdatedAt },
      args.rationale,
      args.citations,
      args.payload.id
    );
  },
};

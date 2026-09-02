import { z } from 'zod';

/**
 * The capability model.
 *
 * An agent is not a persona, it is a tool set. "Specialisation" that lives
 * only in a system prompt is cosmetic: a model that emits a disallowed call
 * would still execute it. Here the set handed to the model is
 * `registry ∩ agent.tools`, computed server-side, and the executor rejects
 * anything outside it before a handler is reached.
 *
 * Two flags carry the meaning. `writes` marks a tool that produces a proposal
 * rather than mutating directly — a "write" tool in this system inserts into
 * `proposals` and touches nothing else, so the flag names what the owner will
 * be asked to approve, not what the tool changes. `external` marks a tool that
 * leaves the system; REPO_READ must never contain one, which is what lets an
 * agent be described as reaching nowhere and have that be true.
 *
 * No tool takes a project_id. Scope comes from the run context, so a model
 * cannot reach another project by guessing an id.
 */

export const REGISTRY_NAMES = [
  'search_repo',
  'list_entries',
  'list_work_items',
  'get_work_item',
  'read_document',
  'read_entry',
  'ask_agent',
  'propose_entry',
  'propose_work_item',
  'propose_document_edit',
] as const;

export type ToolName = (typeof REGISTRY_NAMES)[number];

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: z.ZodTypeAny;
  /** Emits a proposal rather than mutating. */
  writes: boolean;
  /** Leaves the system boundary. No tool does yet; web_search will. */
  external: boolean;
}

export const REGISTRY: Record<ToolName, ToolDefinition> = {
  search_repo: {
    name: 'search_repo',
    description:
      "Full-text search across this project's entries, work items, and documents. " +
      'Use it when you need to find where something was discussed but do not know which entry. ' +
      'Returns ranked snippets with ids you can pass to the other tools.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search terms. Supports quoted phrases and OR.'),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    writes: false,
    external: false,
  },
  list_entries: {
    name: 'list_entries',
    description:
      'List log entries newest first, optionally filtered by kind or work item. ' +
      'Use it to read the decision list, or to pull what happened around a date.',
    inputSchema: z.object({
      kinds: z.array(z.enum(['note', 'decision', 'source', 'session'])).optional(),
      work_item_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    writes: false,
    external: false,
  },
  list_work_items: {
    name: 'list_work_items',
    description: 'List work items, optionally filtered by status or parent.',
    inputSchema: z.object({
      status: z.array(z.enum(['open', 'doing', 'blocked', 'done', 'dropped'])).optional(),
      parent_id: z.string().uuid().nullable().optional(),
    }),
    writes: false,
    external: false,
  },
  get_work_item: {
    name: 'get_work_item',
    description: 'Read one work item, optionally with its descendants.',
    inputSchema: z.object({
      id: z.string().uuid(),
      with_descendants: z.boolean().default(false),
    }),
    writes: false,
    external: false,
  },
  read_document: {
    name: 'read_document',
    description: "Read a document's current body.",
    inputSchema: z.object({ id: z.string().uuid() }),
    writes: false,
    external: false,
  },
  read_entry: {
    name: 'read_entry',
    description:
      'Read one log entry by id, including its full body. Use it when you have an id — from a ' +
      'citation, a proposal, or a search result — rather than listing the log again to find it.',
    inputSchema: z.object({ id: z.string().uuid() }),
    writes: false,
    external: false,
  },
  ask_agent: {
    name: 'ask_agent',
    description:
      'Ask one of this project\u2019s specialist agents a question and return its answer. ' +
      'The agent runs under its own tools, not yours — if it proposes something, the proposal ' +
      'is its own and goes to the owner\u2019s inbox. Say that you asked it, never that you did it.',
    // The enum is the guard, not a convenience. 'partner' is not a member, so a
    // Partner naming itself fails validation before any handler runs — the
    // allowlist alone would permit the self-call, since the Partner holds this
    // tool. Do not widen to z.string().
    inputSchema: z.object({
      agent_slug: z.enum(['critic', 'tutor', 'planner']),
      question: z.string().min(1).max(2_000),
    }),
    // The sub-agent may propose; this tool does not. Filing it as a write would
    // place it in WRITE_TOOLS and make the Critic — defined as writing nothing
    // — permanently ineligible to hold it.
    writes: false,
    external: false,
  },
  propose_entry: {
    name: 'propose_entry',
    description:
      'Propose a new log entry for the owner to accept or reject. This does NOT write to the log — ' +
      'it creates a suggestion the owner reviews. Cite the entries, work items, or documents you drew on.',
    inputSchema: z.object({
      payload: z.object({
        kind: z.enum(['note', 'decision', 'source', 'session']),
        body: z.string().min(1).describe('The entry body, written as the owner would write it.'),
        title: z.string().max(200).nullable().optional(),
        work_item_id: z.string().uuid().nullable().optional(),
        occurred_at: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe(
            'When it happened, if that is not now. The log orders by this, so a session ' +
              'written up days later belongs on the day it happened.'
          ),
      }),
      rationale: z
        .string()
        .min(1)
        .describe('Why this belongs in the record. The owner reads this first.'),
      citations: z
        .array(
          z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() })
        )
        .default([])
        .describe('Ids you actually saw in a tool result. Inventing one fails the call.'),
    }),
    writes: true,
    external: false,
  },
  propose_work_item: {
    name: 'propose_work_item',
    description:
      'Propose a new work item for the owner to accept or reject. This does NOT create the item.',
    inputSchema: z.object({
      payload: z.object({
        title: z.string().min(1).max(200),
        body: z.string().nullable().optional(),
        kind: z.enum(['task', 'question']).default('task'),
        parent_id: z.string().uuid().nullable().optional(),
        wake_at: z.string().datetime({ offset: true }).nullable().optional(),
      }),
      rationale: z.string().min(1),
      citations: z
        .array(
          z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() })
        )
        .default([]),
    }),
    writes: true,
    external: false,
  },
  propose_document_edit: {
    name: 'propose_document_edit',
    description:
      'Propose a rewrite of a document for the owner to accept or reject. This does NOT change the ' +
      'document. Read it first — an edit proposed against a stale version is rejected as superseded.',
    inputSchema: z.object({
      payload: z.object({
        id: z.string().uuid().describe('The document to edit.'),
        title: z.string().min(1).max(200).optional(),
        body: z.string().optional(),
      }),
      rationale: z.string().min(1),
      citations: z
        .array(
          z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() })
        )
        .default([]),
    }),
    writes: true,
    external: false,
  },
};

/**
 * Repo-read never includes anything external. Seeded agents are defined
 * against this group, so widening it silently widens their reach.
 */
export const REPO_READ = [
  'search_repo',
  'list_entries',
  'list_work_items',
  'get_work_item',
  'read_document',
  'read_entry',
] as const satisfies readonly ToolName[];

/**
 * Every tool that produces a proposal. None of them is external, and none of
 * them mutates: a "write" tool in this system writes to `proposals` and
 * nowhere else. REPO_READ and WRITE_TOOLS are disjoint by construction, which
 * is what lets the Critic be described as writing nothing and have that be
 * checkable rather than claimed.
 */
export const WRITE_TOOLS = [
  'propose_entry',
  'propose_work_item',
  'propose_document_edit',
] as const satisfies readonly ToolName[];

function isRegistryTool(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name);
}

export function isAllowed(allowlist: readonly string[], tool: string): boolean {
  return isRegistryTool(tool) && allowlist.includes(tool);
}

/** `registry ∩ allowlist`. Unknown names are dropped, not thrown. */
export function resolveTools(allowlist: readonly string[]): ToolDefinition[] {
  return allowlist.filter(isRegistryTool).map((name) => REGISTRY[name]);
}

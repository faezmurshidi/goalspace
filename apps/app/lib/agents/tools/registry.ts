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
 * rather than mutating directly — every tool here is `false`, because phase 2a
 * ships no write path at all. `external` marks a tool that leaves the system;
 * REPO_READ must never contain one, which is what lets an agent be described
 * as reaching nowhere and have that be true.
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
] as const;

export type ToolName = (typeof REGISTRY_NAMES)[number];

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: z.ZodTypeAny;
  /** Emits a proposal rather than mutating. Always false in phase 2a. */
  writes: boolean;
  /** Leaves the system boundary. Always false in phase 2a. */
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

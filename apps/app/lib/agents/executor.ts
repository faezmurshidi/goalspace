import type { SupabaseClient } from '@supabase/supabase-js';
import { tool, type ToolSet } from 'ai';

import { HANDLERS, type DelegateFn, type ToolContext } from '@/lib/agents/tools/handlers';
import { isAllowed, REGISTRY, resolveTools } from '@/lib/agents/tools/registry';
import type { Database } from '@/types/supabase';

/**
 * The executor is where "specialisation" stops being cosmetic.
 *
 * Two gates, deliberately redundant. `buildToolSet` hands the model only
 * `registry ∩ agent.tools`, so a disallowed tool is not describable. And
 * `dispatchToolCall` re-checks the allowlist before touching a handler, so a
 * call that arrives anyway — a hallucinated name, or a future code path that
 * forgets to filter — is rejected and recorded rather than executed.
 *
 * The second gate is the one under test. Prompt instruction is not a control
 * and is not tested as one.
 */

export interface RunContext {
  supabase: SupabaseClient<Database>;
  projectId: string;
  ownerId: string;
  agentId: string;
  runId: string;
  allowlist: readonly string[];
  /**
   * Per-run memory of document versions read, populated by read_document and
   * required by propose_document_edit. Created once per run so it survives
   * across tool calls; see ToolContext for why the version cannot be looked up
   * at proposal time.
   */
  documentVersions: Map<string, string>;
  /** See ToolContext.delegate. Present only on runs permitted to delegate. */
  delegate?: DelegateFn;
  /** See ToolContext.conversationId. Present only on conversation runs. */
  conversationId?: string;
}

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

async function recordToolCall(
  ctx: RunContext,
  toolName: string,
  args: unknown,
  ok: boolean,
  durationMs: number,
  resultSummary: string | null
): Promise<void> {
  await ctx.supabase.from('agent_tool_calls').insert({
    run_id: ctx.runId,
    project_id: ctx.projectId,
    owner_id: ctx.ownerId,
    tool: toolName,
    args: (args ?? {}) as never,
    ok,
    duration_ms: durationMs,
    result_summary: resultSummary,
  });
}

function summarise(result: unknown): string {
  if (Array.isArray(result)) return `${result.length} row(s)`;
  if (result === null) return 'no match';
  return 'ok';
}

export async function dispatchToolCall(
  ctx: RunContext,
  toolName: string,
  args: unknown,
  handlers: typeof HANDLERS = HANDLERS
): Promise<ToolOutcome> {
  const started = Date.now();

  if (!isAllowed(ctx.allowlist, toolName)) {
    const error = `Tool "${toolName}" is not available to this agent.`;
    await recordToolCall(ctx, toolName, args, false, Date.now() - started, error);
    return { ok: false, error };
  }

  const handler = handlers[toolName as keyof typeof handlers];
  if (!handler) {
    const error = `Tool "${toolName}" has no handler.`;
    await recordToolCall(ctx, toolName, args, false, Date.now() - started, error);
    return { ok: false, error };
  }

  const toolContext: ToolContext = {
    supabase: ctx.supabase,
    projectId: ctx.projectId,
    ownerId: ctx.ownerId,
    agentId: ctx.agentId,
    runId: ctx.runId,
    documentVersions: ctx.documentVersions,
  };
  try {
    const result = await handler(toolContext, args as never);
    await recordToolCall(ctx, toolName, args, true, Date.now() - started, summarise(result));
    return { ok: true, result };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    await recordToolCall(ctx, toolName, args, false, Date.now() - started, error);
    return { ok: false, error };
  }
}

/**
 * The set handed to the model: the intersection, and nothing else.
 *
 * Errors are returned as data rather than thrown, so a failed tool lets the
 * agent adapt instead of ending the run.
 */
export function buildToolSet(ctx: RunContext): ToolSet {
  const set: ToolSet = {};
  for (const definition of resolveTools(ctx.allowlist)) {
    set[definition.name] = tool({
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: async (args: unknown) => {
        const outcome = await dispatchToolCall(ctx, definition.name, args);
        return outcome.ok ? outcome.result : { error: outcome.error };
      },
    });
  }
  return set;
}

/** Exposed for the run trace and the agent editor. */
export function describeCapabilities(allowlist: readonly string[]): string[] {
  return resolveTools(allowlist).map((t) => `${t.name}: ${REGISTRY[t.name].description}`);
}

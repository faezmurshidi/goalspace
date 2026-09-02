# Project Intake — Slice 2c-2: The Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After creating a project, the owner is asked five to ten questions by the Interviewer, and the Planner proposes a flat work breakdown they accept or reject as a set.

**Architecture:** One route at `/projects/[slug]/intake` holding three client states. Three server actions drive it. Cost metering is first extracted from the ask route into `lib/agents/usage.ts` so the new tooled-run path cannot drift from it, then `runTooled` joins `runStructured` as the second consumer.

**Tech Stack:** TypeScript · Next.js 16 App Router · React 19 · `ai@7.0.66` (`generateText`, `generateObject`) · `zod@3` · i18next · Vitest 4

**Spec:** [docs/superpowers/specs/2026-09-02-project-intake-design.md](../specs/2026-09-02-project-intake-design.md)
**Builds on:** [slice 2c-1](2026-09-02-intake-slice-2c1-agents.md) — the Interviewer, the Planner, `runStructured`, and `trigger = 'intake'` are already shipped and verified against production.

## Global Constraints

- **Agents propose, they never write.** The Planner's proposals are rows in `proposals`. Nothing becomes a work item until Task 8's action applies it.
- **Skip is a real exit, on every step.** A plain text link, never a greyed-out tertiary button, never phrased as a loss. It navigates to `/projects/[slug]`.
- **No gate that outlives the moment.** No `intake_completed` column, no redirect from the resume view. Only `CreateProjectForm` routes anyone here.
- **Voice:** plain, specific, unsentimental. No progress bar, no step counter framed as achievement, no "You're all set!". See PRODUCT.md and spec §7.3.
- **Every user-facing string is a locale key** in `en`, `ms` and `zh`. Layouts must survive strings ~40% longer than English.
- **Every failure ends at a usable project.** Spec §10 is the checklist; Task 9 verifies it.
- **Test-first**, and **working directory is `apps/app`** unless stated otherwise.
- **Node ≥22 is required** — `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` before any `pnpm test:rls`, or the whole suite fails on a missing native WebSocket.

---

### Task 1: Extract run metering to `lib/agents/usage.ts`

Pure refactor, no behaviour change. Done first so `runTooled` has one definition to consume rather than a third copy to write.

**Files:**
- Create: `apps/app/lib/agents/usage.ts`
- Modify: `apps/app/app/api/agents/[agentId]/ask/route.ts`, `apps/app/lib/agents/structured.ts`
- Test: `apps/app/tests/unit/agents-usage.test.ts`

**Interfaces:**
- Produces:
  - `tokensFromUsage(usage): { nonCachedInput: number; outputTokens: number; cachedInput: number }`
  - `recordRunUsage(supabase, params): Promise<void>` where `params` is `{ projectId, ownerId, agentId, runId, workItemId, model, usage, providerMetadata }`
  - `finishRun(supabase, runId, patch): Promise<void>` where `patch` is `{ status, stepCount?, error? }`

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/agents-usage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { tokensFromUsage } from '@/lib/agents/usage';

const usage = (over: Partial<Record<string, unknown>> = {}) => ({
  inputTokens: 100,
  outputTokens: 20,
  inputTokenDetails: { noCacheTokens: 70, cacheReadTokens: 30, cacheWriteTokens: 0 },
  ...over,
});

describe('tokensFromUsage', () => {
  it('keeps cached and non-cached input disjoint', () => {
    // costUsd prices the two at different rates and adds both, so reporting
    // the total as input_tokens double-counts every cached token.
    const t = tokensFromUsage(usage() as never);
    expect(t.nonCachedInput).toBe(70);
    expect(t.cachedInput).toBe(30);
    expect(t.nonCachedInput + t.cachedInput).toBe(100);
  });

  it('falls back to inputTokens when the provider reports no detail', () => {
    const t = tokensFromUsage(
      usage({ inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined } }) as never
    );
    expect(t.nonCachedInput).toBe(100);
    expect(t.cachedInput).toBe(0);
  });

  it('reports zero rather than NaN when nothing is known', () => {
    // A run that failed before its first token still gets a usage row. NaN
    // there would poison the month-to-date sum the caps are checked against.
    const t = tokensFromUsage({
      inputTokens: undefined,
      outputTokens: undefined,
      inputTokenDetails: {},
    } as never);
    expect(t).toEqual({ nonCachedInput: 0, outputTokens: 0, cachedInput: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/agents-usage.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/usage`.

- [ ] **Step 3: Write the module**

Create `apps/app/lib/agents/usage.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LanguageModelUsage } from 'ai';

import { costUsd, gatewayCostFrom } from '@/lib/agents/cost';
import type { Database } from '@/types/supabase';

/**
 * One definition of what a run cost and how it is recorded.
 *
 * Three callers now reach this: the streaming ask route, `runStructured`, and
 * `runTooled`. They differ in how the model is invoked and in nothing else, so
 * the accounting lives here rather than being copied into each. The copy that
 * drifts would be the one nobody is looking at, and it would drift silently —
 * a mispriced run reads as a cheaper run, never as an error.
 */

type Client = SupabaseClient<Database>;

export interface RunTokens {
  nonCachedInput: number;
  outputTokens: number;
  cachedInput: number;
}

/**
 * Splits a usage report into the three counts `costUsd` prices separately.
 *
 * `ai@7` moved cached tokens into `inputTokenDetails`; there is no
 * `usage.cachedInputTokens`. The two input counts must stay disjoint because
 * `costUsd` adds both at different rates, so `inputTokens` (the total) is only
 * a fallback for a provider that reports no detail at all.
 */
export function tokensFromUsage(usage: LanguageModelUsage): RunTokens {
  const cachedInput = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const nonCachedInput = usage.inputTokenDetails?.noCacheTokens ?? usage.inputTokens ?? 0;
  return {
    nonCachedInput,
    outputTokens: usage.outputTokens ?? 0,
    cachedInput,
  };
}

export interface RecordUsageParams {
  projectId: string;
  ownerId: string;
  agentId: string;
  runId: string;
  workItemId: string | null;
  model: string;
  usage: LanguageModelUsage;
  providerMetadata: unknown;
}

export async function recordRunUsage(
  supabase: Client,
  params: RecordUsageParams
): Promise<void> {
  const { nonCachedInput, outputTokens, cachedInput } = tokensFromUsage(params.usage);

  await supabase.from('ai_usage').insert({
    project_id: params.projectId,
    owner_id: params.ownerId,
    agent_id: params.agentId,
    run_id: params.runId,
    work_item_id: params.workItemId,
    model: params.model,
    input_tokens: nonCachedInput,
    output_tokens: outputTokens,
    cached_input_tokens: cachedInput,
    cost_usd: costUsd({
      model: params.model,
      inputTokens: nonCachedInput,
      outputTokens,
      cachedInputTokens: cachedInput,
      // What the gateway says it charged beats the local table, which drifts
      // silently the moment a provider reprices.
      gatewayCostUsd: gatewayCostFrom(params.providerMetadata),
    }),
  });
}

export async function finishRun(
  supabase: Client,
  runId: string,
  patch: { status: 'succeeded' | 'failed' | 'capped'; stepCount?: number; error?: string }
): Promise<void> {
  await supabase
    .from('agent_runs')
    .update({
      status: patch.status,
      ...(patch.stepCount === undefined ? {} : { step_count: patch.stepCount }),
      ...(patch.error === undefined ? {} : { error: patch.error }),
      ended_at: new Date().toISOString(),
    })
    .eq('id', runId);
}
```

- [ ] **Step 4: Rewrite the ask route's callbacks to use it**

In `apps/app/app/api/agents/[agentId]/ask/route.ts`, replace the bodies of `onStepEnd`, `onEnd` and `onError`. Delete the now-unused `costUsd` and `gatewayCostFrom` imports, and add the new one:

```ts
import { recordRunUsage, finishRun } from '@/lib/agents/usage';
```

```ts
    onStepEnd: async (step) => {
      await recordRunUsage(supabase, {
        projectId: agent.project_id,
        ownerId: auth.user.id,
        agentId: agent.id,
        runId,
        workItemId: workItemId ?? null,
        model: agent.model,
        usage: step.usage,
        providerMetadata: step.providerMetadata,
      });
    },
    onEnd: async ({ steps }) => {
      await finishRun(supabase, runId, {
        status: cappedByTokens ? 'capped' : 'succeeded',
        stepCount: steps.length,
      });
    },
    onError: async ({ error }) => {
      await finishRun(supabase, runId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    },
```

`worstCaseUsd` is still imported and still used for the reservation — do not remove it.

- [ ] **Step 5: Rewrite `runStructured` to use it**

In `apps/app/lib/agents/structured.ts`, replace the inline `ai_usage` insert and the two `agent_runs` updates with `recordRunUsage` / `finishRun` calls, drop the now-unused `costUsd` / `gatewayCostFrom` imports and the local `endedAt` helper, and add:

```ts
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
```

The success path becomes:

```ts
    await recordRunUsage(supabase, {
      projectId: agent.project_id,
      ownerId,
      agentId: agent.id,
      runId,
      workItemId: null,
      model: agent.model,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });

    // One model call, so one step. Recorded rather than left at its default so
    // the trace does not imply the run did nothing.
    await finishRun(supabase, runId, { status: 'succeeded', stepCount: 1 });

    return { ok: true, runId, object: result.object };
```

and the catch becomes:

```ts
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(supabase, runId, { status: 'failed', error: message });
    return { ok: false, reason: 'failed', message };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 293 tests. The two `runStructured` guard cases still pass because the guard is above every line touched here.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS. This is the real check on the route edit: the metering block has no direct test, so a shape mismatch has to surface here.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/agents/usage.ts apps/app/lib/agents/structured.ts \
        "apps/app/app/api/agents/[agentId]/ask/route.ts" \
        apps/app/tests/unit/agents-usage.test.ts
git commit -m "refactor(agents): one definition of run cost metering"
```

---

### Task 2: `runTooled`

The Planner's execution path: a tool loop a server action can await.

**Files:**
- Create: `apps/app/lib/agents/tooled.ts`
- Test: `apps/app/tests/unit/agents-tooled.test.ts`

**Interfaces:**
- Consumes: `buildToolSet` and `RunContext` from `@/lib/agents/executor`; `recordRunUsage` / `finishRun` from `@/lib/agents/usage`; `getBudget`, `startAgentRun`, `checkCaps`, `worstCaseUsd` as in `runStructured`.
- Produces: `runTooled(input): Promise<TooledRunResult>` where input is `{ supabase, agent, ownerId, prompt, trigger? }`, `agent` is a `TooledAgent` (`StructuredAgent` plus nothing — same shape, re-exported name), and the result is `{ ok: true; runId: string; text: string } | { ok: false; reason: 'capped' | 'failed'; message: string }`.

Task 6's `submitIntakeAction` calls this, then lists the run's proposals by `runId`.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/agents-tooled.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { runTooled } from '@/lib/agents/tooled';

const AGENT = {
  id: '44444444-4444-4444-8444-444444444444',
  project_id: '11111111-1111-4111-8111-111111111111',
  system_prompt: 'Propose work.',
  model: 'openai/gpt-4o-mini',
  tools: ['search_repo', 'propose_work_item'] as readonly string[],
};

const OWNER = '22222222-2222-4222-8222-222222222222';

describe('runTooled', () => {
  it('refuses an agent with no tools', async () => {
    // The mirror of runStructured's guard. An agent with an empty allowlist
    // has no reason to be in a tool loop, and running one would spend a
    // reservation on a model call that can do nothing but talk.
    await expect(
      runTooled({
        supabase: null as never,
        agent: { ...AGENT, tools: [] },
        ownerId: OWNER,
        prompt: 'Break this down.',
      })
    ).rejects.toThrow(/no tools/i);
  });

  it('checks the allowlist before it touches the database', async () => {
    // `supabase: null` is the assertion, as in agents-structured.test.ts.
    await expect(
      runTooled({
        supabase: null as never,
        agent: { ...AGENT, tools: [] },
        ownerId: OWNER,
        prompt: 'Break this down.',
      })
    ).rejects.toThrow(/runTooled/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/agents-tooled.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/tooled`.

- [ ] **Step 3: Write the implementation**

Create `apps/app/lib/agents/tooled.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText, stepCountIs } from 'ai';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { startAgentRun, type RunTrigger } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import type { Database } from '@/types/supabase';

/**
 * A tool loop a server action can await.
 *
 * The ask route runs the same loop inside a stream, because a conversation
 * wants tokens as they arrive. An intake does not: the wizard needs the run id
 * and the proposals it produced, and has no use for the prose. Streaming to a
 * caller that discards the stream would also mean the action could not know
 * when the run finished.
 *
 * Everything that constitutes a control is shared: the reservation, the caps,
 * the tool set, and the metering. What differs is `generateText` in place of
 * `streamText`.
 */

export interface TooledAgent {
  id: string;
  project_id: string;
  system_prompt: string;
  model: string;
  tools: readonly string[];
}

export type TooledRunResult =
  | { ok: true; runId: string; text: string }
  | { ok: false; reason: 'capped' | 'failed'; message: string };

export interface TooledRunInput {
  supabase: SupabaseClient<Database>;
  agent: TooledAgent;
  ownerId: string;
  prompt: string;
  /** Defaults to 'intake', the only caller today. */
  trigger?: RunTrigger;
}

const MAX_STEPS = 12;

export async function runTooled(input: TooledRunInput): Promise<TooledRunResult> {
  const { supabase, agent, ownerId, prompt, trigger = 'intake' } = input;

  // First, before any I/O — the mirror of runStructured's guard. An agent with
  // an empty allowlist in a tool loop can only talk, and a reservation would
  // be spent on a run that cannot do the thing it was started for.
  if (agent.tools.length === 0) {
    throw new Error(
      `runTooled refuses agent ${agent.id}: it holds no tools, so a tool loop has nothing to call.`
    );
  }

  const budget = await getBudget(supabase, agent.project_id, ownerId);

  const start = await startAgentRun(supabase, {
    projectId: agent.project_id,
    agentId: agent.id,
    workItemId: null,
    trigger,
    reservedUsd: worstCaseUsd(agent.model, budget.per_run_token_cap),
  });

  if (!start.started) {
    const verdict = checkCaps({ budget, monthToDateUsd: start.monthToDateUsd, runTokens: 0 });
    return {
      ok: false,
      reason: 'capped',
      message: verdict.allowed
        ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
        : verdict.message,
    };
  }

  const runId = start.runId;
  let cappedByTokens = false;

  const context: RunContext = {
    supabase,
    projectId: agent.project_id,
    ownerId,
    agentId: agent.id,
    runId,
    allowlist: agent.tools,
    // Per-run, as in the ask route: a version read in one run must not vouch
    // for an edit proposed in another.
    documentVersions: new Map<string, string>(),
  };

  try {
    const result = await generateText({
      model: agent.model,
      system: agent.system_prompt,
      prompt,
      tools: buildToolSet(context),
      stopWhen: [
        stepCountIs(MAX_STEPS),
        ({ steps }) => {
          const runTokens = steps.reduce((n, s) => n + (s.usage.totalTokens ?? 0), 0);
          // Only the per-run cap is live mid-run: the monthly cap was settled
          // atomically at start and this run's worst case is already reserved.
          const verdict = checkCaps({ budget, monthToDateUsd: 0, runTokens });
          if (!verdict.allowed) cappedByTokens = true;
          return !verdict.allowed;
        },
      ],
      maxRetries: 1,
    });

    // generateText resolves once, so usage is recorded per step here rather
    // than through an onStepEnd callback. Same rows, same rates.
    for (const step of result.steps) {
      await recordRunUsage(supabase, {
        projectId: agent.project_id,
        ownerId,
        agentId: agent.id,
        runId,
        workItemId: null,
        model: agent.model,
        usage: step.usage,
        providerMetadata: step.providerMetadata,
      });
    }

    await finishRun(supabase, runId, {
      status: cappedByTokens ? 'capped' : 'succeeded',
      stepCount: result.steps.length,
    });

    // A capped run keeps whatever it produced. Its proposals are real and the
    // owner still reviews them; the trace records that it was cut short.
    return { ok: true, runId, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(supabase, runId, { status: 'failed', error: message });
    return { ok: false, reason: 'failed', message };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/agents-tooled.test.ts`
Expected: PASS, both cases.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/tooled.ts apps/app/tests/unit/agents-tooled.test.ts
git commit -m "feat(intake): add runTooled, an awaitable tool loop"
```

---

### Task 3: Intake schemas

**Files:**
- Create: `apps/app/lib/schemas/intake.ts`
- Test: `apps/app/tests/unit/intake-schema.test.ts`

**Interfaces:**
- Produces:
  - `intakeQuestionsSchema` — `z.object({ questions: z.array(intakeQuestionSchema).min(5).max(10) })`, the object handed to `runStructured`
  - `IntakeQuestion` — `{ id: string; question: string; purpose: string }`
  - `intakeAnswersSchema` — `z.object({ answers: z.array(z.object({ id, question, answer })) })`
  - `applyIntakeSchema` — `z.object({ proposalIds: string[]; questionIds: string[] })`
  - `answeredPairs(answers)` / `unansweredQuestions(answers)` — the split Tasks 6 and 8 both need

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/intake-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  answeredPairs,
  applyIntakeSchema,
  intakeAnswersSchema,
  intakeQuestionsSchema,
  unansweredQuestions,
} from '@/lib/schemas/intake';

const question = (n: number) => ({
  id: `q${n}`,
  question: `Question ${n}?`,
  purpose: 'Because.',
});

describe('intakeQuestionsSchema', () => {
  it('rejects fewer than five questions', () => {
    // The bound is the contract, enforced by the schema rather than requested
    // in the prompt. generateObject retries the model against it.
    const four = { questions: [1, 2, 3, 4].map(question) };
    expect(intakeQuestionsSchema.safeParse(four).success).toBe(false);
  });

  it('rejects more than ten', () => {
    const eleven = { questions: Array.from({ length: 11 }, (_, i) => question(i)) };
    expect(intakeQuestionsSchema.safeParse(eleven).success).toBe(false);
  });

  it('accepts five and accepts ten', () => {
    for (const n of [5, 10]) {
      const set = { questions: Array.from({ length: n }, (_, i) => question(i)) };
      expect(intakeQuestionsSchema.safeParse(set).success, `${n} questions`).toBe(true);
    }
  });
});

describe('answeredPairs and unansweredQuestions', () => {
  const answers = [
    { id: 'q1', question: 'What is it?', answer: 'A sawmill.' },
    { id: 'q2', question: 'What is unresolved?', answer: '   ' },
    { id: 'q3', question: 'What is decided?', answer: '' },
  ];

  it('treats whitespace as unanswered', () => {
    // Otherwise a stray space silently becomes an "answer" in the log entry
    // and the question is never offered as an open loop.
    expect(answeredPairs(answers)).toHaveLength(1);
    expect(unansweredQuestions(answers).map((q) => q.id)).toEqual(['q2', 'q3']);
  });

  it('partitions without losing or duplicating a question', () => {
    expect(answeredPairs(answers).length + unansweredQuestions(answers).length).toBe(
      answers.length
    );
  });
});

describe('applyIntakeSchema', () => {
  it('accepts empty selections', () => {
    // Rejecting every proposal and keeping no questions is a legitimate
    // outcome, not a validation failure.
    expect(applyIntakeSchema.safeParse({ proposalIds: [], questionIds: [] }).success).toBe(true);
  });

  it('rejects a proposal id that is not a uuid', () => {
    const bad = { proposalIds: ['not-a-uuid'], questionIds: [] };
    expect(applyIntakeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('intakeAnswersSchema', () => {
  it('caps an answer at 2000 characters', () => {
    const long = {
      answers: [{ id: 'q1', question: 'How?', answer: 'x'.repeat(2_001) }],
    };
    expect(intakeAnswersSchema.safeParse(long).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/intake-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/intake`.

- [ ] **Step 3: Write the schemas**

Create `apps/app/lib/schemas/intake.ts`:

```ts
import { z } from 'zod';

/**
 * The intake's own shapes.
 *
 * `intakeQuestionsSchema` is handed to `generateObject`, so its bounds are the
 * contract with the model: a set outside five-to-ten is rejected at the tool
 * layer and retried, rather than asked for in the prompt and hoped for.
 */

export const intakeQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  question: z.string().min(1).max(300),
  /**
   * Why the question is worth asking. Never rendered — a question that needs
   * justifying to the owner is a badly written question. It exists so the
   * model has somewhere to put its reasoning instead of smuggling it into the
   * question text.
   */
  purpose: z.string().max(300),
});

export const intakeQuestionsSchema = z.object({
  questions: z.array(intakeQuestionSchema).min(5).max(10),
});

export const intakeAnswerSchema = intakeQuestionSchema
  .omit({ purpose: true })
  .extend({ answer: z.string().max(2_000) });

export const intakeAnswersSchema = z.object({
  answers: z.array(intakeAnswerSchema).min(1).max(10),
});

export const applyIntakeSchema = z.object({
  /** Proposed work items the owner ticked. */
  proposalIds: z.array(z.string().uuid()).max(12),
  /** Unanswered questions the owner chose to keep as open loops. */
  questionIds: z.array(z.string().min(1).max(64)).max(10),
});

export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;
export type IntakeAnswer = z.infer<typeof intakeAnswerSchema>;
export type ApplyIntakeValues = z.infer<typeof applyIntakeSchema>;

/**
 * Whitespace is not an answer.
 *
 * Treating "   " as answered would put an empty line in the log entry under a
 * question heading, and would silently deny the owner the chance to keep that
 * question as an open loop.
 */
function isAnswered(a: IntakeAnswer): boolean {
  return a.answer.trim().length > 0;
}

export function answeredPairs(answers: IntakeAnswer[]): IntakeAnswer[] {
  return answers.filter(isAnswered);
}

export function unansweredQuestions(answers: IntakeAnswer[]): IntakeAnswer[] {
  return answers.filter((a) => !isAnswered(a));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/intake-schema.test.ts`
Expected: PASS, all nine cases.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/schemas/intake.ts apps/app/tests/unit/intake-schema.test.ts
git commit -m "feat(intake): schemas for questions, answers and the apply set"
```

---

### Task 4: The intake note body

The Q&A pairs become one `note` entry in the owner's own words. Pure formatting, so it is tested directly.

**Files:**
- Create: `apps/app/lib/intake/note.ts`
- Test: `apps/app/tests/unit/intake-note.test.ts`

**Interfaces:**
- Produces: `intakeNoteBody(answers: IntakeAnswer[]): string`

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/intake-note.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { intakeNoteBody } from '@/lib/intake/note';

describe('intakeNoteBody', () => {
  const answers = [
    { id: 'q1', question: 'What are you building?', answer: 'A bandsaw sawmill.' },
    { id: 'q2', question: 'What is unresolved?', answer: '' },
    { id: 'q3', question: 'What constrains it?', answer: 'A 3kW single-phase supply.' },
  ];

  it('includes only the answered questions', () => {
    // An unanswered question is an open loop, recorded as a work item. Putting
    // it in the note as a heading with nothing under it would say the owner
    // answered and had nothing to say.
    const body = intakeNoteBody(answers);
    expect(body).toContain('What are you building?');
    expect(body).toContain('A bandsaw sawmill.');
    expect(body).not.toContain('What is unresolved?');
  });

  it('keeps the questions in the order they were asked', () => {
    const body = intakeNoteBody(answers);
    expect(body.indexOf('What are you building?')).toBeLessThan(
      body.indexOf('What constrains it?')
    );
  });

  it('returns an empty string when nothing was answered', () => {
    // The caller writes no entry at all in this case; returning a document of
    // headings with no content would put an empty note in the log.
    expect(intakeNoteBody([{ id: 'q1', question: 'Why?', answer: '  ' }])).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/intake-note.test.ts`
Expected: FAIL — cannot resolve `@/lib/intake/note`.

- [ ] **Step 3: Write the module**

Create `apps/app/lib/intake/note.ts`:

```ts
import { answeredPairs, type IntakeAnswer } from '@/lib/schemas/intake';

/**
 * The intake answers as one log entry, in the owner's own words.
 *
 * Markdown headings rather than a transcript format, because the log renders
 * markdown and because this entry is read later as reference, not as a record
 * of a conversation. The questions are kept: an answer without its question is
 * unreadable in a month, which is the moment this entry exists for.
 *
 * Returns an empty string when nothing was answered, so the caller can decline
 * to write an entry at all rather than filing one with no content.
 */
export function intakeNoteBody(answers: IntakeAnswer[]): string {
  const answered = answeredPairs(answers);
  if (answered.length === 0) return '';

  return answered.map((a) => `**${a.question}**\n\n${a.answer.trim()}`).join('\n\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/intake-note.test.ts`
Expected: PASS, all three cases.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/intake/note.ts apps/app/tests/unit/intake-note.test.ts
git commit -m "feat(intake): format the answers as one log entry"
```

---

### Task 5: `startIntakeAction`

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/intake/actions.ts`
- Modify: none
- Test: covered by Task 9's live run — see the note below.

**Interfaces:**
- Consumes: `runStructured`, `intakeQuestionsSchema`, `getProjectBySlug`, `requireSessionContext`.
- Produces: `startIntakeAction(slug): Promise<ActionResult<{ questions: IntakeQuestion[] }>>`

**Why no unit test:** the action is four calls to already-tested units and one model call. A unit test would mock `runStructured`, `getProjectBySlug` and the agents query, then assert they were called — a test of the mocks. The behaviour that can actually break is the live path, which Task 9 exercises against a real project.

- [ ] **Step 1: Write the action**

Create `apps/app/app/(workspace)/projects/[slug]/intake/actions.ts`:

```ts
'use server';

import { fail, ok, type ActionResult } from '@/lib/actions/result';
import { runStructured } from '@/lib/agents/structured';
import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { intakeQuestionsSchema, type IntakeQuestion } from '@/lib/schemas/intake';

/**
 * The intake's three actions.
 *
 * Kept out of `app/(workspace)/actions.ts`, which is already long enough that
 * one more feature's worth of exports makes it harder to read. They follow the
 * same conventions: the project is resolved from the slug under the caller's
 * own session, and failures come back as an `ActionResult` carrying an i18n
 * key rather than prose.
 */

const AGENT_COLUMNS = 'id, project_id, owner_id, system_prompt, model, tools, is_active';

async function resolveAgent(slug: string, agentSlug: 'interviewer' | 'planner') {
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) return { supabase, userId, project: null, agent: null };

  // RLS restricts this to the caller's own rows; the project filter makes the
  // ownership explicit rather than relying on the policy for correctness.
  const { data: agent } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', project.id)
    .eq('slug', agentSlug)
    .maybeSingle();

  return { supabase, userId, project, agent };
}

export async function startIntakeAction(
  slug: string
): Promise<ActionResult<{ questions: IntakeQuestion[] }>> {
  const { supabase, userId, project, agent } = await resolveAgent(slug, 'interviewer');
  if (!project) return fail('app.errors.projectMissing');
  // A deleted or deactivated Interviewer is not an error page. The wizard says
  // so and offers skip, because a project without an intake is a fine project.
  if (!agent || !agent.is_active) return fail('app.intake.interviewerMissing');

  const result = await runStructured({
    supabase,
    agent,
    ownerId: userId,
    schema: intakeQuestionsSchema,
    prompt: [
      `Project title: ${project.title}`,
      `Kind: ${project.kind}`,
      project.brief ? `Brief: ${project.brief}` : 'Brief: (none given)',
    ].join('\n'),
  });

  if (!result.ok) {
    // The cap message is written for a person and names the cap that refused,
    // so it is surfaced rather than flattened into a generic failure.
    return fail(result.reason === 'capped' ? result.message : 'app.intake.questionsFailed');
  }

  return ok({ questions: result.object.questions });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/intake/actions.ts"
git commit -m "feat(intake): startIntakeAction runs the Interviewer"
```

---

### Task 6: `submitIntakeAction`

Writes the note entry, then runs the Planner and returns its proposals.

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/intake/actions.ts`

**Interfaces:**
- Produces: `submitIntakeAction(slug, input): Promise<ActionResult<{ proposals: ProposedItem[]; entryId: string | null; plannerFailed: boolean }>>` where `ProposedItem` is `{ id: string; title: string; kind: string; rationale: string }`.

- [ ] **Step 1: Add the action**

Append to `apps/app/app/(workspace)/projects/[slug]/intake/actions.ts`, and extend the imports:

```ts
import { revalidatePath } from 'next/cache';

import { runTooled } from '@/lib/agents/tooled';
import { createEntry } from '@/lib/db/entries';
import { listRunProposals } from '@/lib/db/proposals';
import { intakeNoteBody } from '@/lib/intake/note';
import { answeredPairs, intakeAnswersSchema } from '@/lib/schemas/intake';
```

```ts
export interface ProposedItem {
  id: string;
  title: string;
  kind: string;
  rationale: string;
}

export async function submitIntakeAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ proposals: ProposedItem[]; entryId: string | null; plannerFailed: boolean }>> {
  const parsed = intakeAnswersSchema.safeParse(input);
  if (!parsed.success) return fail('app.errors.validation');

  const { supabase, userId, project, agent } = await resolveAgent(slug, 'planner');
  if (!project) return fail('app.errors.projectMissing');

  // The entry is written first and independently of the Planner. The owner's
  // own words are the part of this that must not be lost to a model failure —
  // a project with the answers recorded and no breakdown is a good outcome; a
  // project with neither is the one the intake existed to prevent.
  const body = intakeNoteBody(parsed.data.answers);
  let entryId: string | null = null;

  if (body.length > 0) {
    try {
      const entry = await createEntry(supabase, {
        projectId: project.id,
        ownerId: userId,
        // agent_id stays null: the owner typed these words. The Interviewer
        // contributed the prompt, not the content, and holds no write tool.
        agentId: null,
        values: {
          kind: 'note',
          title: project.title,
          body,
          work_item_id: null,
        },
      });
      entryId = entry.id;
    } catch (error) {
      console.error('submitIntakeAction could not record the answers', error);
      return fail('app.intake.answersFailed');
    }
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/log`);

  if (!agent || !agent.is_active) {
    // No Planner, but the answers are safely in the log. The review step
    // renders with no proposed work rather than losing the submission.
    return ok({ proposals: [], entryId, plannerFailed: true });
  }

  const answered = answeredPairs(parsed.data.answers);
  const run = await runTooled({
    supabase,
    agent,
    ownerId: userId,
    prompt: [
      `The owner has just created this project and answered questions about it.`,
      `Their answers are recorded in the log as entry ${entryId ?? '(none)'}.`,
      `Read that entry, then propose the work that follows from it.`,
      '',
      `Project: ${project.title}`,
      `Kind: ${project.kind}`,
      '',
      ...answered.map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`),
    ].join('\n'),
  });

  if (!run.ok) {
    console.error('submitIntakeAction planner run failed', run.message);
    return ok({ proposals: [], entryId, plannerFailed: true });
  }

  // By run id, not by project: a project may already hold pending proposals
  // from an earlier run, and offering those here would ask the owner to accept
  // work this intake did not propose.
  const proposals = await listRunProposals(supabase, run.runId);

  return ok({
    entryId,
    plannerFailed: false,
    proposals: proposals
      .filter((p) => p.kind === 'work_item')
      .map((p) => {
        const payload = p.payload as { title?: string; kind?: string };
        return {
          id: p.id,
          title: payload.title ?? '(untitled)',
          kind: payload.kind ?? 'task',
          rationale: p.rationale,
        };
      }),
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/intake/actions.ts"
git commit -m "feat(intake): submitIntakeAction records answers and runs the Planner"
```

---

### Task 7: `applyIntakeAction`

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/intake/actions.ts`

**Interfaces:**
- Produces: `applyIntakeAction(slug, answers, input): Promise<ActionResult<{ applied: number; questions: number; failed: number }>>`

- [ ] **Step 1: Add the action**

Append, extending the imports with:

```ts
import { settleProposal } from '@/lib/db/proposals';
import { createWorkItem } from '@/lib/db/work-items';
import { applyProposal } from '@/lib/proposals/apply';
import { applyIntakeSchema, unansweredQuestions } from '@/lib/schemas/intake';
```

```ts
export async function applyIntakeAction(
  slug: string,
  answersInput: unknown,
  input: unknown
): Promise<ActionResult<{ applied: number; questions: number; failed: number }>> {
  const parsedAnswers = intakeAnswersSchema.safeParse(answersInput);
  const parsed = applyIntakeSchema.safeParse(input);
  if (!parsedAnswers.success || !parsed.success) return fail('app.errors.validation');

  const { supabase, userId, project, agent } = await resolveAgent(slug, 'interviewer');
  if (!project) return fail('app.errors.projectMissing');

  let applied = 0;
  let failed = 0;

  // One at a time, in list order. applyProposal claims each conditionally from
  // `pending`, so a second tab racing this yields one row rather than two.
  for (const proposalId of parsed.data.proposalIds) {
    const outcome = await applyProposal(supabase, { proposalId, ownerId: userId });
    if (outcome.status === 'applied') applied += 1;
    else failed += 1;
  }

  const kept = unansweredQuestions(parsedAnswers.data.answers).filter((q) =>
    parsed.data.questionIds.includes(q.id)
  );

  let questions = 0;
  for (const q of kept) {
    try {
      await createWorkItem(supabase, {
        projectId: project.id,
        ownerId: userId,
        // The words are the Interviewer's, so the provenance is too. The row
        // exists because the owner ticked it, which is the same act as
        // accepting a proposal — see spec §8.2.
        agentId: agent?.id ?? null,
        values: {
          title: q.question,
          body: '',
          kind: 'question',
          parent_id: null,
          wake_at: null,
        },
      });
      questions += 1;
    } catch (error) {
      console.error('applyIntakeAction could not open a question', error);
      failed += 1;
    }
  }

  revalidatePath('/', 'layout');
  return ok({ applied, questions, failed });
}

/**
 * Reject the proposals the owner did not tick.
 *
 * Separate from applying, and called by the same submit: a proposal left
 * `pending` would surface later in an inbox the owner has never opened, as
 * though it were still undecided. Failures are swallowed — a proposal that
 * could not be rejected is a stale row in the inbox, which is a far smaller
 * problem than failing an apply that already created real work items.
 */
export async function rejectIntakeRemainderAction(
  proposalIds: string[]
): Promise<ActionResult<{ rejected: number }>> {
  const { supabase } = await requireSessionContext();

  let rejected = 0;
  for (const id of proposalIds) {
    try {
      const settled = await settleProposal(supabase, id, 'rejected', { from: 'pending' });
      if (settled) rejected += 1;
    } catch (error) {
      console.error('rejectIntakeRemainderAction failed for', id, error);
    }
  }

  revalidatePath('/', 'layout');
  return ok({ rejected });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/intake/actions.ts"
git commit -m "feat(intake): applyIntakeAction applies the accepted set"
```

---

### Task 8: The wizard route

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/intake/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/intake/intake-wizard.tsx`
- Modify: `apps/app/components/project/create-project-form.tsx:47` (the push target)
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**Interfaces:**
- Consumes: all three actions from Task 5–7; `IntakeQuestion` and `IntakeAnswer` from `@/lib/schemas/intake`.

- [ ] **Step 1: Add the locale keys**

Add an `intake` block under `app` in `packages/i18n/src/locales/en.json`:

```json
"intake": {
  "title": "A few questions",
  "body": "Answers go into the log as your first entry. Skip any that do not apply.",
  "asking": "Working out what to ask",
  "planning": "Reading your answers",
  "submit": "Continue",
  "skip": "Skip and go to the project",
  "reviewTitle": "Proposed work",
  "reviewBody": "Nothing is created until you accept it. Untick anything you do not want.",
  "openTitle": "Questions you left open",
  "openBody": "Kept as open questions in the work tree, where the resume view will surface them.",
  "apply_one": "Create {{count}} item",
  "apply_other": "Create {{count}} items",
  "applyNone": "Create nothing and continue",
  "applying": "Creating",
  "noProposals": "The Planner proposed nothing. Your answers are recorded either way.",
  "interviewerMissing": "This project has no Interviewer, so there are no questions to ask.",
  "plannerMissing": "This project has no Planner, so no work was proposed.",
  "questionsFailed": "The questions could not be drafted. Your project is ready either way.",
  "answersFailed": "Your answers could not be recorded. Nothing was lost — try again."
}
```

Add the same block to `ms.json` and `zh.json`, translated. Malay and Chinese renderings of "Skip and go to the project" and the two `apply_*` plurals are the long strings — check them against the button width in Step 5.

- [ ] **Step 2: Write the server page**

Create `apps/app/app/(workspace)/projects/[slug]/intake/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getLocale } from '@/lib/format';
import { IntakeWizard } from './intake-wizard';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = getFixedT(await getLocale());
  return { title: t('app.intake.title') };
}

/**
 * Reached once, from project creation, and never again on its own.
 *
 * There is no gate column and no redirect from the resume view: navigating
 * straight to /projects/[slug] always shows the record. A setup step that
 * outlived the moment would be the ceremony PRODUCT.md rules out, and would
 * punish the owner for having closed a tab.
 */
export default async function IntakePage({ params }: Params) {
  const { slug } = await params;
  const { supabase, userId } = await requireSessionContext();

  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <IntakeWizard slug={slug} />
    </div>
  );
}
```

- [ ] **Step 3: Write the client wizard**

Create `apps/app/app/(workspace)/projects/[slug]/intake/intake-wizard.tsx`:

```tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';

import type { IntakeAnswer, IntakeQuestion } from '@/lib/schemas/intake';
import {
  applyIntakeAction,
  rejectIntakeRemainderAction,
  startIntakeAction,
  submitIntakeAction,
  type ProposedItem,
} from './actions';

type Stage = 'asking' | 'answering' | 'planning' | 'reviewing';

export function IntakeWizard({ slug }: { slug: string }) {
  const { t } = useAppTranslations();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('asking');
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<ProposedItem[]>([]);
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set());
  const [keptQuestions, setKeptQuestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Cap refusals come back as prose written for a person, not as a key —
   * checkCaps owns that wording and it names the cap and the figure. Every
   * other failure is a key. One helper so the two cannot be confused, and so
   * a raw key never reaches the screen.
   */
  const describe = (message: string) => (message.startsWith('app.') ? t(message) : message);

  const headingId = useId();
  // React 19 StrictMode mounts effects twice in development. Without this the
  // Interviewer runs twice on every load, which is two reservations and two
  // charges for one intake.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const result = await startIntakeAction(slug);
      if (!result.ok) {
        setError(describe(result.message));
        setStage('answering');
        return;
      }
      setQuestions(result.data.questions);
      setStage('answering');
    })();
  }, [slug, t]);

  const answerList = (): IntakeAnswer[] =>
    questions.map((q) => ({ id: q.id, question: q.question, answer: answers[q.id] ?? '' }));

  async function submitAnswers() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStage('planning');

    const payload = { answers: answerList() };
    const result = await submitIntakeAction(slug, payload);

    if (!result.ok) {
      setError(describe(result.message));
      setStage('answering');
      setBusy(false);
      return;
    }

    setProposals(result.data.proposals);
    // Checked by default: the owner asked for a breakdown and this is it.
    setAcceptedItems(new Set(result.data.proposals.map((p) => p.id)));
    // Unchecked by default: nothing is created by walking away. See spec §8.2.
    setKeptQuestions(new Set());
    if (result.data.plannerFailed && result.data.proposals.length === 0) {
      setError(t('app.intake.plannerMissing'));
    }
    setStage('reviewing');
    setBusy(false);
  }

  async function apply() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const accepted = [...acceptedItems];
    const declined = proposals.map((p) => p.id).filter((id) => !acceptedItems.has(id));

    const result = await applyIntakeAction(slug, { answers: answerList() }, {
      proposalIds: accepted,
      questionIds: [...keptQuestions],
    });

    // Rejection is best-effort and deliberately not gating navigation: a
    // proposal left pending is a stale inbox row, not lost work.
    if (declined.length > 0) await rejectIntakeRemainderAction(declined);

    if (!result.ok) {
      setError(describe(result.message));
      setBusy(false);
      return;
    }

    router.push(`/projects/${slug}`);
    router.refresh();
  }

  const skip = (
    <p className="mt-8">
      <Link href={`/projects/${slug}`} className="label text-ink-soft underline">
        {t('app.intake.skip')}
      </Link>
    </p>
  );

  if (stage === 'asking' || stage === 'planning') {
    return (
      <div>
        <h1 id={headingId} className="wdth-wide text-headline text-ink font-bold">
          {t('app.intake.title')}
        </h1>
        {/* A shaped skeleton rather than the word "Loading", so the plate holds
            its footprint and the page does not jump when the form arrives. */}
        <div
          role="status"
          aria-live="polite"
          aria-label={t(stage === 'asking' ? 'app.intake.asking' : 'app.intake.planning')}
          className="border-rule bg-paper-shade mt-8 h-96 border"
        />
        {skip}
      </div>
    );
  }

  if (stage === 'reviewing') {
    const openQuestions = answerList().filter((a) => a.answer.trim().length === 0);
    const total = acceptedItems.size + keptQuestions.size;

    return (
      <div>
        <h1 className="wdth-wide text-headline text-ink font-bold">
          {t('app.intake.reviewTitle')}
        </h1>
        <p className="prose-measure text-ink-soft mt-3">{t('app.intake.reviewBody')}</p>

        {error ? (
          <p role="alert" className="label text-oxide mt-6">
            {error}
          </p>
        ) : null}

        {proposals.length === 0 ? (
          <p className="text-ink-soft mt-8">{t('app.intake.noProposals')}</p>
        ) : (
          <fieldset className="mt-8">
            <legend className="label text-ink-soft">{t('app.intake.reviewTitle')}</legend>
            <ul className="border-rule border-t">
              {proposals.map((p) => (
                <li key={p.id} className="border-rule border-b py-3">
                  <label className="flex items-baseline gap-3">
                    <input
                      type="checkbox"
                      checked={acceptedItems.has(p.id)}
                      onChange={(e) =>
                        setAcceptedItems((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-body text-ink block">{p.title}</span>
                      <span className="label text-ink-soft block">{p.rationale}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {openQuestions.length > 0 ? (
          <fieldset className="mt-10">
            <legend className="label text-ink-soft">{t('app.intake.openTitle')}</legend>
            <p className="prose-measure text-ink-soft mt-2">{t('app.intake.openBody')}</p>
            <ul className="border-rule mt-4 border-t">
              {openQuestions.map((q) => (
                <li key={q.id} className="border-rule border-b py-3">
                  <label className="flex items-baseline gap-3">
                    <input
                      type="checkbox"
                      checked={keptQuestions.has(q.id)}
                      onChange={(e) =>
                        setKeptQuestions((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(q.id);
                          else next.delete(q.id);
                          return next;
                        })
                      }
                    />
                    <span className="text-body text-ink min-w-0 flex-1">{q.question}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <Button
          type="button"
          onClick={apply}
          disabled={busy}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-10 h-12 w-full disabled:opacity-60"
        >
          {busy
            ? t('app.intake.applying')
            : total === 0
              ? t('app.intake.applyNone')
              : t('app.intake.apply', { count: total })}
        </Button>
        {skip}
      </div>
    );
  }

  return (
    <div>
      <h1 className="wdth-wide text-headline text-ink font-bold">{t('app.intake.title')}</h1>
      <p className="prose-measure text-ink-soft mb-8 mt-3">{t('app.intake.body')}</p>

      {error ? (
        <p role="alert" className="label text-oxide mb-6">
          {error}
        </p>
      ) : null}

      {questions.length === 0 ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitAnswers();
          }}
          className="border-rule bg-paper border p-8"
        >
          {questions.map((q, i) => (
            <div key={q.id} className={i === 0 ? 'flex flex-col gap-2' : 'mt-6 flex flex-col gap-2'}>
              <label htmlFor={`q-${q.id}`} className="label text-ink-soft">
                {q.question}
              </label>
              <Textarea
                id={`q-${q.id}`}
                rows={2}
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="bg-paper text-body text-ink"
              />
            </div>
          ))}

          <Button
            type="submit"
            disabled={busy}
            className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-8 h-12 w-full disabled:opacity-60"
          >
            {t('app.intake.submit')}
          </Button>
        </form>
      )}
      {skip}
    </div>
  );
}
```

- [ ] **Step 4: Route creation into the wizard**

In `apps/app/components/project/create-project-form.tsx`, change the push target on line 47:

```ts
    router.push(`/projects/${result.data.slug}/intake`);
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

Run: `pnpm test`
Expected: PASS — 302 tests. Nothing here touches a tested module.

- [ ] **Step 6: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/intake/" \
        apps/app/components/project/create-project-form.tsx \
        packages/i18n/src/locales/
git commit -m "feat(intake): the three-step wizard"
```

---

### Task 9: Live verification

The slice's real test. Every unit below the wizard is tested; what is not is the live path through two model calls.

**Files:** none.

- [ ] **Step 1: Apply the branch's migrations and start the app**

The `'intake'` trigger migration is already live on the remote project. Confirm nothing else is pending, then:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
pnpm dev
```

- [ ] **Step 2: Create a project and walk the wizard**

Create a throwaway project. Confirm, in order:

1. Creation lands on `/projects/<slug>/intake`, not the resume view.
2. Between five and ten questions render, and none of them asks about motivation or a deadline.
3. Answering some and leaving others blank, then Continue, reaches the review step.
4. Proposed items are checked by default; open questions are unchecked by default.
5. The apply button names the count.

- [ ] **Step 3: Verify what landed**

```sql
select 'entries' as t, count(*) from entries where project_id = '<id>'
union all select 'work_items', count(*) from work_items where project_id = '<id>'
union all select 'proposals pending', count(*) from proposals where project_id = '<id>' and status = 'pending'
union all select 'proposals rejected', count(*) from proposals where project_id = '<id>' and status = 'rejected';

select trigger, status, step_count from agent_runs where project_id = '<id>' order by started_at;
select model, input_tokens, output_tokens, cost_usd from ai_usage where project_id = '<id>';
```

Expected: one `note` entry with `agent_id` null; work items matching what was ticked; **no** pending proposals left; two `agent_runs` rows both with `trigger = 'intake'`; two or more `ai_usage` rows with a non-zero `cost_usd`.

- [ ] **Step 4: Verify the escapes**

1. Navigate to `/projects/<slug>` directly — the resume view renders, no redirect back to the intake.
2. Create a second project and click skip immediately — it lands on the resume view with `FirstRun` showing, and no entry, work item, or proposal exists for it.

- [ ] **Step 5: Delete the throwaway projects**

Through the settings Danger Zone, so the cascade is exercised. Then confirm no orphaned rows:

```sql
select count(*) from agents a where not exists (select 1 from projects p where p.id = a.project_id);
```

- [ ] **Step 6: Commit any fixes found, then finish**

Use superpowers:finishing-a-development-branch.

---

## Deferred, on purpose

- **Editing a proposed item's wording before accepting.** The inbox has it (`proposal-card.tsx`); the intake review step does not. A first-run surface with a JSON payload editor in it is worse than one without.
- **Nested breakdowns.** Spec §5.3 — `parent_id` is a real uuid and nothing exists at intake time.
- **The server-side twelve-item cap.** The Planner is told the ceiling in its prompt; `applyIntakeSchema` caps `proposalIds` at 12, which bounds what can be applied. A Planner proposing more than twelve would have the surplus silently undisplayable — worth a follow-up, not a blocker.
- **Retrying a failed Interviewer run.** The wizard offers skip, not retry. Re-entering the URL restarts it.

## Done when

- `pnpm test`, `pnpm typecheck` and `pnpm test:rls` all pass.
- Creating a project lands on the intake; skipping at any step lands on a project indistinguishable from one created before this shipped.
- A completed intake leaves one owner-authored note, the accepted work items, no pending proposals, and two `agent_runs` rows with `trigger = 'intake'`.
- Navigating to `/projects/[slug]` never redirects back into the wizard.

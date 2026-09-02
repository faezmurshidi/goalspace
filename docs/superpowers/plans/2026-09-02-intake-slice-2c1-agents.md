# Project Intake — Slice 2c-1: Agents and Execution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed every new project with an Interviewer that holds no tools and a Planner that can propose work items and nothing else, and add a metered structured-output execution path for the Interviewer to run on.

**Architecture:** Two entries appended to `SEEDED_TEMPLATES`, so they arrive through the existing `seedAgents` call in `createProject` with no change to the creation path. A new `lib/agents/structured.ts` wraps `generateObject` with the same budget reservation, cap check, cost metering and run recording the streaming route uses, and refuses outright to run an agent that holds an allowlist it would not enforce. One migration widens `agent_runs.trigger` so an intake run is distinguishable in the trace.

**Tech Stack:** TypeScript · Next.js 16 · `ai@7.0.66` (`generateObject`) · `zod@3` · Vitest 4 · Supabase Postgres

**Spec:** [docs/superpowers/specs/2026-09-02-project-intake-design.md](../specs/2026-09-02-project-intake-design.md)

## Global Constraints

- **No UI in this slice.** No route, no component, no locale string. Slice 2c-2 builds the wizard. A task here that renders anything is out of scope.
- **Agents propose, they never write.** The Planner's only write tool is `propose_work_item`, which inserts into `proposals` and nowhere else.
- **Agents are capability boundaries, not personas.** Enforced by the registry and proven by test, never by prompt instruction. No test in this slice may assert a capability by reading the system prompt as if it were a control.
- **Model:** both templates use `DEFAULT_MODEL`, the existing constant in `lib/agents/templates.ts` (`openai/gpt-4o-mini`). Do not introduce a second default and do not hardcode the slug.
- **Voice:** system prompts are plain, specific, unsentimental. No welcoming, no congratulating, no "let's get started". See PRODUCT.md.
- **Breakdown is flat.** Twelve items is the ceiling. The Planner is told not to set `parent_id`; the server-side cap arrives in slice 2c-3.
- **Test-first.** Domain logic in this repository is written test-first. Every task below writes the failing test before the implementation.
- **Working directory** for every command is `apps/app` unless stated otherwise.

---

### Task 1: `agent_runs.trigger` accepts `'intake'`

`agent_runs.trigger` has been `check (trigger in ('conversation','work_item_action'))` since phase 2a. Both intake runs are neither — nobody asked a question and no work item was acted on — so the insert in Task 4 would fail the constraint.

**Files:**
- Create: `apps/app/supabase/migrations/20260902000100_intake_run_trigger.sql`
- Modify: `apps/app/lib/db/agents.ts:8` (the `RunTrigger` union)
- Test: `apps/app/tests/rls/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RunTrigger = 'conversation' | 'work_item_action' | 'intake'`, exported from `@/lib/db/agents`. Task 4 passes `'intake'` into `startAgentRun`.

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/rls/schema.test.ts`. It uses the same `createTestUser` fixture helper as `tests/rls/runs-read.test.ts`, so add the import if the file does not already have it.

```ts
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

describe('agent_runs.trigger', () => {
  let owner: TestUser | undefined;
  let projectId: string;
  let agentId: string;

  beforeAll(async () => {
    owner = await createTestUser(`trigger-${Date.now()}@example.test`);

    const { data: project } = await owner.client
      .from('projects')
      .insert({
        owner_id: owner.id,
        title: 'Intake trigger',
        slug: `trigger-${Date.now()}`,
        kind: 'build',
      })
      .select()
      .single();
    projectId = project!.id;

    const { data: agent } = await owner.client
      .from('agents')
      .insert({
        project_id: projectId,
        owner_id: owner.id,
        slug: 'interviewer',
        name: 'Interviewer',
        system_prompt: 'Ask.',
        model: 'openai/gpt-4o-mini',
      })
      .select()
      .single();
    agentId = agent!.id;
  });

  afterAll(async () => {
    if (owner) await deleteTestUser(owner);
  });

  it('accepts an intake run', async () => {
    // Both intake runs are neither a conversation nor an action on a work
    // item. Filing them as 'conversation' would make the cost of an intake
    // unrecoverable from the trace once the Planner is reachable from a
    // general ask surface, because the agent id stops discriminating.
    const { error } = await owner!.client.from('agent_runs').insert({
      project_id: projectId,
      owner_id: owner!.id,
      agent_id: agentId,
      trigger: 'intake',
      status: 'running',
    });

    expect(error).toBeNull();
  });

  it('still refuses a trigger it does not know', async () => {
    // The constraint is widened, not removed. A typo must remain a write
    // that fails rather than a value nothing can interpret.
    const { error } = await owner!.client.from('agent_runs').insert({
      project_id: projectId,
      owner_id: owner!.id,
      agent_id: agentId,
      trigger: 'onboarding',
      status: 'running',
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe('23514');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:rls -- -t "agent_runs.trigger"`
Expected: FAIL — "accepts an intake run" reports a `23514` check-constraint violation instead of `null`.

If this errors with a missing `API_URL` or `SERVICE_ROLE_KEY`, the RLS suite needs a live Supabase project and `.env.test`; start it with `pnpm db:start` from `apps/app`.

- [ ] **Step 3: Write the migration**

Create `apps/app/supabase/migrations/20260902000100_intake_run_trigger.sql`:

```sql
-- Intake runs are neither a conversation nor an action on a work item.
--
-- The project intake (spec 2026-09-02, §9.1) opens two runs at project
-- creation: an Interviewer that asks and a Planner that proposes. Filing them
-- as 'conversation' was the alternative to this migration and is rejected —
-- once the Planner is reachable from a general ask surface the agent id no
-- longer tells an intake run from an owner-initiated one, and the cost of an
-- intake becomes unrecoverable from the trace.
--
-- Dropped and recreated rather than widened in place: Postgres has no ALTER
-- CONSTRAINT for a CHECK. The name is the one Postgres generated for the
-- inline check in 20260818000100_phase2a_agents.sql.
alter table agent_runs drop constraint agent_runs_trigger_check;

alter table agent_runs add constraint agent_runs_trigger_check
  check (trigger in ('conversation', 'work_item_action', 'intake'));
```

- [ ] **Step 4: Apply it and widen the TypeScript union**

Run: `pnpm db:reset` (from `apps/app`).

Then in `apps/app/lib/db/agents.ts`, change line 8:

```ts
export type RunTrigger = 'conversation' | 'work_item_action' | 'intake';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:rls -- -t "agent_runs.trigger"`
Expected: PASS, both cases.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/supabase/migrations/20260902000100_intake_run_trigger.sql \
        apps/app/lib/db/agents.ts \
        apps/app/tests/rls/schema.test.ts
git commit -m "feat(intake): agent_runs.trigger accepts 'intake'"
```

---

### Task 2: The Interviewer template

The agent that asks the questions. Its allowlist is empty, and that is the whole point: a project seconds old has no record to retrieve, so an agent claiming retrieval would claim a capability it cannot exercise.

**Files:**
- Modify: `apps/app/lib/agents/templates.ts` (append to `SEEDED_TEMPLATES`)
- Test: `apps/app/tests/unit/agents-templates.test.ts`

**Interfaces:**
- Consumes: `AgentTemplate` and `DEFAULT_MODEL`, both already in `templates.ts`.
- Produces: a template with `slug: 'interviewer'` and `tools: []`. Task 4's caller resolves it by that slug.

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/unit/agents-templates.test.ts`. Add `isAllowed` to the existing import from `@/lib/agents/tools/registry`:

```ts
import { isAllowed, REGISTRY, REPO_READ } from '@/lib/agents/tools/registry';

describe('the Interviewer', () => {
  it('is seeded with no tools at all', () => {
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer');
    expect(interviewer).toBeDefined();
    expect(interviewer!.tools).toEqual([]);
  });

  it('is refused every tool in the registry', () => {
    // Asserted through isAllowed rather than against the array's length,
    // because isAllowed is the gate the executor re-checks on every call.
    // A test of the data would still pass if the gate stopped consulting it.
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer')!;
    for (const name of Object.keys(REGISTRY)) {
      expect(isAllowed(interviewer.tools, name)).toBe(false);
    }
  });

  it('does not claim a capability it has no tool for', () => {
    // Same rule the Tutor is held to: a description that promises retrieval
    // is a lie the model repeats to the owner.
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer')!;
    const claims = `${interviewer.role_description} ${interviewer.system_prompt}`.toLowerCase();
    expect(claims).not.toContain('search');
    expect(claims).not.toContain('retrieve');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- -t "the Interviewer"`
Expected: FAIL with "expected undefined to be defined" on the first case.

- [ ] **Step 3: Add the template**

Append to `SEEDED_TEMPLATES` in `apps/app/lib/agents/templates.ts`, after the Tutor:

```ts
  {
    slug: 'interviewer',
    name: 'Interviewer',
    role_description: 'Asks what the record does not yet say. Holds no tools.',
    system_prompt: [
      'You ask the questions that make a new project legible to someone',
      'picking it up in a month — including the owner.',
      '',
      'Ask between five and ten. Cover the shape of the thing, the constraints',
      'it has to live inside, what has already been decided, and what is still',
      'open. Every question must be answerable in a sentence or two by someone',
      'who has not thought about it yet.',
      '',
      'Do not ask what motivates them. Do not ask for a date they have no',
      'basis to estimate. Do not welcome them, congratulate them, or remark',
      'that the project sounds interesting.',
      '',
      'You hold no tools. There is nothing in the record to read yet and you',
      'cannot write to it. Never offer to look anything up.',
    ].join('\n'),
    tools: [],
    model: DEFAULT_MODEL,
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/agents-templates.test.ts`
Expected: PASS — the three new cases, and every pre-existing case in the file. The existing `agentRowsFor` suite counts `SEEDED_TEMPLATES.length` rather than a literal, so it absorbs the new entry without edit.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/templates.ts apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(intake): seed an Interviewer that holds no tools"
```

---

### Task 3: The Planner template

Reads the intake note through the real repo-read path, then proposes top-level work items. It reaches `propose_work_item` and neither of the other two write tools.

**Files:**
- Modify: `apps/app/lib/agents/templates.ts` (append to `SEEDED_TEMPLATES`)
- Test: `apps/app/tests/unit/agents-templates.test.ts`

**Interfaces:**
- Consumes: `REPO_READ` from `@/lib/agents/tools/registry`; `DEFAULT_MODEL` from `templates.ts`.
- Produces: a template with `slug: 'planner'` and `tools: [...REPO_READ, 'propose_work_item']`.

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/unit/agents-templates.test.ts`:

```ts
describe('the Planner', () => {
  it('is seeded with repo-read plus the work-item write tool', () => {
    const planner = SEEDED_TEMPLATES.find((t) => t.slug === 'planner');
    expect(planner).toBeDefined();
    expect(planner!.tools).toContain('propose_work_item');
    for (const name of REPO_READ) {
      expect(planner!.tools).toContain(name);
    }
  });

  it('cannot write to the log or to documents', () => {
    // One write tool, not three. A Planner that decides mid-run to rewrite
    // the brief must be refused by the registry, not by its prompt.
    const planner = SEEDED_TEMPLATES.find((t) => t.slug === 'planner')!;
    expect(planner.tools).not.toContain('propose_entry');
    expect(planner.tools).not.toContain('propose_document_edit');
  });

  it('shares no tool with the Interviewer', () => {
    // The pair is the design's clearest statement that agents are capability
    // boundaries rather than personas: same project, same model, disjoint
    // reach. If this ever passes trivially because one of them lost its
    // tools, the preceding cases catch it.
    const planner = SEEDED_TEMPLATES.find((t) => t.slug === 'planner')!;
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer')!;
    const shared = planner.tools.filter((name) => interviewer.tools.includes(name));
    expect(shared).toEqual([]);
  });

  it('reaches nothing outside the project', () => {
    const planner = SEEDED_TEMPLATES.find((t) => t.slug === 'planner')!;
    for (const name of planner.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].external).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- -t "the Planner"`
Expected: FAIL with "expected undefined to be defined" on the first case.

- [ ] **Step 3: Add the template**

Append to `SEEDED_TEMPLATES` in `apps/app/lib/agents/templates.ts`, after the Interviewer:

```ts
  {
    slug: 'planner',
    name: 'Planner',
    role_description:
      'Reads what you said about a new project and proposes the work that follows from it.',
    system_prompt: [
      'You read the owner’s own answers about a new project and propose the',
      'work that follows from them.',
      '',
      'Read before you propose. The answers are in the log as a single entry;',
      'find it, read it, and cite it. A citation you invent is rejected and',
      'the proposal discarded, so never cite an id you have not seen in a',
      'tool result.',
      '',
      'Propose only work the answers support. Twelve items is a ceiling, not a',
      'target: four items the owner recognises beats twelve where eight were',
      'guessed. Inventing a phase they never mentioned is worse than proposing',
      'nothing.',
      '',
      'Every item is top-level. Do not set parent_id — nothing exists yet for',
      'an item to hang from.',
      '',
      'Write titles in the owner’s register: plain, specific, unsentimental.',
      'You cannot create anything. propose_work_item makes a suggestion the',
      'owner accepts or rejects, so never say you have added or created an',
      'item — say what you have proposed.',
    ].join('\n'),
    tools: [...REPO_READ, 'propose_work_item'],
    model: DEFAULT_MODEL,
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/agents-templates.test.ts`
Expected: PASS — all four new cases plus every pre-existing one.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/templates.ts apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(intake): seed a Planner that can only propose work items"
```

---

### Task 4: `runStructured`

The Interviewer needs structured output and makes no tool calls. The existing route is `streamText` plus a tool loop — the wrong shape. This is a second entry point sharing every control that matters, not a second executor.

**Files:**
- Create: `apps/app/lib/agents/structured.ts`
- Test: `apps/app/tests/unit/agents-structured.test.ts`

**Interfaces:**
- Consumes: `getBudget` from `@/lib/db/budgets`; `startAgentRun` and `RunTrigger` from `@/lib/db/agents`; `checkCaps` from `@/lib/agents/caps`; `costUsd`, `gatewayCostFrom`, `worstCaseUsd` from `@/lib/agents/cost`.
- Produces:
  - `StructuredAgent` — `{ id: string; project_id: string; system_prompt: string; model: string; tools: readonly string[] }`
  - `StructuredRunResult<T>` — `{ ok: true; runId: string; object: T } | { ok: false; reason: 'capped' | 'failed'; message: string }`
  - `runStructured<T>(input): Promise<StructuredRunResult<T>>` where `input` is `{ supabase, agent, ownerId, prompt, schema, trigger? }`, `schema` is a `z.ZodType<T>` and `trigger` defaults to `'intake'`.

Slice 2c-2's `startIntakeAction` calls this and nothing else.

**Scope of the test:** only the allowlist guard is unit-tested here, and deliberately. Everything past the guard is I/O — a budget read, an RPC, a model call — and a unit test of it would be a test of three mocks agreeing with each other. The guard is the one piece of real logic in the module, and it is the one whose failure is silent. The rest is covered live when slice 2c-2 wires the wizard.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/agents-structured.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { runStructured } from '@/lib/agents/structured';

const AGENT = {
  id: '33333333-3333-4333-8333-333333333333',
  project_id: '11111111-1111-4111-8111-111111111111',
  system_prompt: 'Ask between five and ten questions.',
  model: 'openai/gpt-4o-mini',
  tools: [] as readonly string[],
};

const OWNER = '22222222-2222-4222-8222-222222222222';
const SCHEMA = z.object({ questions: z.array(z.string()) });

describe('runStructured', () => {
  it('refuses an agent that holds tools', async () => {
    // A structured run builds no tool set, so an allowlist handed to it would
    // be dropped rather than enforced — an agent that looks capable and is
    // checked against nothing. That is the one failure this module must never
    // produce, so it throws rather than degrading.
    await expect(
      runStructured({
        supabase: null as never,
        agent: { ...AGENT, tools: ['search_repo'] },
        ownerId: OWNER,
        prompt: 'A robot arm.',
        schema: SCHEMA,
      })
    ).rejects.toThrow(/tool/i);
  });

  it('checks the allowlist before it touches the database', async () => {
    // `supabase: null` is the assertion. If the guard ever moves below the
    // budget read, this case fails with a TypeError on null instead of the
    // guard's own message — which is exactly the regression worth catching,
    // because a guard that runs after a reservation has already opened a run
    // it will never close.
    await expect(
      runStructured({
        supabase: null as never,
        agent: { ...AGENT, tools: ['propose_work_item'] },
        ownerId: OWNER,
        prompt: 'A robot arm.',
        schema: SCHEMA,
      })
    ).rejects.toThrow(/structured runs build no tool set/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/agents-structured.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/structured`.

- [ ] **Step 3: Write the implementation**

Create `apps/app/lib/agents/structured.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import type { z } from 'zod';

import { checkCaps } from '@/lib/agents/caps';
import { costUsd, gatewayCostFrom, worstCaseUsd } from '@/lib/agents/cost';
import { startAgentRun, type RunTrigger } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import type { Database } from '@/types/supabase';

/**
 * A metered run that returns an object instead of a stream.
 *
 * The second entry point to the agent layer, not a second executor. It shares
 * the reservation, the cap check, the cost metering and the run recording with
 * `app/api/agents/[agentId]/ask/route.ts`; what it does not share is the tool
 * loop, because it has none.
 *
 * That absence is the reason for the guard below. `buildToolSet` is never
 * called here, so an agent handed to this function with a non-empty allowlist
 * would run with its capabilities silently dropped — describable in the agents
 * list, unenforced in practice. Refusing loudly is the only honest option: a
 * capability boundary that is sometimes not consulted is not a boundary.
 */

export interface StructuredAgent {
  id: string;
  project_id: string;
  system_prompt: string;
  model: string;
  tools: readonly string[];
}

export type StructuredRunResult<T> =
  | { ok: true; runId: string; object: T }
  | { ok: false; reason: 'capped' | 'failed'; message: string };

export interface StructuredRunInput<T> {
  supabase: SupabaseClient<Database>;
  agent: StructuredAgent;
  ownerId: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Defaults to 'intake', the only caller in slice 2c-2. */
  trigger?: RunTrigger;
}

export async function runStructured<T>(
  input: StructuredRunInput<T>
): Promise<StructuredRunResult<T>> {
  const { supabase, agent, ownerId, prompt, schema, trigger = 'intake' } = input;

  // First, before any I/O. A guard that ran after the reservation would leave
  // an opened run nothing ever closes, holding budget until it ages out.
  if (agent.tools.length > 0) {
    throw new Error(
      `runStructured refuses agent ${agent.id}: it holds ${agent.tools.length} tool(s) and ` +
        'structured runs build no tool set, so the allowlist would not be enforced.'
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
    // Same two-case wording as the ask route: checkCaps owns the message, but
    // it only refuses on spend already recorded, so a refusal can also mean
    // in-flight runs hold the headroom.
    const verdict = checkCaps({
      budget,
      monthToDateUsd: start.monthToDateUsd,
      runTokens: 0,
    });
    return {
      ok: false,
      reason: 'capped',
      message: verdict.allowed
        ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
        : verdict.message,
    };
  }

  const runId = start.runId;
  const endedAt = () => new Date().toISOString();

  try {
    const result = await generateObject({
      model: agent.model,
      system: agent.system_prompt,
      prompt,
      schema,
      maxRetries: 1,
    });

    // Same disjointness rule as the streaming route: costUsd prices input and
    // cached input at different rates and adds both, so the non-cached count
    // is what goes in input_tokens, never the total.
    const cachedInput = result.usage.inputTokenDetails.cacheReadTokens ?? 0;
    const nonCachedInput =
      result.usage.inputTokenDetails.noCacheTokens ?? result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;

    await supabase.from('ai_usage').insert({
      project_id: agent.project_id,
      owner_id: ownerId,
      agent_id: agent.id,
      run_id: runId,
      work_item_id: null,
      model: agent.model,
      input_tokens: nonCachedInput,
      output_tokens: outputTokens,
      cached_input_tokens: cachedInput,
      cost_usd: costUsd({
        model: agent.model,
        inputTokens: nonCachedInput,
        outputTokens,
        cachedInputTokens: cachedInput,
        gatewayCostUsd: gatewayCostFrom(result.providerMetadata),
      }),
    });

    // One model call, so one step. Recorded rather than left at its default so
    // the trace does not imply the run did nothing.
    await supabase
      .from('agent_runs')
      .update({ status: 'succeeded', step_count: 1, ended_at: endedAt() })
      .eq('id', runId);

    return { ok: true, runId, object: result.object };
  } catch (error) {
    // A schema mismatch lands here too: generateObject throws when the model
    // returns something the schema rejects, which is how the five-to-ten
    // question bound is enforced rather than requested.
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from('agent_runs')
      .update({ status: 'failed', error: message, ended_at: endedAt() })
      .eq('id', runId);

    return { ok: false, reason: 'failed', message };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/agents-structured.test.ts`
Expected: PASS, both cases.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

`generateObject`'s `usage` is a `LanguageModelUsage` (`node_modules/ai/dist/index.d.ts:320`), whose `inputTokenDetails` is non-optional and carries `noCacheTokens`, `cacheReadTokens` and `cacheWriteTokens`, each `number | undefined`. The accounting above is written against that shape and matches the streaming route line for line. If a later `ai` upgrade moves it, fix the property names — do not delete the cached-token accounting to make it compile, because recording cached tokens as ordinary input over-prices every cached run.

- [ ] **Step 5: Run the whole unit suite**

Run: `pnpm test` (from `apps/app`)
Expected: PASS. Nothing in this task touches an existing module, so a failure here is a real regression, not a fixture that needs updating.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/agents/structured.ts apps/app/tests/unit/agents-structured.test.ts
git commit -m "feat(intake): add runStructured, a metered structured-output run"
```

---

## Deferred, on purpose

Spec §12 lists the unit tests for the whole of phase 2c. These are not in this slice and are not forgotten:

- `intakeQuestionsSchema` / `intakeAnswersSchema` bounds — slice 2c-2, with `lib/schemas/intake.ts`. Nothing in 2c-1 constructs a schema, so there is none to test yet.
- Unanswered-question → work-item mapping — slice 2c-3, with the code that does the mapping.
- Everything in `runStructured` past the allowlist guard — covered live when 2c-2 wires the wizard; see the scope note on Task 4.

## Done when

- `pnpm test` and `pnpm typecheck` pass from the repository root.
- `pnpm test:rls` passes against a live project.
- A newly created project seeds four agents: Critic, Tutor, Interviewer, Planner.
- `isAllowed(interviewer.tools, name)` is false for every name in the registry.
- The Interviewer and the Planner share no tool.
- `runStructured` throws before touching the database when handed an agent that holds tools.

Slice 2c-2 builds the wizard route, the three server actions and the locale strings on top of this. Nothing in this slice is reachable from the UI, which is intended: the capability boundary is worth landing and reviewing on its own.

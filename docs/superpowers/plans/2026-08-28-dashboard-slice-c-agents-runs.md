# Workspace Dashboard, Slice C: Agents and Runs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner a surface to see and edit what each agent is allowed to do, and a trace showing exactly what a run did — including what left the system.

**Architecture:** Four new read/write paths in `lib/db/`, one new zod schema module, one pure grouping function, and three routes. The capability grouping is derived from the tool registry's own `writes` / `external` flags rather than a hand-kept list, so a tool added later files itself into the right group without touching this UI. Nothing here changes the executor or the enforcement path — slice C is a window onto data phase 2a already writes.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres + RLS) · zod · Vitest.

**Spec:** [docs/superpowers/specs/2026-08-26-workspace-dashboard-design.md](../specs/2026-08-26-workspace-dashboard-design.md) — §6.2 (agents), §6.3 (run trace), §7 (data work), §9 (delivery). Slices A and B are merged to `main`.

## Global Constraints

- **WCAG 2.1 AA.** Every form control has a label. Status is never colour alone. Body measure capped at 65–75 characters in documents and run traces.
- **Every string in `en`, `ms`, `zh`.** All three locale files must end with identical key sets. **No test enforces this today** — a missing `zh` key shipped undetected and was fixed only after the fact in PR #22. Task 5 adds the guard before this slice writes ~40 new keys into three files. Layouts must survive strings ~40% longer than English.
- **There is no `danger` colour token.** The palette is `paper` / `paper-shade` / `ink` / `ink-soft` / `rule` / `rule-strong` / `oxide` / `oxide-deep` / `waiting`. `text-danger` compiles to nothing and renders in the inherited colour. Error text uses `text-oxide`, with `role="alert"`.
- **Square corners, no shadows.** `borderRadius` and `boxShadow` are flattened to zero in `apps/app/tailwind.config.ts`. Separation is by hairline rule and ground.
- **`next.config.js` sets `trailingSlash: true`.** `usePathname()` returns `/projects/x/`; anything comparing paths must normalise. `lib/shell/destinations.ts` already does — reuse `isActive`, never hand-roll a comparison.
- **`apps/app` vitest runs `environment: 'node'` with `include: ['tests/**/*.test.ts']`.** No jsdom, no testing-library, no `.tsx` test files. Component behaviour is verified by rendering through `react-dom/server` (see `tests/unit/markdown.test.ts`) or in a browser, never by a component test.
- **RLS tests are the security regression gate.** `apps/app/tests/rls` runs two-user isolation against the local Supabase stack via `apps/app/.env.test`. When you add a read path, extend them.
- **Node 22+.** `source ~/.nvm/nvm.sh && nvm use 22`, then `corepack pnpm <script>` from the repo root.
- **Agents propose; they never write.** Nothing in this slice may add a mutation path an agent can reach.
- **Capability boundaries are enforced by code and proven by test, never by prompt instruction.**

## Rulings taken while writing this plan

Recorded here so an executor does not re-litigate them, and so a reviewer can overturn them deliberately.

**R1 — The model field is a `<select>` over the rate table, validated server-side.**
§6.2 lists "model" as an editable field but does not say what may be entered. It must not be free text. `lib/agents/cost.ts` has two paths that fail *silently* on a model absent from `RATES`: `costUsd` returns `0` (line 93), recording a run as free and disabling the monthly cap for that model; and `worstCaseUsd` returns `0` (line 83), so `start_agent_run` reserves nothing and the concurrency protection lapses entirely. A free-text field turns both from theoretical into reachable by typo. Constraining the field to `Object.keys(RATES)` and rejecting anything else server-side makes them unreachable rather than merely unlikely. Pricing an unknown model from a gateway lookup is the more flexible answer and is deliberately deferred — this ruling does not foreclose it.

**R2 — No create and no delete for agents in this slice.**
§7's data-work table names exactly `listAgents`, `getAgent`, `updateAgent`. §6.2 describes delete's *rule* (refused while runs exist, deactivate offered instead) but the table does not ask for the path, and no create form is described anywhere. Shipping delete without create would let an owner empty a project of agents with no way to refill it. The `is_active` toggle in the editor covers the deactivation need §6.2 actually cares about. Both belong in a later slice, together.

**R3 — A run is reached from its agent or its proposal, never browsed.**
Straight from §5 of the spec: *"Run traces are not in the sidebar. A run is reached from the agent that produced it or the proposal it created."* So the agent editor carries a recent-runs list, and the inbox proposal card gains a link to the run that produced it. There is no `/runs` index, and none should be added.

**R4 — Cost on a trace is summed from `ai_usage`, not read from `agent_runs`.**
`agent_runs` has no cost column; it has `reserved_usd`, which is a pre-flight reservation, not a charge. The spent figure is `sum(ai_usage.cost_usd) where run_id = ...`. Showing the reservation as if it were the cost would overstate every completed run.

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/app/lib/agents/tool-groups.ts` | **Create.** Pure: `REGISTRY` → three named capability groups. No I/O. |
| `apps/app/lib/schemas/agent.ts` | **Create.** zod schema for an agent update, including the tools and model allowlists. |
| `apps/app/lib/db/agents.ts` | **Modify.** Gains `listAgents`, `getAgent`, `updateAgent` alongside the existing `startAgentRun`. |
| `apps/app/lib/db/runs.ts` | **Create.** `getRun`, `listToolCalls`, `listRunProposals`, `listRunsForAgent`, `runCostUsd`. |
| `apps/app/app/(workspace)/actions.ts` | **Modify.** Gains `updateAgentAction`. |
| `apps/app/lib/shell/destinations.ts` | **Modify.** Adds the agents destination. |
| `apps/app/app/(workspace)/projects/[slug]/agents/page.tsx` | **Create.** The list. |
| `apps/app/app/(workspace)/projects/[slug]/agents/loading.tsx` | **Create.** Skeleton, matching the sibling routes. |
| `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/page.tsx` | **Create.** Editor shell + recent runs. |
| `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/agent-editor.tsx` | **Create.** The client form. |
| `apps/app/app/(workspace)/projects/[slug]/runs/[runId]/page.tsx` | **Create.** The trace. |
| `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx` | **Modify.** Link to the run that produced the proposal. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | **Modify.** New strings, all three. |

---

## Task 1: Capability grouping

The registry already knows which group each tool belongs to. This turns that into the three named groups §6.2 specifies, as a pure function so the ordering rules are testable without a database.

**Files:**
- Create: `apps/app/lib/agents/tool-groups.ts`
- Test: `apps/app/tests/unit/tool-groups.test.ts`

**Interfaces:**
- Consumes: `REGISTRY`, `REGISTRY_NAMES`, `ToolName`, `ToolDefinition` from `@/lib/agents/tools/registry`.
- Produces: `type ToolGroupKey = 'reads' | 'proposes' | 'external'`, `interface ToolGroup { key: ToolGroupKey; labelKey: string; noteKey?: string; tools: ToolDefinition[] }`, `function toolGroups(): ToolGroup[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/tool-groups.test.ts
import { describe, expect, it } from 'vitest';

import { REGISTRY_NAMES } from '@/lib/agents/tools/registry';
import { toolGroups } from '@/lib/agents/tool-groups';

describe('toolGroups', () => {
  it('returns the three groups in a fixed order', () => {
    expect(toolGroups().map((g) => g.key)).toEqual(['reads', 'proposes', 'external']);
  });

  it('files every registered tool into exactly one group', () => {
    const filed = toolGroups().flatMap((g) => g.tools.map((t) => t.name));
    expect([...filed].sort()).toEqual([...REGISTRY_NAMES].sort());
    expect(new Set(filed).size).toBe(filed.length);
  });

  it('separates reads from proposals by the registry flag, not by name', () => {
    const groups = Object.fromEntries(toolGroups().map((g) => [g.key, g.tools.map((t) => t.name)]));
    expect(groups.reads).toContain('search_repo');
    expect(groups.reads).toContain('read_document');
    expect(groups.proposes).toContain('propose_entry');
    expect(groups.proposes).toContain('propose_document_edit');
    expect(groups.reads).not.toContain('propose_entry');
  });

  it('keeps the external group present but empty until a tool leaves the system', () => {
    // web_search and generate_audio will land here. The group renders as an
    // explicit "none yet" rather than disappearing, so the boundary is visible
    // before anything crosses it.
    const external = toolGroups().find((g) => g.key === 'external');
    expect(external).toBeDefined();
    expect(external!.tools).toEqual([]);
  });

  it('preserves registry order within a group', () => {
    const reads = toolGroups().find((g) => g.key === 'reads')!.tools.map((t) => t.name);
    const expected = REGISTRY_NAMES.filter((n) => reads.includes(n));
    expect(reads).toEqual(expected);
  });

  it('gives every group a translation key and only the writing group a note', () => {
    const groups = toolGroups();
    expect(groups.every((g) => g.labelKey.startsWith('app.agents.tools.'))).toBe(true);
    expect(groups.find((g) => g.key === 'proposes')!.noteKey).toBe('app.agents.tools.proposesNote');
    expect(groups.find((g) => g.key === 'reads')!.noteKey).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/tool-groups.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/tool-groups`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/tool-groups.ts
import { REGISTRY, REGISTRY_NAMES, type ToolDefinition } from '@/lib/agents/tools/registry';

export type ToolGroupKey = 'reads' | 'proposes' | 'external';

export interface ToolGroup {
  key: ToolGroupKey;
  labelKey: string;
  /** Rendered under the group heading. Only the writing group needs one. */
  noteKey?: string;
  tools: ToolDefinition[];
}

/**
 * Tools grouped by what they permit, not alphabetically.
 *
 * The grouping is derived from `writes` and `external` on the registry entry
 * itself, so a tool added later files itself. A hand-kept list here would let
 * a new tool default into the read group by omission — which is the one
 * mistake this grouping exists to make impossible to overlook.
 *
 * The order is fixed and deliberate: what an agent can see, then what it can
 * ask for, then what leaves the building. It reads as escalating consequence.
 */
export function toolGroups(): ToolGroup[] {
  const all = REGISTRY_NAMES.map((name) => REGISTRY[name]);

  return [
    {
      key: 'reads',
      labelKey: 'app.agents.tools.reads',
      tools: all.filter((t) => !t.writes && !t.external),
    },
    {
      key: 'proposes',
      labelKey: 'app.agents.tools.proposes',
      noteKey: 'app.agents.tools.proposesNote',
      tools: all.filter((t) => t.writes && !t.external),
    },
    {
      // Empty today. Kept rather than hidden: the boundary should be visible
      // on the page before anything crosses it, so granting the first external
      // tool is an obvious act rather than a new section appearing.
      key: 'external',
      labelKey: 'app.agents.tools.external',
      tools: all.filter((t) => t.external),
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/tool-groups.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/tool-groups.ts apps/app/tests/unit/tool-groups.test.ts
git commit -m "feat(agents): group tools by what they permit, from the registry's own flags"
```

---

## Task 2: The agent update schema

**Files:**
- Create: `apps/app/lib/schemas/agent.ts`
- Test: `apps/app/tests/unit/agent-schema.test.ts`

**Interfaces:**
- Consumes: `requiredText` from `@/lib/schemas/common`; `REGISTRY_NAMES` from `@/lib/agents/tools/registry`; `RATES` from `@/lib/agents/cost`.
- Produces: `updateAgentSchema`, `type UpdateAgentValues = z.output<typeof updateAgentSchema>`, `MODEL_CHOICES: string[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agent-schema.test.ts
import { describe, expect, it } from 'vitest';

import { RATES } from '@/lib/agents/cost';
import { MODEL_CHOICES, updateAgentSchema } from '@/lib/schemas/agent';

const valid = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Critic',
  role_description: 'Argues with decisions.',
  system_prompt: 'You review decisions.',
  model: 'openai/gpt-4o-mini',
  is_active: true,
  tools: ['search_repo', 'read_document'],
};

describe('updateAgentSchema', () => {
  it('accepts a well-formed agent', () => {
    expect(updateAgentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty tool set — an agent may be granted nothing', () => {
    expect(updateAgentSchema.safeParse({ ...valid, tools: [] }).success).toBe(true);
  });

  it('rejects a tool that is not in the registry', () => {
    // resolveTools drops unknown names silently at run time, so a typo would
    // look like a working grant until someone wondered why the agent never
    // used it. Rejecting at the boundary is the only place it is visible.
    const result = updateAgentSchema.safeParse({ ...valid, tools: ['search_repo', 'delete_all'] });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate tools', () => {
    const result = updateAgentSchema.safeParse({
      ...valid,
      tools: ['search_repo', 'search_repo'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a model with no entry in the rate table', () => {
    // costUsd and worstCaseUsd both return 0 for an unpriced model, which
    // records the run as free and reserves nothing. Storing one would disable
    // the monthly cap and the concurrency guard at once, silently.
    const result = updateAgentSchema.safeParse({ ...valid, model: 'acme/not-a-model' });
    expect(result.success).toBe(false);
  });

  it('offers exactly the priced models as choices', () => {
    expect([...MODEL_CHOICES].sort()).toEqual(Object.keys(RATES).sort());
    expect(MODEL_CHOICES.length).toBeGreaterThan(0);
  });

  it('requires a name', () => {
    expect(updateAgentSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('requires a system prompt', () => {
    expect(updateAgentSchema.safeParse({ ...valid, system_prompt: '' }).success).toBe(false);
  });

  it('allows an empty role description', () => {
    // The column is `not null default ''`; a schema that demanded text here
    // would reject rows the database is perfectly happy with.
    expect(updateAgentSchema.safeParse({ ...valid, role_description: '' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/agent-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/agent`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/schemas/agent.ts
import { z } from 'zod';

import { requiredText } from './common';
import { REGISTRY_NAMES } from '@/lib/agents/tools/registry';
import { RATES } from '@/lib/agents/cost';

/**
 * The models an agent may be set to.
 *
 * Derived from the rate table rather than listed separately, because an
 * unpriced model is not merely undisplayable — it is dangerous. `costUsd`
 * returns 0 for a model absent from `RATES`, recording the run as free and so
 * disabling the monthly cap for it; `worstCaseUsd` returns 0, so
 * `start_agent_run` reserves nothing and the concurrency guard lapses. Both
 * fail silently. Tying the choices to the table means the two can only ever
 * disagree if someone deletes a rate out from under a stored agent.
 */
export const MODEL_CHOICES = Object.keys(RATES);

const toolName = z.enum(REGISTRY_NAMES);

export const updateAgentSchema = z.object({
  id: z.string().uuid(),
  name: requiredText(80),
  // `not null default ''` in the database, so empty is legitimate.
  role_description: z.string().max(280).default(''),
  system_prompt: requiredText(8_000),
  model: z.string().refine((m) => m in RATES, {
    message: 'Choose a model with a known rate.',
  }),
  is_active: z.boolean(),
  tools: z
    .array(toolName)
    .max(REGISTRY_NAMES.length)
    .refine((list) => new Set(list).size === list.length, {
      message: 'A tool may only be granted once.',
    }),
});

export type UpdateAgentValues = z.output<typeof updateAgentSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/agent-schema.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/schemas/agent.ts apps/app/tests/unit/agent-schema.test.ts
git commit -m "feat(agents): schema for an agent update, with tools and models allowlisted"
```

---

## Task 3: Agent read and write paths

**Files:**
- Modify: `apps/app/lib/db/agents.ts` (append; leave `startAgentRun` untouched)
- Test: `apps/app/tests/rls/agents-crud.test.ts`

**Interfaces:**
- Consumes: `UpdateAgentValues` from `@/lib/schemas/agent`.
- Produces: `type Agent = Tables<'agents'>`, `listAgents(supabase, projectId): Promise<Agent[]>`, `getAgent(supabase, projectId, id): Promise<Agent | null>`, `updateAgent(supabase, { projectId, values }): Promise<Agent | null>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/rls/agents-crud.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getAgent, listAgents, updateAgent } from '@/lib/db/agents';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let agentId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`agents-crud-${Date.now()}@example.test`);

  const { data: project, error: pErr } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `robot-${Date.now()}`, kind: 'build' })
    .select()
    .single();
  if (pErr) throw pErr;
  projectId = project.id;

  const { data: agent, error: aErr } = await alice.client
    .from('agents')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Review decisions.',
      tools: ['search_repo'],
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();
  if (aErr) throw aErr;
  agentId = agent.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('agent read paths', () => {
  it('lists the project’s agents', async () => {
    const agents = await listAgents(client(), projectId);
    expect(agents.map((a) => a.slug)).toContain('critic');
  });

  it('reads one agent', async () => {
    const agent = await getAgent(client(), projectId, agentId);
    expect(agent?.name).toBe('Critic');
  });

  it('returns null for an agent in another project', async () => {
    const { data: other } = await alice!.client
      .from('projects')
      .insert({ owner_id: alice!.id, title: 'Other', slug: `other-${Date.now()}`, kind: 'build' })
      .select()
      .single();
    expect(await getAgent(client(), other!.id, agentId)).toBeNull();
  });
});

describe('agent updates', () => {
  it('changes the granted tools', async () => {
    const updated = await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: ['search_repo', 'read_document'],
      },
    });
    expect(updated?.tools.sort()).toEqual(['read_document', 'search_repo']);
  });

  it('deactivates without deleting', async () => {
    const updated = await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: false,
        tools: ['search_repo'],
      },
    });
    expect(updated?.is_active).toBe(false);

    // Reactivate, so later assertions in this file are not order-dependent.
    await updateAgent(client(), {
      projectId,
      values: {
        id: agentId,
        name: 'Critic',
        role_description: 'Argues.',
        system_prompt: 'Review decisions.',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: ['search_repo'],
      },
    });
  });

  it('refuses an update aimed at another project', async () => {
    const { data: other } = await alice!.client
      .from('projects')
      .insert({ owner_id: alice!.id, title: 'Third', slug: `third-${Date.now()}`, kind: 'build' })
      .select()
      .single();

    const updated = await updateAgent(client(), {
      projectId: other!.id,
      values: {
        id: agentId,
        name: 'Hijacked',
        role_description: '',
        system_prompt: 'x',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: [],
      },
    });
    expect(updated).toBeNull();

    const untouched = await getAgent(client(), projectId, agentId);
    expect(untouched?.name).toBe('Critic');
  });
});

describe('a second user is isolated from these agents', () => {
  it('cannot read them', async () => {
    bob = await createTestUser(`agents-bob-${Date.now()}@example.test`);
    const seen = await listAgents(bob.client as never, projectId);
    expect(seen).toEqual([]);
  });

  it('cannot update them', async () => {
    const updated = await updateAgent(bob!.client as never, {
      projectId,
      values: {
        id: agentId,
        name: 'Bob was here',
        role_description: '',
        system_prompt: 'x',
        model: 'openai/gpt-4o-mini',
        is_active: true,
        tools: [],
      },
    });
    expect(updated).toBeNull();

    const untouched = await getAgent(client(), projectId, agentId);
    expect(untouched?.name).toBe('Critic');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run --config vitest.rls.config.ts tests/rls/agents-crud.test.ts`
(If the RLS suite has no separate config, run `corepack pnpm test:rls` from the repo root and expect this file to fail.)
Expected: FAIL — `listAgents` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `apps/app/lib/db/agents.ts`:

```typescript
export type Agent = Tables<'agents'>;

const AGENT_COLUMNS =
  'id, project_id, owner_id, slug, name, role_description, system_prompt, tools, model, is_active, created_at, updated_at';

export async function listAgents(supabase: Client, projectId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', projectId)
    .order('name');

  if (error) throw error;
  return (data ?? []) as Agent[];
}

export async function getAgent(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Agent | null;
}

/**
 * Update an agent, scoped to the project it belongs to.
 *
 * The `project_id` filter is not redundant with RLS. RLS stops another owner's
 * agent being written; this stops *this* owner writing an agent through the
 * wrong project's page, which is the difference between a policy violation and
 * a routing bug. Returns null when nothing matched, so the caller can tell
 * "refused" from "changed", rather than reporting a silent no-op as success.
 *
 * `tools` and `model` are validated by `updateAgentSchema` before they arrive.
 * Neither is re-checked here — but note that both must be, somewhere: an
 * unknown tool name is dropped silently by `resolveTools` at run time, and an
 * unpriced model silently zeroes both the spend cap and the run reservation.
 */
export async function updateAgent(
  supabase: Client,
  { projectId, values }: { projectId: string; values: UpdateAgentValues }
): Promise<Agent | null> {
  const { id, ...fields } = values;

  const { data, error } = await supabase
    .from('agents')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('project_id', projectId)
    .select(AGENT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Agent | null;
}
```

Add to the imports at the top of the file:

```typescript
import type { Tables } from '@/types/supabase';
import type { UpdateAgentValues } from '@/lib/schemas/agent';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm test:rls` (repo root, local Supabase stack running).
Expected: PASS — the new file contributes 8 tests, and every pre-existing RLS test still passes.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/db/agents.ts apps/app/tests/rls/agents-crud.test.ts
git commit -m "feat(agents): read and update paths, project-scoped and isolation-tested"
```

---

## Task 4: Run read paths

**Files:**
- Create: `apps/app/lib/db/runs.ts`
- Test: `apps/app/tests/rls/runs-read.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `type Run = Tables<'agent_runs'>`, `type ToolCall = Tables<'agent_tool_calls'>`, `getRun(supabase, projectId, id): Promise<Run | null>`, `listToolCalls(supabase, runId): Promise<ToolCall[]>`, `listRunsForAgent(supabase, agentId, limit?): Promise<Run[]>`, `runCostUsd(supabase, runId): Promise<number>`.
- Run proposals reuse the existing `Proposal` type from `@/lib/db/proposals`; this module adds `listRunProposals(supabase, runId): Promise<Proposal[]>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/rls/runs-read.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getRun, listRunsForAgent, listToolCalls, runCostUsd } from '@/lib/db/runs';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let agentId: string;
let runId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`runs-${Date.now()}@example.test`);

  const { data: project } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `runs-${Date.now()}`, kind: 'build' })
    .select()
    .single();
  projectId = project!.id;

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      slug: 'critic',
      name: 'Critic',
      system_prompt: 'Review.',
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();
  agentId = agent!.id;

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      trigger: 'conversation',
      status: 'succeeded',
      step_count: 2,
    })
    .select()
    .single();
  runId = run!.id;

  await alice.client.from('agent_tool_calls').insert([
    {
      run_id: runId,
      project_id: projectId,
      owner_id: alice.id,
      tool: 'search_repo',
      args: { query: 'servo' },
      ok: true,
      duration_ms: 12,
      result_summary: '3 hits',
    },
    {
      run_id: runId,
      project_id: projectId,
      owner_id: alice.id,
      tool: 'read_document',
      args: { id: 'x' },
      ok: false,
      duration_ms: 4,
    },
  ]);

  await alice.client.from('ai_usage').insert([
    {
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      run_id: runId,
      model: 'openai/gpt-4o-mini',
      input_tokens: 1000,
      output_tokens: 500,
      cost_usd: 0.25,
    },
    {
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agentId,
      run_id: runId,
      model: 'openai/gpt-4o-mini',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.05,
    },
  ]);
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('run reads', () => {
  it('reads a run in its project', async () => {
    const run = await getRun(client(), projectId, runId);
    expect(run?.status).toBe('succeeded');
    expect(run?.step_count).toBe(2);
  });

  it('lists tool calls oldest first, so the trace reads in execution order', async () => {
    const calls = await listToolCalls(client(), runId);
    expect(calls.map((c) => c.tool)).toEqual(['search_repo', 'read_document']);
    expect(calls[1].ok).toBe(false);
  });

  it('lists an agent’s runs newest first', async () => {
    const runs = await listRunsForAgent(client(), agentId);
    expect(runs[0].id).toBe(runId);
  });

  it('sums cost across every usage row for the run', async () => {
    // Cost is summed from ai_usage rather than read from agent_runs, which has
    // only reserved_usd — a pre-flight reservation, not a charge. Reporting the
    // reservation would overstate every completed run.
    expect(await runCostUsd(client(), runId)).toBeCloseTo(0.3, 6);
  });

  it('reports zero for a run with no usage rows', async () => {
    const { data: bare } = await alice!.client
      .from('agent_runs')
      .insert({
        project_id: projectId,
        owner_id: alice!.id,
        agent_id: agentId,
        trigger: 'conversation',
        status: 'running',
      })
      .select()
      .single();
    expect(await runCostUsd(client(), bare!.id)).toBe(0);
  });
});

describe('a second user is isolated from these runs', () => {
  it('cannot read the run, its calls, or its cost', async () => {
    bob = await createTestUser(`runs-bob-${Date.now()}@example.test`);
    expect(await getRun(bob.client as never, projectId, runId)).toBeNull();
    expect(await listToolCalls(bob.client as never, runId)).toEqual([]);
    expect(await runCostUsd(bob.client as never, runId)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm test:rls`
Expected: FAIL — cannot resolve `@/lib/db/runs`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/db/runs.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { Proposal } from '@/lib/db/proposals';

type Client = SupabaseClient<Database>;

export type Run = Tables<'agent_runs'>;
export type ToolCall = Tables<'agent_tool_calls'>;

const RUN_COLUMNS =
  'id, project_id, owner_id, agent_id, work_item_id, trigger, status, step_count, error, reserved_usd, started_at, ended_at';

const TOOL_CALL_COLUMNS =
  'id, run_id, project_id, owner_id, tool, args, result_summary, ok, duration_ms, created_at';

export async function getRun(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Run | null> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select(RUN_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Run | null;
}

/**
 * A run's tool calls, oldest first.
 *
 * Ascending on purpose: the trace is a narrative of what the agent did, and it
 * only reads as one in the order it happened. Every other list in the product
 * is newest-first because it answers "what changed"; this one answers "what
 * did it do", which is the opposite question.
 */
export async function listToolCalls(supabase: Client, runId: string): Promise<ToolCall[]> {
  const { data, error } = await supabase
    .from('agent_tool_calls')
    .select(TOOL_CALL_COLUMNS)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ToolCall[];
}

export async function listRunsForAgent(
  supabase: Client,
  agentId: string,
  limit = 20
): Promise<Run[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select(RUN_COLUMNS)
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Run[];
}

export async function listRunProposals(supabase: Client, runId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Proposal[];
}

/**
 * What a run actually cost, summed from `ai_usage`.
 *
 * Not `agent_runs.reserved_usd`, which is what the cap check set aside before
 * the run started. A reservation is an upper bound; reporting it as the cost
 * would overstate every run that finished under budget, which is most of them.
 */
export async function runCostUsd(supabase: Client, runId: string): Promise<number> {
  const { data, error } = await supabase.from('ai_usage').select('cost_usd').eq('run_id', runId);

  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + Number((row as { cost_usd: string }).cost_usd), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm test:rls`
Expected: PASS — the new file contributes 6 tests, and every pre-existing RLS test still passes.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/db/runs.ts apps/app/tests/rls/runs-read.test.ts
git commit -m "feat(runs): read paths for a trace, with cost summed from usage"
```

---

## Task 5: The update action, navigation, and strings

**Files:**
- Modify: `apps/app/app/(workspace)/actions.ts`
- Modify: `apps/app/lib/shell/destinations.ts`
- Modify: `packages/i18n/src/locales/en.json`, `ms.json`, `zh.json`
- Test: `apps/app/tests/unit/shell-destinations.test.ts` (extend the existing file)
- Create: `packages/i18n/tests/locale-parity.test.ts`

**Interfaces:**
- Consumes: `updateAgentSchema` (Task 2), `updateAgent`, `getAgent` (Task 3).
- Produces: `updateAgentAction(slug: string, input: unknown): Promise<ActionResult<{ id: string }>>`; a destination with `key: 'agents'`.

- [ ] **Step 1: Write the failing test**

Add to `apps/app/tests/unit/shell-destinations.test.ts`:

```typescript
describe('the agents destination', () => {
  it('sits after documents in the sidebar', () => {
    const keys = destinationsFor('robot', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox', 'documents', 'agents']);
  });

  it('is active on the agent editor, not only on the list', () => {
    // isActive takes (pathname, destination) in that order, and pathname
    // arrives from usePathname() with a trailing slash because next.config.js
    // sets trailingSlash: true. Both are why this is asserted rather than
    // assumed — the same pairing broke Resume's active state in slice A.
    const agents = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'agents')!;
    expect(isActive('/projects/robot/agents/', agents)).toBe(true);
    expect(isActive('/projects/robot/agents/abc-123/', agents)).toBe(true);
  });

  it('is not active on a run trace, which is reached from an agent but is not one', () => {
    const agents = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'agents')!;
    expect(isActive('/projects/robot/runs/abc-123/', agents)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: FAIL — the keys array has no `agents` entry.

- [ ] **Step 3: Write minimal implementation**

In `apps/app/lib/shell/destinations.ts`, append to the array returned by `destinationsFor`, after the `documents` entry:

```typescript
    {
      key: 'agents',
      href: `${base}/agents`,
      labelKey: 'app.agents.title',
      exact: false,
    },
```

Add to `apps/app/app/(workspace)/actions.ts`:

```typescript
export async function updateAgentAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateAgentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const updated = await updateAgent(supabase, { projectId: project.id, values: parsed.data });
    if (!updated) return fail('app.agents.missing');

    revalidateProject(slug);
    return ok({ id: updated.id });
  } catch {
    return fail('app.errors.generic');
  }
}
```

with these imports added to the existing import block:

```typescript
import { updateAgent } from '@/lib/db/agents';
import { updateAgentSchema } from '@/lib/schemas/agent';
```

Add to all three locale files, inside `app`:

```json
"agents": {
  "title": "Agents",
  "missing": "That agent no longer exists.",
  "empty": "No agents yet.",
  "nameLabel": "Name",
  "roleLabel": "Role",
  "promptLabel": "System prompt",
  "modelLabel": "Model",
  "activeLabel": "Active",
  "inactive": "Inactive",
  "toolCount_one": "{{count}} tool",
  "toolCount_other": "{{count}} tools",
  "save": "Save",
  "saving": "Saving",
  "saved": "Saved",
  "recentRuns": "Recent runs",
  "noRuns": "No runs yet.",
  "tools": {
    "heading": "Tools",
    "reads": "Reads the record",
    "proposes": "Proposes changes",
    "proposesNote": "you approve each",
    "external": "Leaves the system",
    "none": "None yet."
  }
}
```

`ms`:

```json
"agents": {
  "title": "Ejen",
  "missing": "Ejen itu tidak wujud lagi.",
  "empty": "Belum ada ejen.",
  "nameLabel": "Nama",
  "roleLabel": "Peranan",
  "promptLabel": "Gesaan sistem",
  "modelLabel": "Model",
  "activeLabel": "Aktif",
  "inactive": "Tidak aktif",
  "toolCount_one": "{{count}} alat",
  "toolCount_other": "{{count}} alat",
  "save": "Simpan",
  "saving": "Menyimpan",
  "saved": "Disimpan",
  "recentRuns": "Larian terkini",
  "noRuns": "Belum ada larian.",
  "tools": {
    "heading": "Alat",
    "reads": "Membaca rekod",
    "proposes": "Mencadangkan perubahan",
    "proposesNote": "anda meluluskan setiap satu",
    "external": "Keluar dari sistem",
    "none": "Belum ada."
  }
}
```

`zh`:

```json
"agents": {
  "title": "代理",
  "missing": "该代理已不存在。",
  "empty": "尚无代理。",
  "nameLabel": "名称",
  "roleLabel": "角色",
  "promptLabel": "系统提示词",
  "modelLabel": "模型",
  "activeLabel": "启用",
  "inactive": "已停用",
  "toolCount_one": "{{count}} 个工具",
  "toolCount_other": "{{count}} 个工具",
  "save": "保存",
  "saving": "保存中",
  "saved": "已保存",
  "recentRuns": "最近运行",
  "noRuns": "尚无运行记录。",
  "tools": {
    "heading": "工具",
    "reads": "读取记录",
    "proposes": "提出更改",
    "proposesNote": "每项均需你批准",
    "external": "离开本系统",
    "none": "暂无。"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts && corepack pnpm --filter @goalspace/i18n test`
Expected: PASS. The i18n suite asserts all three locales carry identical key sets.

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/\(workspace\)/actions.ts apps/app/lib/shell/destinations.ts apps/app/tests/unit/shell-destinations.test.ts packages/i18n
git commit -m "feat(agents): update action, sidebar destination, and strings in three locales"
```

- [ ] **Step 6: Guard locale parity, before the rest of the slice adds more keys**

Nothing currently checks that the three locale files agree. A key added to `en`
and forgotten in `zh` falls back to English silently — which is exactly what
happened to `navigation.toggleSidebar`, caught only by a manual audit long
after it shipped. This slice adds roughly forty keys across three files, so the
guard goes in first.

```typescript
// packages/i18n/tests/locale-parity.test.ts
import { describe, expect, it } from 'vitest';

import en from '../src/locales/en.json';
import ms from '../src/locales/ms.json';
import zh from '../src/locales/zh.json';

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  );
}

const locales = { en, ms, zh } as const;

describe('locale parity', () => {
  it.each(['ms', 'zh'] as const)('%s carries exactly the keys en does', (name) => {
    const expected = new Set(flatten(locales.en));
    const actual = new Set(flatten(locales[name]));

    // Reported as sorted arrays rather than a boolean: a failure should name
    // the key to add, not merely assert that one is missing somewhere.
    expect({
      missing: [...expected].filter((k) => !actual.has(k)).sort(),
      extra: [...actual].filter((k) => !expected.has(k)).sort(),
    }).toEqual({ missing: [], extra: [] });
  });

  it('has no empty strings, which read as a missing translation', () => {
    for (const [name, bundle] of Object.entries(locales)) {
      const blanks = flatten(bundle).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], bundle);
        return typeof value === 'string' && value.trim() === '';
      });
      expect({ locale: name, blanks }).toEqual({ locale: name, blanks: [] });
    }
  });
});
```

Run: `corepack pnpm --filter @goalspace/i18n test`
Expected: PASS, 3 tests. If it fails, a locale is genuinely out of step — fix
the locale, not the test.

```bash
git add packages/i18n/tests/locale-parity.test.ts
git commit -m "test(i18n): assert the three locales carry identical keys"
```

---

## Task 6: The agents list

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/agents/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/agents/loading.tsx`

**Interfaces:**
- Consumes: `listAgents` (Task 3), the `app.agents.*` strings (Task 5).
- Produces: rows linking to `/projects/[slug]/agents/[agentId]`.

- [ ] **Step 1: Write the page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/agents/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listAgents } from '@/lib/db/agents';
import { getLocale } from '@/lib/format';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.agents.title')} · ${slug}` };
}

/**
 * An agent is a capability boundary, not a persona. The list leads with what
 * each one may do — its tool count — rather than with prose about what it is
 * for, because that is the fact an owner returns here to check.
 */
export default async function AgentsPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const agents = await listAgents(supabase, project.id);
  const t = getFixedT(await getLocale());

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <h1 className="label border-b border-rule pb-2 text-ink-soft">{t('app.agents.title')}</h1>

        {agents.length === 0 ? (
          <p className="py-6 text-ink-soft">{t('app.agents.empty')}</p>
        ) : (
          <ul>
            {agents.map((agent) => (
              <li key={agent.id} className="border-b border-rule">
                <Link
                  href={`/projects/${slug}/agents/${agent.id}`}
                  className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                >
                  <span className="min-w-0 flex-1 text-body text-ink">{agent.name}</span>

                  {/* Inactive is stated in words, not signalled by colour: the
                      palette has no disabled tone, and status must never be
                      colour alone. */}
                  {!agent.is_active ? (
                    <span className="label shrink-0 text-ink-soft">{t('app.agents.inactive')}</span>
                  ) : null}

                  <span className="label shrink-0 text-ink-soft">{agent.model}</span>
                  <span className="label shrink-0 tabular-nums text-ink-soft">
                    {t('app.agents.toolCount', { count: agent.tools.length })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the loading skeleton**

```tsx
// apps/app/app/(workspace)/projects/[slug]/agents/loading.tsx

/** Matches the list's row rhythm so the swap does not jump. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <div className="h-4 w-24 border-b border-rule bg-paper-shade" />
        <ul aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="border-b border-rule py-3">
              <div className="h-4 w-48 bg-paper-shade" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds and the route appears**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd "$(git rev-parse --show-toplevel)"
corepack pnpm typecheck
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```

Expected: both pass, and `/projects/[slug]/agents` appears in the build's route list.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/agents"
git commit -m "feat(agents): the list, leading with what each agent may do"
```

---

## Task 7: The agent editor

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/agent-editor.tsx`

**Interfaces:**
- Consumes: `getAgent` (Task 3), `listRunsForAgent` (Task 4), `toolGroups` (Task 1), `MODEL_CHOICES` (Task 2), `updateAgentAction` (Task 5).
- Produces: the run links R3 requires.

- [ ] **Step 1: Write the client form**

```tsx
// apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/agent-editor.tsx
'use client';

import { useId, useState, useTransition } from 'react';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { updateAgentAction } from '@/app/(workspace)/actions';
import { toolGroups } from '@/lib/agents/tool-groups';
import { MODEL_CHOICES } from '@/lib/schemas/agent';
import type { Agent } from '@/lib/db/agents';

/**
 * The editor is where the capability boundary is set, so it shows tools
 * grouped by consequence rather than as a flat checklist. The owner may grant
 * or revoke anything registered, including on the seeded agents: the boundary
 * exists to stop a *model* exceeding what the owner granted, not to stop the
 * owner.
 */
export function AgentEditor({ slug, agent }: { slug: string; agent: Agent }) {
  const { t } = useAppTranslations();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role_description);
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [model, setModel] = useState(agent.model);
  const [isActive, setIsActive] = useState(agent.is_active);
  const [tools, setTools] = useState<string[]>(agent.tools);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const messageId = useId();

  function toggleTool(toolName: string) {
    setTools((current) =>
      current.includes(toolName)
        ? current.filter((n) => n !== toolName)
        : [...current, toolName]
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);

    startTransition(async () => {
      try {
        const result = await updateAgentAction(slug, {
          id: agent.id,
          name,
          role_description: role,
          system_prompt: prompt,
          model,
          is_active: isActive,
          tools,
        });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          return;
        }
        setMessage('app.agents.saved');
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="agent-name" className="label text-ink-soft">
          {t('app.agents.nameLabel')}
        </label>
        <input
          id="agent-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={failed ? messageId : undefined}
          className="border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agent-role" className="label text-ink-soft">
          {t('app.agents.roleLabel')}
        </label>
        <input
          id="agent-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-rule-strong bg-paper px-3 py-2 text-body text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agent-prompt" className="label text-ink-soft">
          {t('app.agents.promptLabel')}
        </label>
        <textarea
          id="agent-prompt"
          required
          rows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="agent-model" className="label text-ink-soft">
            {t('app.agents.modelLabel')}
          </label>
          {/* A select, not free text. An unpriced model silently zeroes both
              the spend cap and the run reservation — see lib/schemas/agent.ts. */}
          <select
            id="agent-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="label border border-rule-strong bg-paper px-3 py-2 text-ink"
          >
            {MODEL_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="label text-ink-soft">{t('app.agents.activeLabel')}</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-rule pt-4">
        <legend className="label text-ink-soft">{t('app.agents.tools.heading')}</legend>

        {toolGroups().map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <p className="label text-ink-soft">
              {t(group.labelKey)}
              {group.noteKey ? (
                <span className="normal-case tracking-normal"> — {t(group.noteKey)}</span>
              ) : null}
            </p>

            {group.tools.length === 0 ? (
              <p className="text-ink-soft">{t('app.agents.tools.none')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {group.tools.map((tool) => (
                  <li key={tool.name}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={tools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="font-mono text-body text-ink">{tool.name}</span>
                        <span className="block text-ink-soft">{tool.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.agents.saving' : 'app.agents.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : undefined}
            className={cn('label min-w-0 flex-1', failed ? 'text-oxide' : 'text-ink-soft')}
          >
            {t(message)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write the page, with the recent-runs list**

```tsx
// apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getAgent } from '@/lib/db/agents';
import { listRunsForAgent } from '@/lib/db/runs';
import { formatDateTime, getLocale } from '@/lib/format';
import { AgentEditor } from './agent-editor';

type Params = { params: Promise<{ slug: string; agentId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, agentId } = await params;
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  const agent = project ? await getAgent(supabase, project.id, agentId) : null;
  const t = getFixedT(await getLocale());
  return { title: `${agent?.name || t('app.agents.title')} · ${slug}` };
}

export default async function AgentPage({ params }: Params) {
  const { slug, agentId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const agent = await getAgent(supabase, project.id, agentId);
  if (!agent) notFound();

  const runs = await listRunsForAgent(supabase, agent.id);
  const locale = await getLocale();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <AgentEditor slug={slug} agent={agent} />

        {/* A run is reached from the agent that produced it or the proposal it
            created, never browsed as a top-level list — hence no /runs index. */}
        <section className="pt-10">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.agents.recentRuns')}
          </h2>

          {runs.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.agents.noRuns')}</p>
          ) : (
            <ul>
              {runs.map((run) => (
                <li key={run.id} className="border-b border-rule">
                  <Link
                    href={`/projects/${slug}/runs/${run.id}`}
                    className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                  >
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {formatDateTime(run.started_at, locale)}
                    </span>
                    <span className="min-w-0 flex-1 text-body text-ink">
                      {t(`app.runs.status.${run.status}`)}
                    </span>
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {t('app.runs.steps', { count: run.step_count })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the run strings to all three locales**

Inside `app` in each locale file, add a `runs` block. `en`:

```json
"runs": {
  "title": "Run",
  "steps_one": "{{count}} step",
  "steps_other": "{{count}} steps",
  "duration": "Duration",
  "cost": "Cost",
  "toolCalls": "Tool calls",
  "noToolCalls": "No tool calls.",
  "proposals": "Proposals",
  "noProposals": "No proposals.",
  "arguments": "Arguments",
  "result": "Result",
  "failed": "Failed",
  "succeeded": "Succeeded",
  "viewRun": "View the run",
  "status": {
    "running": "Running",
    "succeeded": "Succeeded",
    "failed": "Failed",
    "cancelled": "Cancelled",
    "capped": "Stopped at the cap"
  }
}
```

`ms`:

```json
"runs": {
  "title": "Larian",
  "steps_one": "{{count}} langkah",
  "steps_other": "{{count}} langkah",
  "duration": "Tempoh",
  "cost": "Kos",
  "toolCalls": "Panggilan alat",
  "noToolCalls": "Tiada panggilan alat.",
  "proposals": "Cadangan",
  "noProposals": "Tiada cadangan.",
  "arguments": "Argumen",
  "result": "Keputusan",
  "failed": "Gagal",
  "succeeded": "Berjaya",
  "viewRun": "Lihat larian",
  "status": {
    "running": "Sedang berjalan",
    "succeeded": "Berjaya",
    "failed": "Gagal",
    "cancelled": "Dibatalkan",
    "capped": "Berhenti pada had"
  }
}
```

`zh`:

```json
"runs": {
  "title": "运行",
  "steps_one": "{{count}} 步",
  "steps_other": "{{count}} 步",
  "duration": "耗时",
  "cost": "费用",
  "toolCalls": "工具调用",
  "noToolCalls": "无工具调用。",
  "proposals": "提议",
  "noProposals": "无提议。",
  "arguments": "参数",
  "result": "结果",
  "failed": "失败",
  "succeeded": "成功",
  "viewRun": "查看运行",
  "status": {
    "running": "运行中",
    "succeeded": "成功",
    "failed": "失败",
    "cancelled": "已取消",
    "capped": "已达上限停止"
  }
}
```

- [ ] **Step 4: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd "$(git rev-parse --show-toplevel)"
corepack pnpm typecheck && corepack pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```

Expected: all pass; `/projects/[slug]/agents/[agentId]` appears in the route list; the i18n key-parity test still passes.

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/agents/[agentId]" packages/i18n/src/locales
git commit -m "feat(agents): the editor, with tools grouped by consequence"
```

---

## Task 8: The run trace

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/runs/[runId]/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx`

**Interfaces:**
- Consumes: `getRun`, `listToolCalls`, `listRunProposals`, `runCostUsd` (Task 4); the `app.runs.*` strings (Task 7).

- [ ] **Step 1: Write the page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/runs/[runId]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getAgent } from '@/lib/db/agents';
import { getRun, listRunProposals, listToolCalls, runCostUsd } from '@/lib/db/runs';
import { formatDateTime, getLocale } from '@/lib/format';

type Params = { params: Promise<{ slug: string; runId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.runs.title')} · ${slug}` };
}

/**
 * The debugging surface and the privacy surface at once.
 *
 * Nothing here is aggregated away: arguments are shown verbatim, because this
 * is where an owner sees what left the system. A summarised trace would be
 * more readable and would defeat the purpose.
 */
export default async function RunPage({ params }: Params) {
  const { slug, runId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const run = await getRun(supabase, project.id, runId);
  if (!run) notFound();

  const [calls, proposals, cost, agent] = await Promise.all([
    listToolCalls(supabase, run.id),
    listRunProposals(supabase, run.id),
    runCostUsd(supabase, run.id),
    getAgent(supabase, project.id, run.agent_id),
  ]);

  const locale = await getLocale();
  const t = getFixedT(locale);

  const durationMs = run.ended_at
    ? Date.parse(run.ended_at) - Date.parse(run.started_at)
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <p className="label text-ink-soft">{t('app.runs.title')}</p>

        <h1 className="wdth-wide pt-1 text-headline font-bold text-ink">
          {agent?.name ?? t('app.agents.title')}
        </h1>

        {/* Status is a word, never a colour: the palette carries no success or
            failure tone, and the spec forbids colour as the only signal. */}
        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-b border-rule py-4">
          <div>
            <dt className="label text-ink-soft">{t('app.runs.status.' + run.status)}</dt>
            <dd className="label tabular-nums text-ink">
              {formatDateTime(run.started_at, locale)}
            </dd>
          </div>
          <div>
            <dt className="label text-ink-soft">{t('app.runs.steps', { count: run.step_count })}</dt>
            <dd className="label tabular-nums text-ink">
              {durationMs === null ? '—' : `${(durationMs / 1000).toFixed(1)}s`}
            </dd>
          </div>
          <div>
            <dt className="label text-ink-soft">{t('app.runs.cost')}</dt>
            <dd className="label tabular-nums text-ink">${cost.toFixed(4)}</dd>
          </div>
        </dl>

        {run.error ? (
          <p role="alert" className="label py-3 text-oxide">
            {run.error}
          </p>
        ) : null}

        <section className="pt-8">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.runs.toolCalls')}
          </h2>

          {calls.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.runs.noToolCalls')}</p>
          ) : (
            <ol>
              {calls.map((call) => (
                <li key={call.id} className="border-b border-rule py-3">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-body text-ink">{call.tool}</span>
                    <span className="label shrink-0 text-ink-soft">
                      {t(call.ok ? 'app.runs.succeeded' : 'app.runs.failed')}
                    </span>
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {call.duration_ms === null ? '—' : `${call.duration_ms}ms`}
                    </span>
                  </div>

                  {/* Verbatim, and as plain text. These are arguments a model
                      composed; rendering them as markup would let a crafted
                      value inject into the surface used to audit it. */}
                  <pre className="mt-2 max-w-[70ch] overflow-x-auto whitespace-pre-wrap border border-rule bg-paper-shade p-2 font-mono text-ink-soft">
                    {JSON.stringify(call.args, null, 2)}
                  </pre>

                  {call.result_summary ? (
                    <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-ink-soft">
                      {call.result_summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="pt-8">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.runs.proposals')}
          </h2>

          {proposals.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.runs.noProposals')}</p>
          ) : (
            <ul>
              {proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3"
                >
                  <span className="min-w-0 flex-1 text-body text-ink">{proposal.rationale}</span>
                  <span className="label shrink-0 text-ink-soft">
                    {t(`app.inbox.status.${proposal.status}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="pt-8">
          <Link href={`/projects/${slug}/agents/${run.agent_id}`} className="label text-ink-soft">
            {agent?.name ?? t('app.agents.title')}
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the status strings the proposal list needs**

Check whether `app.inbox.status.pending` / `accepted` / `rejected` / `superseded` already exist in the locale files (the inbox card may render status differently). If any are missing, add them to all three:

`en`: `"status": { "pending": "Pending", "accepted": "Accepted", "rejected": "Rejected", "superseded": "Superseded" }`
`ms`: `"status": { "pending": "Menunggu", "accepted": "Diterima", "rejected": "Ditolak", "superseded": "Digantikan" }`
`zh`: `"status": { "pending": "待处理", "accepted": "已接受", "rejected": "已拒绝", "superseded": "已被取代" }`

- [ ] **Step 3: Link the proposal card to its run**

In `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx`, add a link beside the existing citations line. The card already receives `proposal`; `proposal.run_id` is on the row.

```tsx
{proposal.run_id ? (
  <Link
    href={`/projects/${slug}/runs/${proposal.run_id}`}
    className="label text-ink-soft"
  >
    {t('app.runs.viewRun')}
  </Link>
) : null}
```

Add `import Link from 'next/link';` if the file does not already import it, and thread `slug` through from the inbox page if the card does not already receive it.

- [ ] **Step 4: Verify**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd "$(git rev-parse --show-toplevel)"
corepack pnpm typecheck && corepack pnpm test && corepack pnpm test:rls
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```

Expected: all pass. `/projects/[slug]/runs/[runId]` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/runs" "apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx" packages/i18n/src/locales
git commit -m "feat(runs): the trace, verbatim, reachable from its agent and its proposals"
```

---

## Task 9: Browser pass

Not optional, and not a formality. `apps/app` runs vitest in `node` with no DOM, so **nothing in the test suite can observe layout or rendering**. Slices A and B each shipped defects that every test passed over: an active-state bug from `trailingSlash`, a mobile sheet that ignored its own state, a horizontal scrollbar on every project route, and a conflict control rendered off-screen at phone width. Assume this slice has its own.

**Files:** none — this task produces fixes, wherever they land.

- [ ] **Step 1: Seed and run against the local stack**

Point the dev server at the local Supabase stack rather than the one in `.env.local`, which is **production**:

```bash
cd apps/app
set -a; . ./.env.test; set +a
NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" corepack pnpm dev
```

Seed a project with at least one agent, one run with several tool calls (one failed, one with a large `args` payload), and one proposal.

- [ ] **Step 2: Walk the three routes at 1440px and 390px**

Check specifically:
- Zero horizontal overflow on all three routes at both widths — measure `document.documentElement.scrollWidth - clientWidth`, do not eyeball it.
- The tool checklist is legible at 390px and the descriptions wrap rather than overflow.
- A long `args` payload scrolls inside its own `<pre>` and does not widen the page.
- The sidebar marks **Agents** active on both the list and the editor, and *not* on a run trace.
- Save reports success, and a validation failure renders in `text-oxide` with `role="alert"` — check it is visible, not merely present.

- [ ] **Step 3: Check both locales that stress layout**

Set `NEXT_LOCALE=ms` and repeat at 390px. Malay strings run ~40% longer than English and are the tightest constraint on the tool group headings.

- [ ] **Step 4: Fix what you find, then re-verify**

Each fix gets its own commit with the measurement in the message, not a description of the symptom.

---

## Done when

1. `/projects/[slug]/agents` lists every agent with its model, tool count, and whether it is active.
2. The editor saves name, role, prompt, model, active, and tools; tools are grouped as reads / proposes / leaves-the-system, derived from the registry.
3. An unregistered tool name and an unpriced model are both rejected server-side, proven by unit test.
4. `/projects/[slug]/runs/[runId]` shows status, steps, duration, cost summed from `ai_usage`, every tool call in order with verbatim arguments, and every proposal the run produced.
5. A run is reachable from its agent and from the proposal it created; there is no `/runs` index.
6. Two-user isolation is asserted for agents and runs in `tests/rls`.
7. All three locales carry identical key sets, enforced by `packages/i18n/tests/locale-parity.test.ts` rather than by review.
8. Zero horizontal overflow on all three routes at 390px and 1440px, measured.
9. `corepack pnpm typecheck`, `test`, `test:rls`, and `build` all pass.

## Deliberately not in this slice

- **Creating and deleting agents** (R2). The `is_active` toggle covers deactivation; create and delete belong together in a later slice.
- **Conversations and messages.** Phase 2 has no persistence for them yet; a run is currently reached by id, not by transcript.
- **Rendering `web_search` results in the trace.** The tool does not exist. When it ships, the trace gains a results renderer — and per the phase-2 spec §5.4 those snippets must render as **plain text**, never through the markdown renderer, because a page controls the text of its own snippet.
- **Project and account settings** — slice D.

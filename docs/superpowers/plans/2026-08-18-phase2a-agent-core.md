# Phase 2a — Agent Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship read-only agents that answer questions from the project's own record, where the capability boundary is enforced server-side and every run records what it cost.

**Architecture:** An executor intersects a server-side tool registry with the agent's `tools` allowlist and hands the model only that set; a call to anything outside it is rejected before any handler runs and recorded as a failed tool call. Retrieval opens with a project skeleton (work-item tree, decision titles, open questions) and pulls detail through repo-read tools backed by Postgres full-text search. The loop runs inside a streaming route handler, so tokens flush as they arrive.

**Tech Stack:** Next.js 16 route handlers · AI SDK 7 (`ai@^7.0.66`) via Vercel AI Gateway · Supabase Postgres with RLS · zod 3 · Vitest.

**Spec:** [docs/superpowers/specs/2026-07-30-goalspace-grounded-copartner-design.md](../specs/2026-07-30-goalspace-grounded-copartner-design.md)

## Global Constraints

- **Agents propose; they never write.** This plan ships no write tools at all. The registry's `writes` flag exists and every tool in it is `writes: false`. Adding a write tool is phase 2b and requires the proposal layer to exist first.
- **The allowlist is enforced by code, never by prompt.** The tool set handed to the model is `registry ∩ agent.tools`, computed server-side. It is never sent from, or influenced by, the client.
- **Read tools are scoped to `agent.project_id` inside the handler**, not by prompt instruction. A handler that takes a `project_id` argument from the model is a bug.
- **Agent tables are owner-only.** Do **not** copy phase 1's `or exists (... visibility = 'public')` branch onto any table in this plan. Phase 1's public-read branch exists so published projects can be read; applying it here would publish conversation content, run traces, and spend the moment a project is made public.
- **RLS policies are written out longhand**, one `create policy` per table per verb. No loops, no `DO` blocks. Security rules must be greppable.
- **Node >= 22**, pnpm >= 8. Run commands from the repository root.
- **Models are `"provider/model"` gateway slugs.** Versioned slugs use dots (`anthropic/claude-sonnet-5`), never hyphens. Default: `anthropic/claude-sonnet-5`.
- **Vector search is out of scope.** `search_repo` is Postgres full-text only. No `embeddings` table, no pgvector, no job queue, no cron. The tool interface is shaped so a vector half can be added behind it later without changing callers.
- **Domain logic is written test-first**, following `lib/work-items/*`. Pure functions live in `lib/agents/` and are tested directly with no database and no model.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/app/lib/agents/cost.ts` | tokens + model → `cost_usd`. Pure. Rate table is data. |
| `apps/app/lib/agents/skeleton.ts` | project rows → orientation string, truncated by recency. Pure. |
| `apps/app/lib/agents/tools/registry.ts` | tool definitions, zod input schemas, `writes`/`external` flags, allowlist intersection. |
| `apps/app/lib/agents/tools/handlers/*.ts` | one handler per tool, each project-scoped from the run context. |
| `apps/app/lib/agents/executor.ts` | allowlist intersection, step loop, cap checks, run + tool-call recording. |
| `apps/app/lib/db/agents.ts` | typed queries for `agents`, `agent_runs`, `agent_tool_calls`, `ai_usage`, `project_budgets`. |
| `apps/app/lib/schemas/agent.ts` | zod schemas for agent create/update. One validation path. |
| `apps/app/app/api/agents/[agentId]/ask/route.ts` | streaming route handler that drives the executor. |
| `apps/app/supabase/migrations/20260818000100_phase2a_agents.sql` | agent tables, owner-only RLS, FTS columns, `search_repo`. |
| `apps/app/tests/unit/agents-*.test.ts` | pure-function and executor tests (stubbed model, no network). |
| `apps/app/tests/rls/agents-isolation.test.ts` | two-user isolation across every new table. |

---

## Task 1: Cost accounting (pure)

**Files:**
- Create: `apps/app/lib/agents/cost.ts`
- Test: `apps/app/tests/unit/agents-cost.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `costUsd(input: CostInput): number`, `type CostInput`, `RATES: Record<string, ModelRate>`, `type ModelRate = { inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok: number }`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-cost.test.ts
import { describe, expect, it } from 'vitest';

import { costUsd } from '@/lib/agents/cost';

describe('costUsd', () => {
  it('prices a known model from the rate table', () => {
    // sonnet-5: $3.00 per M input, $15.00 per M output
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(18, 6);
  });

  it('prices cached input at the cached rate', () => {
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.3, 6);
  });

  it('prefers the gateway-reported cost when present', () => {
    // The rate table drifts silently; the gateway knows what it charged.
    const cost = costUsd({
      model: 'anthropic/claude-sonnet-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      gatewayCostUsd: 0.42,
    });
    expect(cost).toBe(0.42);
  });

  it('returns 0 for an unknown model rather than throwing', () => {
    // A run must not fail because a new slug is missing from the table.
    expect(costUsd({ model: 'acme/nope', inputTokens: 1000, outputTokens: 1000 })).toBe(0);
  });

  it('treats undefined token counts as zero', () => {
    expect(costUsd({ model: 'anthropic/claude-sonnet-5' })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-cost.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/cost`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/cost.ts
/**
 * What a run cost, in dollars.
 *
 * Two sources, in priority order. The gateway reports what it actually
 * charged; the rate table below is a fallback for when it does not. A local
 * rate table drifts the moment a provider reprices, and the failure mode is
 * confidently displayed wrong numbers rather than a crash — so the gateway's
 * figure wins whenever it is available.
 *
 * An unknown model returns 0 rather than throwing. A missing rate should not
 * be able to fail a run that already happened; queue depth on the settings
 * page is the right place to notice it.
 */

export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok: number;
}

/** Dollars per million tokens. Configuration, not code — see spec §12. */
export const RATES: Record<string, ModelRate> = {
  'anthropic/claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15, cachedInputPerMTok: 0.3 },
  'anthropic/claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, cachedInputPerMTok: 0.5 },
  'anthropic/claude-haiku-4.5': { inputPerMTok: 1, outputPerMTok: 5, cachedInputPerMTok: 0.1 },
};

export interface CostInput {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  /** What the gateway says it charged. Wins over the table when present. */
  gatewayCostUsd?: number;
}

export function costUsd(input: CostInput): number {
  if (typeof input.gatewayCostUsd === 'number') return input.gatewayCostUsd;

  const rate = RATES[input.model];
  if (!rate) return 0;

  const perToken = (tokens: number | undefined, perMTok: number) =>
    ((tokens ?? 0) / 1_000_000) * perMTok;

  return (
    perToken(input.inputTokens, rate.inputPerMTok) +
    perToken(input.outputTokens, rate.outputPerMTok) +
    perToken(input.cachedInputTokens, rate.cachedInputPerMTok)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-cost.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/cost.ts apps/app/tests/unit/agents-cost.test.ts
git commit -m "feat(agents): price a run from gateway cost, falling back to a rate table"
```

---

## Task 2: Project skeleton (pure)

Every run opens with orientation rather than fragments: the work-item tree with statuses, decision titles, and open questions. A few thousand tokens that let the agent decide what to pull next.

**Files:**
- Create: `apps/app/lib/agents/skeleton.ts`
- Test: `apps/app/tests/unit/agents-skeleton.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildSkeleton(input: SkeletonInput, options?: SkeletonOptions): string`, `type SkeletonInput = { project: SkeletonProject; workItems: SkeletonWorkItem[]; decisions: SkeletonEntry[]; }`, `type SkeletonOptions = { maxChars?: number }`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-skeleton.test.ts
import { describe, expect, it } from 'vitest';

import { buildSkeleton, type SkeletonInput } from '@/lib/agents/skeleton';

const base: SkeletonInput = {
  project: { title: 'Custom EV bike', kind: 'build', brief: 'A commuter build.' },
  workItems: [
    { id: 'w1', parent_id: null, title: 'Battery pack', status: 'doing', kind: 'task' },
    { id: 'w2', parent_id: 'w1', title: 'Cell selection', status: 'done', kind: 'task' },
    { id: 'w3', parent_id: null, title: 'Which BMS?', status: 'open', kind: 'question' },
  ],
  decisions: [
    { id: 'e1', title: '18650 over 21700', occurred_at: '2026-03-02T10:00:00Z' },
  ],
};

describe('buildSkeleton', () => {
  it('names the project and its kind', () => {
    const s = buildSkeleton(base);
    expect(s).toContain('Custom EV bike');
    expect(s).toContain('build');
  });

  it('nests work items under their parent with status', () => {
    const s = buildSkeleton(base);
    expect(s).toMatch(/- \[doing\] Battery pack/);
    expect(s).toMatch(/ {2}- \[done\] Cell selection/);
  });

  it('lists open questions separately from tasks', () => {
    const s = buildSkeleton(base);
    const questions = s.slice(s.indexOf('Open questions'));
    expect(questions).toContain('Which BMS?');
  });

  it('lists decision titles so the agent can spot a candidate to pull', () => {
    expect(buildSkeleton(base)).toContain('18650 over 21700');
  });

  it('omits dropped work items', () => {
    const s = buildSkeleton({
      ...base,
      workItems: [{ id: 'w9', parent_id: null, title: 'Abandoned idea', status: 'dropped', kind: 'task' }],
    });
    expect(s).not.toContain('Abandoned idea');
  });

  it('truncates by recency and says so, rather than silently dropping context', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: `e${i}`,
      title: `Decision number ${i}`,
      occurred_at: `2026-01-01T00:00:0${i % 10}Z`,
    }));
    const s = buildSkeleton({ ...base, decisions: many }, { maxChars: 800 });
    expect(s.length).toBeLessThanOrEqual(800);
    expect(s).toContain('truncated');
  });

  it('handles an empty project without throwing', () => {
    const s = buildSkeleton({ project: { title: 'Empty', kind: 'learn', brief: null }, workItems: [], decisions: [] });
    expect(s).toContain('Empty');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-skeleton.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/skeleton`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/skeleton.ts
/**
 * Orientation, not retrieval.
 *
 * The reflex design is to embed everything and stuff the top-k into context.
 * That is the wrong shape for a single project, which is small: hundreds of
 * entries, dozens of work items. What an agent actually lacks is a map — the
 * shape of the work and the decisions already taken — so it can decide what
 * to pull. Detail arrives through tools, iteratively.
 *
 * This matters most for the question the phase exists to answer: "why did I
 * abandon that approach?" You cannot phrase that query well, so a single
 * similarity search over your bad phrasing fails. An agent that can read the
 * decision list, spot the candidate, and pull its neighbours succeeds.
 */

export type WorkItemStatus = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

export interface SkeletonProject {
  title: string;
  kind: string;
  brief: string | null;
}

export interface SkeletonWorkItem {
  id: string;
  parent_id: string | null;
  title: string;
  status: WorkItemStatus;
  kind: 'task' | 'question';
}

export interface SkeletonEntry {
  id: string;
  title: string | null;
  occurred_at: string;
}

export interface SkeletonInput {
  project: SkeletonProject;
  workItems: SkeletonWorkItem[];
  decisions: SkeletonEntry[];
}

export interface SkeletonOptions {
  /** Stated budget. Truncation is by recency and is always announced. */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 12_000;

function renderTree(items: SkeletonWorkItem[]): string[] {
  const byParent = new Map<string | null, SkeletonWorkItem[]>();
  for (const item of items) {
    const siblings = byParent.get(item.parent_id) ?? [];
    siblings.push(item);
    byParent.set(item.parent_id, siblings);
  }

  const lines: string[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const item of byParent.get(parent) ?? []) {
      lines.push(`${'  '.repeat(depth)}- [${item.status}] ${item.title}`);
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return lines;
}

export function buildSkeleton(input: SkeletonInput, options: SkeletonOptions = {}): string {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const live = input.workItems.filter((w) => w.status !== 'dropped');
  const tasks = live.filter((w) => w.kind === 'task');
  const questions = live.filter((w) => w.kind === 'question' && w.status !== 'done');

  const decisions = [...input.decisions].sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at)
  );

  const sections: string[] = [
    `# ${input.project.title} (${input.project.kind})`,
    input.project.brief ? `\n${input.project.brief}` : '',
    `\n## Work items\n${renderTree(tasks).join('\n') || '(none)'}`,
    `\n## Open questions\n${questions.map((q) => `- ${q.title}`).join('\n') || '(none)'}`,
    `\n## Decisions on record\n${decisions.map((d) => `- ${d.title ?? '(untitled)'}`).join('\n') || '(none)'}`,
  ];

  const full = sections.filter(Boolean).join('\n');
  if (full.length <= maxChars) return full;

  const notice = '\n\n[skeleton truncated by recency — use the tools to pull older detail]';
  return `${full.slice(0, Math.max(0, maxChars - notice.length))}${notice}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-skeleton.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/skeleton.ts apps/app/tests/unit/agents-skeleton.test.ts
git commit -m "feat(agents): build a project skeleton for run orientation"
```

---

## Task 3: Migration — agent tables, owner-only RLS, full-text search

**Files:**
- Create: `apps/app/supabase/migrations/20260818000100_phase2a_agents.sql`
- Modify: `apps/app/types/supabase.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: phase-1 tables `projects`, `entries`, `work_items`, `documents`.
- Produces: tables `agents`, `agent_runs`, `agent_tool_calls`, `ai_usage`, `project_budgets`; SQL function `search_repo(p_project_id uuid, p_query text, p_limit int)` returning `(source_type text, source_id uuid, title text, snippet text, rank real)`; foreign keys from `entries.agent_id`, `work_items.agent_id`, `documents.agent_id` to `agents(id)`.

- [ ] **Step 1: Write the migration**

```sql
-- apps/app/supabase/migrations/20260818000100_phase2a_agents.sql
--
-- Phase 2a: agents as capability boundaries, plus the run and cost record.
--
-- No embeddings table and no pgvector. A single project is small — hundreds
-- of entries — so search_repo is Postgres full-text only. The tool interface
-- is shaped so a vector half can be unioned in later without changing callers.

create table agents (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  owner_id         uuid not null references users(id) on delete cascade,
  slug             text not null,
  name             text not null,
  role_description text not null default '',
  system_prompt    text not null,
  tools            text[] not null default '{}',
  model            text not null default 'anthropic/claude-sonnet-5',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, slug),
  unique (id, project_id)
);

-- The phase-1 amendment lands here: agent_id was created nullable and
-- unconstrained precisely so this foreign key could be added without a
-- rewrite. Null still means human-authored.
alter table entries    add constraint entries_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;
alter table work_items add constraint work_items_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;
alter table documents  add constraint documents_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;

create table agent_runs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  agent_id     uuid not null references agents(id) on delete cascade,
  work_item_id uuid references work_items(id) on delete set null,
  trigger      text not null check (trigger in ('conversation','work_item_action')),
  status       text not null check (status in ('running','succeeded','failed','cancelled','capped')),
  step_count   integer not null default 0,
  error        text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table agent_tool_calls (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references agent_runs(id) on delete cascade,
  project_id     uuid not null references projects(id) on delete cascade,
  owner_id       uuid not null references users(id) on delete cascade,
  tool           text not null,
  args           jsonb not null,
  result_summary text,
  ok             boolean not null,
  duration_ms    integer,
  created_at     timestamptz not null default now()
);

create table ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  owner_id            uuid not null references users(id) on delete cascade,
  agent_id            uuid references agents(id) on delete set null,
  run_id              uuid references agent_runs(id) on delete set null,
  work_item_id        uuid references work_items(id) on delete set null,
  model               text not null,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  cached_input_tokens integer not null default 0,
  cost_usd            numeric(12,6) not null default 0,
  created_at          timestamptz not null default now()
);

create table project_budgets (
  project_id        uuid primary key references projects(id) on delete cascade,
  owner_id          uuid not null references users(id) on delete cascade,
  -- Not nullable, unlike the spec's sketch. A nullable cap makes the default
  -- posture "unlimited", which contradicts the criterion that exceeding a cap
  -- must stop runs rather than silently overspend. Default is a real number.
  monthly_cap_usd   numeric(10,2) not null default 10.00,
  per_run_token_cap integer not null default 200000,
  updated_at        timestamptz not null default now()
);

create index agent_runs_project_started_idx  on agent_runs (project_id, started_at desc);
create index agent_tool_calls_run_idx        on agent_tool_calls (run_id, created_at);
create index ai_usage_project_created_idx    on ai_usage (project_id, created_at desc);

-- Full-text search. Generated columns keep the vector in step with the row
-- without a trigger to forget. `english` is the stemmer; identifiers such as
-- part numbers survive it because to_tsvector keeps unrecognised tokens.
alter table entries    add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;
alter table work_items add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;
alter table documents  add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;

create index entries_search_idx    on entries    using gin (search_tsv);
create index work_items_search_idx on work_items using gin (search_tsv);
create index documents_search_idx  on documents  using gin (search_tsv);

-- SECURITY INVOKER (the default) is load-bearing: the function must run as
-- the caller so RLS applies to every table it touches. A SECURITY DEFINER
-- here would let any caller read any project's rows through the union.
create function search_repo(p_project_id uuid, p_query text, p_limit int default 20)
returns table (source_type text, source_id uuid, title text, snippet text, rank real)
language sql
stable
as $$
  with q as (select websearch_to_tsquery('english', p_query) as tsq)
  select 'entry', e.id, e.title,
         ts_headline('english', e.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
         ts_rank(e.search_tsv, q.tsq)
    from entries e, q
   where e.project_id = p_project_id and e.search_tsv @@ q.tsq
  union all
  select 'work_item', w.id, w.title,
         ts_headline('english', w.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
         ts_rank(w.search_tsv, q.tsq)
    from work_items w, q
   where w.project_id = p_project_id and w.search_tsv @@ q.tsq
  union all
  select 'document', d.id, d.title,
         ts_headline('english', d.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
         ts_rank(d.search_tsv, q.tsq)
    from documents d, q
   where d.project_id = p_project_id and d.search_tsv @@ q.tsq
  order by rank desc
  limit p_limit;
$$;

alter table agents           enable row level security;
alter table agent_runs       enable row level security;
alter table agent_tool_calls enable row level security;
alter table ai_usage         enable row level security;
alter table project_budgets  enable row level security;

-- Owner-only, with no public branch anywhere below.
--
-- Phase 1's child tables carry `or exists (... visibility = 'public')` so a
-- published project can be read. Extending that here would publish system
-- prompts, conversation content, run traces (including any query that left
-- the system), and spend figures the moment someone flips a project public.
-- Publishing the record is a phase-3 decision about entries and documents,
-- not about the machinery that produced them.
--
-- As in phase 1, insert and update checks additionally require the row's
-- project to belong to the caller, so ownership cannot be forged by
-- relocating a row into someone else's project. Written out longhand: you
-- cannot grep for a policy that exists only as a format string.

create policy agents_select on agents for select
  using (owner_id = auth.uid());
create policy agents_insert on agents for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agents.project_id and p.owner_id = auth.uid()));
create policy agents_update on agents for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agents.project_id and p.owner_id = auth.uid()));
create policy agents_delete on agents for delete
  using (owner_id = auth.uid());

create policy agent_runs_select on agent_runs for select
  using (owner_id = auth.uid());
create policy agent_runs_insert on agent_runs for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_runs.project_id and p.owner_id = auth.uid()));
create policy agent_runs_update on agent_runs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_runs.project_id and p.owner_id = auth.uid()));
create policy agent_runs_delete on agent_runs for delete
  using (owner_id = auth.uid());

create policy agent_tool_calls_select on agent_tool_calls for select
  using (owner_id = auth.uid());
create policy agent_tool_calls_insert on agent_tool_calls for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_tool_calls.project_id and p.owner_id = auth.uid()));
create policy agent_tool_calls_update on agent_tool_calls for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_tool_calls.project_id and p.owner_id = auth.uid()));
create policy agent_tool_calls_delete on agent_tool_calls for delete
  using (owner_id = auth.uid());

create policy ai_usage_select on ai_usage for select
  using (owner_id = auth.uid());
create policy ai_usage_insert on ai_usage for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = ai_usage.project_id and p.owner_id = auth.uid()));
create policy ai_usage_update on ai_usage for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = ai_usage.project_id and p.owner_id = auth.uid()));
create policy ai_usage_delete on ai_usage for delete
  using (owner_id = auth.uid());

create policy project_budgets_select on project_budgets for select
  using (owner_id = auth.uid());
create policy project_budgets_insert on project_budgets for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_budgets.project_id and p.owner_id = auth.uid()));
create policy project_budgets_update on project_budgets for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_budgets.project_id and p.owner_id = auth.uid()));
create policy project_budgets_delete on project_budgets for delete
  using (owner_id = auth.uid());
```

- [ ] **Step 2: Apply the migration locally and verify it is reversible from scratch**

Run:
```bash
cd apps/app && pnpm db:reset
```
Expected: reset replays every migration including this one with no error. If `db:start` has not been run in this session, run it first.

- [ ] **Step 3: Verify RLS carries no public branch**

Run:
```bash
grep -c "visibility = 'public'" apps/app/supabase/migrations/20260818000100_phase2a_agents.sql
```
Expected: `0`. Any other number means a phase-1 policy was copied verbatim — fix before continuing.

- [ ] **Step 4: Regenerate types**

Run:
```bash
cd apps/app && pnpm exec supabase gen types typescript --local > types/supabase.ts
```
Expected: `types/supabase.ts` gains `agents`, `agent_runs`, `agent_tool_calls`, `ai_usage`, `project_budgets`. Do not hand-edit this file.

- [ ] **Step 5: Verify the project still typechecks**

Run: `pnpm typecheck`
Expected: PASS for both apps.

- [ ] **Step 6: Commit**

```bash
git add apps/app/supabase/migrations/20260818000100_phase2a_agents.sql apps/app/types/supabase.ts
git commit -m "feat(db): add agent, run, and metering tables with owner-only RLS"
```

---

## Task 4: RLS isolation tests for the new tables

The security regression gate. Phase 1 established that when you add a table, you extend these.

**Files:**
- Create: `apps/app/tests/rls/agents-isolation.test.ts`

**Interfaces:**
- Consumes: `createTestUser`, `deleteTestUser`, `type TestUser` from `../helpers/supabase`; the tables from Task 3.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/rls/agents-isolation.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProjectId: string;
let aliceAgentId: string;
let aliceRunId: string;
let alicePublicProjectId: string;
let alicePublicAgentId: string;
let bobProjectId: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`agent-alice-${stamp}@example.test`);
  bob = await createTestUser(`agent-bob-${stamp}@example.test`);

  const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
    const { data, error } = await user.client.from(table).insert(values).select().single();
    if (error) throw error;
    return data as { id: string };
  };

  aliceProjectId = (await insert(alice, 'projects', {
    owner_id: alice.id, slug: 'ev-bike', title: 'Custom EV bike', kind: 'build',
  })).id;

  // A public project, to prove publishing does NOT expose the agent layer.
  alicePublicProjectId = (await insert(alice, 'projects', {
    owner_id: alice.id, slug: 'open-notes', title: 'Open notes', kind: 'learn', visibility: 'public',
  })).id;

  bobProjectId = (await insert(bob, 'projects', {
    owner_id: bob.id, slug: 'bob-thing', title: 'Bob thing', kind: 'research',
  })).id;

  aliceAgentId = (await insert(alice, 'agents', {
    project_id: aliceProjectId, owner_id: alice.id, slug: 'critic', name: 'Critic',
    system_prompt: 'Argue with me.', tools: ['search_repo'],
  })).id;

  alicePublicAgentId = (await insert(alice, 'agents', {
    project_id: alicePublicProjectId, owner_id: alice.id, slug: 'critic', name: 'Critic',
    system_prompt: 'Secret prompt.', tools: ['search_repo'],
  })).id;

  aliceRunId = (await insert(alice, 'agent_runs', {
    project_id: aliceProjectId, owner_id: alice.id, agent_id: aliceAgentId,
    trigger: 'conversation', status: 'succeeded',
  })).id;

  await insert(alice, 'agent_tool_calls', {
    run_id: aliceRunId, project_id: aliceProjectId, owner_id: alice.id,
    tool: 'search_repo', args: { query: 'battery' }, ok: true,
  });

  await insert(alice, 'ai_usage', {
    project_id: aliceProjectId, owner_id: alice.id, agent_id: aliceAgentId, run_id: aliceRunId,
    model: 'anthropic/claude-sonnet-5', input_tokens: 100, output_tokens: 50, cost_usd: 0.001,
  });
}, 60_000);

afterAll(async () => {
  if (alice) await deleteTestUser(alice);
  if (bob) await deleteTestUser(bob);
});

describe('agent-layer isolation', () => {
  it('hides another owner’s agents', async () => {
    const { data } = await bob!.client.from('agents').select('id').eq('id', aliceAgentId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s runs', async () => {
    const { data } = await bob!.client.from('agent_runs').select('id').eq('id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s tool calls, including the query strings', async () => {
    const { data } = await bob!.client.from('agent_tool_calls').select('id').eq('run_id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides another owner’s spend', async () => {
    const { data } = await bob!.client.from('ai_usage').select('id').eq('run_id', aliceRunId);
    expect(data ?? []).toHaveLength(0);
  });

  it('does NOT expose agents of a PUBLIC project', async () => {
    // The whole point of the owner-only policies. A published project shares
    // its record, not its system prompts, transcripts, or spend.
    const { data } = await bob!.client.from('agents').select('id').eq('id', alicePublicAgentId);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses an agent planted in another owner’s project', async () => {
    const { error } = await bob!.client.from('agents').insert({
      project_id: aliceProjectId, owner_id: bob!.id, slug: 'sneak', name: 'Sneak',
      system_prompt: 'x', tools: [],
    });
    expect(error).not.toBeNull();
  });

  it('refuses an agent whose owner_id is forged', async () => {
    const { error } = await bob!.client.from('agents').insert({
      project_id: bobProjectId, owner_id: alice!.id, slug: 'forged', name: 'Forged',
      system_prompt: 'x', tools: [],
    });
    expect(error).not.toBeNull();
  });

  it('refuses relocating an agent into another owner’s project', async () => {
    const { error } = await bob!.client
      .from('agents').update({ project_id: aliceProjectId }).eq('project_id', bobProjectId);
    expect(error).not.toBeNull();
  });

  it('scopes search_repo to the caller’s own project', async () => {
    const { data } = await bob!.client.rpc('search_repo', {
      p_project_id: aliceProjectId, p_query: 'battery', p_limit: 20,
    });
    expect(data ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails against an un-migrated database**

Run: `pnpm --filter @goalspace/app exec vitest run tests/rls/agents-isolation.test.ts`
Expected: FAIL if Task 3's migration has not been applied to the target project. Apply it, then continue.

- [ ] **Step 3: Run to verify it passes**

Run: `pnpm test:rls`
Expected: PASS — the new file plus the existing phase-1 isolation, schema, and storage tests.

- [ ] **Step 4: Commit**

```bash
git add apps/app/tests/rls/agents-isolation.test.ts
git commit -m "test(rls): prove the agent layer stays private, including on public projects"
```

---

## Task 5: Tool registry and allowlist intersection

The registry is the whole capability model. `resolveTools` is the security primitive and is a pure function, so it is tested directly.

**Files:**
- Create: `apps/app/lib/agents/tools/registry.ts`
- Test: `apps/app/tests/unit/agents-registry.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces: `REPO_READ: readonly string[]`, `type ToolName`, `type ToolDefinition = { name: ToolName; description: string; inputSchema: z.ZodTypeAny; writes: boolean; external: boolean }`, `REGISTRY: Record<ToolName, ToolDefinition>`, `resolveTools(allowlist: readonly string[]): ToolDefinition[]`, `isAllowed(allowlist: readonly string[], tool: string): boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-registry.test.ts
import { describe, expect, it } from 'vitest';

import { REGISTRY, REPO_READ, isAllowed, resolveTools } from '@/lib/agents/tools/registry';

describe('resolveTools', () => {
  it('returns only the intersection of registry and allowlist', () => {
    const names = resolveTools(['search_repo', 'read_document']).map((t) => t.name);
    expect(names.sort()).toEqual(['read_document', 'search_repo']);
  });

  it('silently drops an allowlist entry that is not a real tool', () => {
    // A typo in agent.tools must not become an unhandled crash at run start.
    expect(resolveTools(['search_repo', 'not_a_tool']).map((t) => t.name)).toEqual(['search_repo']);
  });

  it('returns nothing for an empty allowlist', () => {
    expect(resolveTools([])).toEqual([]);
  });

  it('never returns a tool merely because it exists in the registry', () => {
    const names = resolveTools(['search_repo']).map((t) => t.name);
    expect(names).not.toContain('list_entries');
  });
});

describe('isAllowed', () => {
  it('is false for a tool outside the allowlist', () => {
    expect(isAllowed(['search_repo'], 'read_document')).toBe(false);
  });

  it('is false for a tool that is not in the registry at all', () => {
    expect(isAllowed(['web_search'], 'web_search')).toBe(false);
  });

  it('is true only for a registry tool that is also allowlisted', () => {
    expect(isAllowed(['search_repo'], 'search_repo')).toBe(true);
  });
});

describe('REPO_READ', () => {
  it('contains no write tools', () => {
    for (const name of REPO_READ) expect(REGISTRY[name].writes).toBe(false);
  });

  it('contains nothing that leaves the system', () => {
    // The distinction that makes "repo-read-only" mean something. If
    // web_search ever lands in this group, the Critic silently gains reach.
    for (const name of REPO_READ) expect(REGISTRY[name].external).toBe(false);
  });
});

describe('REGISTRY', () => {
  it('ships no write tools in phase 2a', () => {
    // Write tools require the proposal layer, which is phase 2b.
    for (const def of Object.values(REGISTRY)) expect(def.writes).toBe(false);
  });

  it('never accepts a project_id from the model', () => {
    // Scope comes from the run context. A project_id in a tool's input schema
    // would let a model ask for another project by guessing an id.
    for (const def of Object.values(REGISTRY)) {
      const shape = (def.inputSchema as { shape?: Record<string, unknown> }).shape ?? {};
      expect(Object.keys(shape)).not.toContain('project_id');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-registry.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/tools/registry`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/tools/registry.ts
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
      'Full-text search across this project\'s entries, work items, and documents. ' +
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
    description: 'Read a document\'s current body.',
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-registry.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/tools/registry.ts apps/app/tests/unit/agents-registry.test.ts
git commit -m "feat(agents): add the tool registry and allowlist intersection"
```

---

## Task 6: Tool handlers, scoped by run context

**Files:**
- Create: `apps/app/lib/agents/tools/handlers/index.ts`
- Test: `apps/app/tests/unit/agents-handlers.test.ts`

**Interfaces:**
- Consumes: `ToolName` from Task 5; `SupabaseClient<Database>` from `@/types/supabase`.
- Produces: `type ToolContext = { supabase: SupabaseClient<Database>; projectId: string }`, `HANDLERS: Record<ToolName, (ctx: ToolContext, args: any) => Promise<unknown>>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-handlers.test.ts
import { describe, expect, it, vi } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';

/** Minimal query-builder stub: records what was asked for, returns fixed rows. */
function stubSupabase(rows: unknown[]) {
  const calls: Array<{ table?: string; filters: Record<string, unknown>; rpc?: string }> = [];
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    order: chain,
    limit: chain,
    in: (col: string, val: unknown) => {
      calls.at(-1)!.filters[col] = val;
      return builder;
    },
    eq: (col: string, val: unknown) => {
      calls.at(-1)!.filters[col] = val;
      return builder;
    },
    then: (resolve: (r: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  });
  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push({ table, filters: {} });
        return builder;
      },
      rpc: (rpc: string, args: Record<string, unknown>) => {
        calls.push({ rpc, filters: args });
        return Promise.resolve({ data: rows, error: null });
      },
    } as never,
  };
}

const ctx = (client: never): ToolContext => ({ supabase: client, projectId: 'proj-1' });

describe('handlers are project-scoped by context', () => {
  it('search_repo passes the context project id, not one from args', async () => {
    const s = stubSupabase([{ source_type: 'entry', source_id: 'e1' }]);
    await HANDLERS.search_repo(ctx(s.client), { query: 'battery', limit: 20 });
    expect(s.calls[0].rpc).toBe('search_repo');
    expect(s.calls[0].filters.p_project_id).toBe('proj-1');
  });

  it('list_entries filters by the context project id', async () => {
    const s = stubSupabase([]);
    await HANDLERS.list_entries(ctx(s.client), { limit: 50 });
    expect(s.calls[0].filters.project_id).toBe('proj-1');
  });

  it('ignores a project_id smuggled into args', async () => {
    // Belt and braces: the schema has no project_id, but if one arrives the
    // handler must not honour it.
    const s = stubSupabase([]);
    await HANDLERS.list_entries(ctx(s.client), { limit: 50, project_id: 'someone-else' } as never);
    expect(s.calls[0].filters.project_id).toBe('proj-1');
  });

  it('read_document scopes by project as well as id', async () => {
    const s = stubSupabase([]);
    await HANDLERS.read_document(ctx(s.client), { id: 'doc-1' });
    expect(s.calls[0].filters.project_id).toBe('proj-1');
    expect(s.calls[0].filters.id).toBe('doc-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-handlers.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/tools/handlers`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/tools/handlers/index.ts
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

    const children = new Map<string | null, typeof all>();
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-handlers.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/tools/handlers/index.ts apps/app/tests/unit/agents-handlers.test.ts
git commit -m "feat(agents): add project-scoped repo-read tool handlers"
```

---

## Task 7: Executor — allowlist enforcement and run recording

**This is the security property of the phase.** Capabilities are enforced, not requested. The test drives the dispatcher with a stubbed model emitting calls the agent is not allowed to make, and asserts the handler is never reached.

**Files:**
- Create: `apps/app/lib/agents/executor.ts`
- Test: `apps/app/tests/unit/agents-executor.test.ts`

**Interfaces:**
- Consumes: `resolveTools`, `isAllowed`, `REGISTRY`, `type ToolName` (Task 5); `HANDLERS`, `type ToolContext` (Task 6).
- Produces: `type RunContext = { supabase: SupabaseClient<Database>; projectId: string; ownerId: string; agentId: string; runId: string; allowlist: readonly string[] }`, `type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string }`, `dispatchToolCall(ctx: RunContext, tool: string, args: unknown, handlers?: typeof HANDLERS): Promise<ToolOutcome>`, `buildToolSet(ctx: RunContext): ToolSet`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-executor.test.ts
import { describe, expect, it, vi } from 'vitest';

import { dispatchToolCall, type RunContext } from '@/lib/agents/executor';

/** Captures every agent_tool_calls insert without a database. */
function recordingSupabase() {
  const inserted: Record<string, unknown>[] = [];
  return {
    inserted,
    client: {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          if (table === 'agent_tool_calls') inserted.push(row);
          return Promise.resolve({ error: null });
        },
      }),
    } as never,
  };
}

function context(allowlist: readonly string[], client: never): RunContext {
  return {
    supabase: client,
    projectId: 'proj-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
    allowlist,
  };
}

describe('dispatchToolCall — allowlist enforcement', () => {
  it('runs a handler that is both in the registry and allowlisted', async () => {
    const s = recordingSupabase();
    const handlers = { search_repo: vi.fn().mockResolvedValue([{ source_id: 'e1' }]) } as never;
    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client), 'search_repo', { query: 'battery' }, handlers
    );
    expect(outcome).toEqual({ ok: true, result: [{ source_id: 'e1' }] });
    expect((handlers as never as { search_repo: ReturnType<typeof vi.fn> }).search_repo).toHaveBeenCalledOnce();
  });

  it('NEVER reaches the handler for a tool outside the allowlist', async () => {
    // The core property. A repo-read agent that emits read_document while its
    // allowlist holds only search_repo must not read the document.
    const s = recordingSupabase();
    const readDocument = vi.fn();
    const handlers = { search_repo: vi.fn(), read_document: readDocument } as never;

    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client), 'read_document', { id: 'doc-1' }, handlers
    );

    expect(readDocument).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });

  it('rejects a tool that is not in the registry at all', async () => {
    // web_search does not exist in phase 2a. A model that emits it — because
    // it saw the name in a prompt, or hallucinated it — gets an error result,
    // not an execution.
    const s = recordingSupabase();
    const outcome = await dispatchToolCall(
      context(['search_repo', 'web_search'], s.client), 'web_search', { q: 'x' }, {} as never
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toMatch(/not available/i);
  });

  it('records a rejected call as a failed tool call', async () => {
    const s = recordingSupabase();
    await dispatchToolCall(
      context(['search_repo'], s.client), 'read_document', { id: 'doc-1' }, {} as never
    );
    expect(s.inserted).toHaveLength(1);
    expect(s.inserted[0]).toMatchObject({
      run_id: 'run-1', project_id: 'proj-1', owner_id: 'owner-1', tool: 'read_document', ok: false,
    });
  });

  it('records the arguments of a rejected call, so the trace shows what was attempted', async () => {
    const s = recordingSupabase();
    await dispatchToolCall(
      context(['search_repo'], s.client), 'read_document', { id: 'doc-42' }, {} as never
    );
    expect(s.inserted[0].args).toEqual({ id: 'doc-42' });
  });

  it('records a successful call as ok', async () => {
    const s = recordingSupabase();
    const handlers = { search_repo: vi.fn().mockResolvedValue([]) } as never;
    await dispatchToolCall(context(['search_repo'], s.client), 'search_repo', { query: 'x' }, handlers);
    expect(s.inserted[0]).toMatchObject({ tool: 'search_repo', ok: true });
  });

  it('returns a handler failure to the model as an error result rather than aborting', async () => {
    // A failing tool should let the agent adapt, not kill the run.
    const s = recordingSupabase();
    const handlers = { search_repo: vi.fn().mockRejectedValue(new Error('boom')) } as never;
    const outcome = await dispatchToolCall(
      context(['search_repo'], s.client), 'search_repo', { query: 'x' }, handlers
    );
    expect(outcome).toEqual({ ok: false, error: 'boom' });
    expect(s.inserted[0]).toMatchObject({ ok: false });
  });

  it('rejects an allowlist entry that is not a registry tool even if the handler exists', async () => {
    // Defence in depth: a handler map entry must not be reachable purely
    // because someone typed its name into agent.tools.
    const s = recordingSupabase();
    const ghost = vi.fn();
    const outcome = await dispatchToolCall(
      context(['ghost_tool'], s.client), 'ghost_tool', {}, { ghost_tool: ghost } as never
    );
    expect(ghost).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-executor.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/executor`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/executor.ts
import { tool, type ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, isAllowed, resolveTools } from '@/lib/agents/tools/registry';

/**
 * The executor is where "specialisation" stops being cosmetic.
 *
 * Two gates, deliberately redundant. `buildToolSet` hands the model only
 * `registry ∩ agent.tools`, so a disallowed tool is not describable. And
 * `dispatchToolCall` re-checks the allowlist before touching a handler, so a
 * call that arrives anyway — a hallucinated name, a future code path that
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
}

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

async function recordToolCall(
  ctx: RunContext,
  tool: string,
  args: unknown,
  ok: boolean,
  durationMs: number,
  resultSummary: string | null
): Promise<void> {
  await ctx.supabase.from('agent_tool_calls').insert({
    run_id: ctx.runId,
    project_id: ctx.projectId,
    owner_id: ctx.ownerId,
    tool,
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

  const toolContext: ToolContext = { supabase: ctx.supabase, projectId: ctx.projectId };
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-executor.test.ts`
Expected: PASS, 8 tests. The two that matter most are "NEVER reaches the handler" and "rejects a tool that is not in the registry".

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/executor.ts apps/app/tests/unit/agents-executor.test.ts
git commit -m "feat(agents): enforce the tool allowlist in the executor, proven by test"
```

---

## Task 8: Caps and usage recording

**Files:**
- Create: `apps/app/lib/agents/caps.ts`
- Test: `apps/app/tests/unit/agents-caps.test.ts`

**Interfaces:**
- Consumes: `costUsd` (Task 1).
- Produces: `type Budget = { monthly_cap_usd: number; per_run_token_cap: number }`, `type CapVerdict = { allowed: true } | { allowed: false; cap: 'monthly' | 'per_run'; message: string }`, `checkCaps(input: { budget: Budget; monthToDateUsd: number; runTokens: number }): CapVerdict`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-caps.test.ts
import { describe, expect, it } from 'vitest';

import { checkCaps } from '@/lib/agents/caps';

const budget = { monthly_cap_usd: 10, per_run_token_cap: 200_000 };

describe('checkCaps', () => {
  it('allows a run comfortably inside both caps', () => {
    expect(checkCaps({ budget, monthToDateUsd: 1, runTokens: 1000 })).toEqual({ allowed: true });
  });

  it('blocks when month-to-date spend has reached the monthly cap', () => {
    const v = checkCaps({ budget, monthToDateUsd: 10, runTokens: 0 });
    expect(v).toMatchObject({ allowed: false, cap: 'monthly' });
  });

  it('blocks when month-to-date spend is over the cap', () => {
    expect(checkCaps({ budget, monthToDateUsd: 10.01, runTokens: 0 }).allowed).toBe(false);
  });

  it('blocks when the run has burned its token cap', () => {
    const v = checkCaps({ budget, monthToDateUsd: 0, runTokens: 200_000 });
    expect(v).toMatchObject({ allowed: false, cap: 'per_run' });
  });

  it('reports the monthly cap first when both are exceeded', () => {
    // The monthly cap is the one the owner actually cares about.
    const v = checkCaps({ budget, monthToDateUsd: 99, runTokens: 999_999 });
    expect(v).toMatchObject({ allowed: false, cap: 'monthly' });
  });

  it('carries a message the UI can state plainly', () => {
    const v = checkCaps({ budget, monthToDateUsd: 10, runTokens: 0 });
    if (v.allowed) throw new Error('expected a block');
    expect(v.message.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-caps.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/caps`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/app/lib/agents/caps.ts
/**
 * Spend limits, checked before a run starts and again after each step.
 *
 * An agentic retrieval loop with a stuck model is the realistic way to burn a
 * budget, so the per-run token cap matters as much as the monthly one. A run
 * that trips either ends with status `capped`, keeps whatever it produced,
 * and surfaces which cap it hit — silence here is the failure mode the
 * success criteria exist to rule out.
 */

export interface Budget {
  monthly_cap_usd: number;
  per_run_token_cap: number;
}

export type CapVerdict =
  | { allowed: true }
  | { allowed: false; cap: 'monthly' | 'per_run'; message: string };

export function checkCaps(input: {
  budget: Budget;
  monthToDateUsd: number;
  runTokens: number;
}): CapVerdict {
  const { budget, monthToDateUsd, runTokens } = input;

  if (monthToDateUsd >= budget.monthly_cap_usd) {
    return {
      allowed: false,
      cap: 'monthly',
      message: `Monthly cap of $${budget.monthly_cap_usd.toFixed(2)} reached ($${monthToDateUsd.toFixed(2)} spent).`,
    };
  }

  if (runTokens >= budget.per_run_token_cap) {
    return {
      allowed: false,
      cap: 'per_run',
      message: `This run reached its ${budget.per_run_token_cap.toLocaleString()} token limit.`,
    };
  }

  return { allowed: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-caps.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/caps.ts apps/app/tests/unit/agents-caps.test.ts
git commit -m "feat(agents): add monthly and per-run spend caps"
```

---

## Task 9: Streaming route handler and the seeded Critic

Only the Critic is seeded in phase 2a. The Tutor and Researcher from spec §5.5 need `propose_entry`, `generate_audio`, and `web_search`, none of which exist yet — seeding an agent whose tools are absent would misrepresent what it can do. They arrive with their tools in 2b/2c.

**Files:**
- Create: `apps/app/app/api/agents/[agentId]/ask/route.ts`
- Create: `apps/app/lib/agents/templates.ts`
- Test: `apps/app/tests/unit/agents-templates.test.ts`

**Interfaces:**
- Consumes: `buildToolSet`, `type RunContext` (Task 7); `buildSkeleton` (Task 2); `checkCaps` (Task 8); `costUsd` (Task 1); `REPO_READ` (Task 5).
- Produces: `SEEDED_TEMPLATES: readonly AgentTemplate[]`, `type AgentTemplate = { slug: string; name: string; role_description: string; system_prompt: string; tools: readonly string[]; model: string }`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-templates.test.ts
import { describe, expect, it } from 'vitest';

import { SEEDED_TEMPLATES } from '@/lib/agents/templates';
import { REGISTRY } from '@/lib/agents/tools/registry';

describe('SEEDED_TEMPLATES', () => {
  it('seeds only agents whose every tool exists in the registry', () => {
    // An agent referencing a tool that has not shipped would silently have
    // fewer capabilities than its description claims.
    for (const template of SEEDED_TEMPLATES) {
      for (const name of template.tools) {
        expect(Object.keys(REGISTRY)).toContain(name);
      }
    }
  });

  it('includes a Critic that can write nothing and reach nowhere', () => {
    // The clearest demonstration that tools are a real boundary.
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic');
    expect(critic).toBeDefined();
    for (const name of critic!.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes).toBe(false);
      expect(REGISTRY[name as keyof typeof REGISTRY].external).toBe(false);
    }
  });

  it('uses dotted gateway model slugs', () => {
    // anthropic/claude-sonnet-5, never anthropic/claude-sonnet-4-6.
    for (const template of SEEDED_TEMPLATES) {
      expect(template.model).toMatch(/^[a-z]+\/[a-z0-9.\-]+$/);
      expect(template.model).not.toMatch(/-\d+-\d+$/);
    }
  });

  it('gives every template a non-empty system prompt', () => {
    for (const template of SEEDED_TEMPLATES) {
      expect(template.system_prompt.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-templates.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/templates`.

- [ ] **Step 3: Write the templates**

```typescript
// apps/app/lib/agents/templates.ts
import { REPO_READ } from '@/lib/agents/tools/registry';

/**
 * Seeded per new project, all editable and deletable.
 *
 * Phase 2a seeds only the Critic. The Tutor and Researcher in the design need
 * propose_entry, generate_audio, and web_search — none of which exist until
 * the proposal layer ships — and an agent whose tools are missing would claim
 * capabilities it does not have.
 *
 * The Critic having no write tools is the point rather than a limitation: it
 * is the clearest demonstration in the product that a tool set is a real
 * boundary and not a description.
 */

export interface AgentTemplate {
  slug: string;
  name: string;
  role_description: string;
  system_prompt: string;
  tools: readonly string[];
  model: string;
}

export const SEEDED_TEMPLATES: readonly AgentTemplate[] = [
  {
    slug: 'critic',
    name: 'Critic',
    role_description: 'Reviews decisions and plans, argues with you, writes nothing.',
    system_prompt: [
      'You review this project’s decisions and plans. You argue with the owner.',
      '',
      'You can read the record and nothing else. You cannot write to it, and you',
      'cannot reach outside it — so never claim to have looked something up, and',
      'never offer to make a change. If a claim needs a source you do not have,',
      'say what you would need.',
      '',
      'Cite what you draw on. When you reference a decision or entry, name it, so',
      'the owner can find it. Do not invent an id you have not seen in a tool',
      'result.',
      '',
      'Be specific and unsentimental. The owner wants the weakness in the plan,',
      'not encouragement. If a decision looks sound, say so briefly and move on.',
    ].join('\n'),
    tools: REPO_READ,
    model: 'anthropic/claude-sonnet-5',
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-templates.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the streaming route handler**

```typescript
// apps/app/app/api/agents/[agentId]/ask/route.ts
import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { buildSkeleton } from '@/lib/agents/skeleton';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { checkCaps } from '@/lib/agents/caps';
import { costUsd } from '@/lib/agents/cost';

/**
 * The loop runs inside the stream.
 *
 * Flushing tokens as they arrive keeps the connection alive through a
 * multi-step retrieval loop and gives the conversation UI its streaming for
 * free. The hard step limit is what keeps a stuck model from running until
 * the platform kills it; the per-run token cap is what keeps it from costing
 * anything meaningful if it does.
 */
export const maxDuration = 300;

const MAX_STEPS = 12;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { prompt, workItemId } = (await request.json()) as {
    prompt?: string;
    workItemId?: string;
  };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  // RLS means this returns nothing unless the caller owns the agent.
  const { data: agent } = await supabase
    .from('agents')
    .select('id, project_id, owner_id, system_prompt, tools, model, is_active')
    .eq('id', agentId)
    .single();
  if (!agent || !agent.is_active) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
  }

  const budget = await loadBudget(supabase, agent.project_id, auth.user.id);
  const monthToDate = await monthToDateSpend(supabase, agent.project_id);
  const before = checkCaps({ budget, monthToDateUsd: monthToDate, runTokens: 0 });
  if (!before.allowed) {
    return NextResponse.json({ error: before.message, cap: before.cap }, { status: 402 });
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .insert({
      project_id: agent.project_id,
      owner_id: auth.user.id,
      agent_id: agent.id,
      work_item_id: workItemId ?? null,
      trigger: workItemId ? 'work_item_action' : 'conversation',
      status: 'running',
    })
    .select('id')
    .single();
  if (!run) return NextResponse.json({ error: 'Could not start a run.' }, { status: 500 });

  const context: RunContext = {
    supabase,
    projectId: agent.project_id,
    ownerId: auth.user.id,
    agentId: agent.id,
    runId: run.id,
    allowlist: agent.tools,
  };

  const skeleton = await loadSkeleton(supabase, agent.project_id);

  const result = streamText({
    model: agent.model,
    system: `${agent.system_prompt}\n\n---\n\nThe project as it stands:\n\n${skeleton}`,
    prompt,
    tools: buildToolSet(context),
    stopWhen: stepCountIs(MAX_STEPS),
    maxRetries: 1,
    onStepFinish: async ({ usage }) => {
      await supabase.from('ai_usage').insert({
        project_id: agent.project_id,
        owner_id: auth.user.id,
        agent_id: agent.id,
        run_id: run.id,
        work_item_id: workItemId ?? null,
        model: agent.model,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cached_input_tokens: usage.cachedInputTokens ?? 0,
        cost_usd: costUsd({
          model: agent.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedInputTokens: usage.cachedInputTokens,
        }),
      });
    },
    onFinish: async ({ steps }) => {
      await supabase
        .from('agent_runs')
        .update({ status: 'succeeded', step_count: steps.length, ended_at: new Date().toISOString() })
        .eq('id', run.id);
    },
    onError: async ({ error }) => {
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          ended_at: new Date().toISOString(),
        })
        .eq('id', run.id);
    },
  });

  return result.toTextStreamResponse();
}

async function loadBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  ownerId: string
) {
  const { data } = await supabase
    .from('project_budgets')
    .select('monthly_cap_usd, per_run_token_cap')
    .eq('project_id', projectId)
    .maybeSingle();
  if (data) {
    return {
      monthly_cap_usd: Number(data.monthly_cap_usd),
      per_run_token_cap: data.per_run_token_cap,
    };
  }
  await supabase.from('project_budgets').insert({ project_id: projectId, owner_id: ownerId });
  return { monthly_cap_usd: 10, per_run_token_cap: 200_000 };
}

async function monthToDateSpend(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<number> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('ai_usage')
    .select('cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', since.toISOString());
  return (data ?? []).reduce((total, row) => total + Number(row.cost_usd), 0);
}

async function loadSkeleton(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<string> {
  const [{ data: project }, { data: workItems }, { data: decisions }] = await Promise.all([
    supabase.from('projects').select('title, kind, brief').eq('id', projectId).single(),
    supabase
      .from('work_items')
      .select('id, parent_id, title, status, kind')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
    supabase
      .from('entries')
      .select('id, title, occurred_at')
      .eq('project_id', projectId)
      .eq('kind', 'decision')
      .order('occurred_at', { ascending: false })
      .limit(200),
  ]);

  if (!project) return '(project not found)';
  return buildSkeleton({
    project,
    workItems: workItems ?? [],
    decisions: decisions ?? [],
  });
}
```

- [ ] **Step 6: Verify the whole project typechecks and every test passes**

Run:
```bash
pnpm typecheck && pnpm test
```
Expected: typecheck PASS for both apps; all unit tests pass, including the 125 pre-existing ones.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/agents/templates.ts apps/app/app/api/agents apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(agents): add the streaming ask route and seed the Critic"
```

---

## Done when

1. A Critic asked *"why did I abandon X?"* over a real project answers from entries it actually read, and the run trace shows which tools it called with what arguments.
2. An agent whose allowlist omits a tool cannot invoke it even when the model emits the call — proven by `tests/unit/agents-executor.test.ts`, not by prompt instruction.
3. Every run writes an `agent_runs` row and at least one `ai_usage` row; month-to-date spend is derivable by summing `ai_usage.cost_usd`.
4. Exceeding the monthly cap returns 402 with a stated reason rather than silently spending.
5. `pnpm test:rls` proves no second user can read any agent, run, tool call, or usage row — including on a project marked public.
6. Quick capture stays fast. The generated `search_tsv` columns do add a
   `to_tsvector` call to every entry, work-item, and document write — but it is
   microseconds of CPU and, unlike an embedding call, it cannot block on a
   network. Success criterion 5 forbids inline *embedding* work and this plan
   ships none. If capture latency ever regresses measurably, the columns can be
   replaced by a trigger-fed queue without changing `search_repo`'s signature.

## Not in this plan

Proposals and the approval inbox; conversations and message persistence; the agent editor and run-trace UI; `web_search`; `generate_audio`; embeddings and vector search; the Tutor and Researcher templates. Each needs its own plan, and each depends on this one.

## Before starting

`pnpm --filter @goalspace/app verify:gateway` must succeed. It currently fails with 403 `RestrictedModelsError` on the free tier — Tasks 1 through 8 need no model access, but Task 9 cannot be exercised end to end until AI Gateway credits are added.

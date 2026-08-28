# Workspace Dashboard, Slice D1: Data and Project Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner change what a project is, see what its agents have spent against the cap that stops them, and delete it deliberately.

**Architecture:** One migration, three new database modules' worth of functions, three server actions, and one route. The budget helpers already exist as private copies inside the agent ask route; this slice moves them into `lib/db/` so the settings page and the executor read spend the same way rather than two ways that can disagree.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres + RLS) · zod · Vitest.

**Spec:** [docs/superpowers/specs/2026-08-26-workspace-dashboard-design.md](../specs/2026-08-26-workspace-dashboard-design.md) — §5 (shell), §6.4 (project settings), §7 (data work). Slices A, B and C are merged to `main`.

**Slice D was split in two.** D1 is this plan. **D2** covers account settings at `/settings` — theme, language, time zone, email notifications — and wires the time zone through the twelve date-formatting call sites. The split exists because D1 contains a destructive delete flow that deserves undivided review attention, and because D2's theme work changes first-paint behaviour, which is a different kind of risk.

## Global Constraints

- **WCAG 2.1 AA.** Every form control has a label. Status is never colour alone. Error text carries `role="alert"`. Body measure capped at 65–75 characters for prose.
- **There is no `danger` colour token.** The palette is exactly `paper` / `paper-shade` / `ink` / `ink-soft` / `rule` / `rule-strong` / `oxide` / `oxide-deep` / `waiting`. `text-danger` compiles to nothing and renders in the inherited colour — this bug has shipped in this repo three times. Destructive affordances use `oxide` / `oxide-deep`.
- **Square corners, no shadows.** `borderRadius` and `boxShadow` are flattened to zero. Separation is by hairline rule and ground.
- **Control clusters wrap rather than overflow at phone widths:** `flex flex-wrap`, `min-w-0 flex-1` on growing cells, `shrink-0` on fixed ones. A previous slice shipped a control rendered off-screen at 375px by departing from this.
- **`next.config.js` sets `trailingSlash: true`.** Path comparison goes through `isActive(pathname, destination)` — pathname first — never a hand-rolled comparison.
- **Every user-facing string in `en`, `ms`, `zh`, with identical key sets.** `packages/i18n/tests/locale-parity.test.ts` fails and names any key added to one file and forgotten in another.
- **`apps/app` vitest runs `environment: 'node'`** with `include: ['tests/**/*.test.ts']`. No jsdom, no testing-library, no `.tsx` test files. Component behaviour is verified in a browser, never by a component test.
- **RLS tests are the security regression gate.** Two-user isolation against the local stack via `apps/app/.env.test`. When you add a read or write path, extend them.
- **No `any`, no `@ts-expect-error`.**
- **Node 22+:** `source ~/.nvm/nvm.sh && nvm use 22`, then `corepack pnpm` from the repo root.

## Rulings taken while writing this plan

**R1 — the migration lands in D1 even though D2 consumes the columns.**
`user_settings.locale` and `time_zone` are used by account settings, which is D2. They ship here anyway, for one reason: a production migration is the riskiest step in any slice, and this repo's established pattern is to land schema ahead of the code that needs it (`revision_authorship` went to production before its PR merged). One reviewed migration beats two. The columns are inert until D2 — say so in the migration comment rather than letting a reader assume something reads them.

**R2 — the budget helpers move out of the ask route rather than being copied.**
`loadBudget` is currently a private function inside `app/api/agents/[agentId]/ask/route.ts`. §7 says these "move to `lib/db/`". A second copy for the settings page would be the worst outcome: two definitions of what a project's cap is, drifting silently. The ask route is refactored to import from the new module in the same task, so there is never a moment with two.

**R3 — `monthToDateSpend` must use the same window as the cap that refuses runs.**
`start_agent_run` sums `ai_usage` where `created_at >= (date_trunc('month', (now() at time zone 'utc')) at time zone 'utc')` — a UTC calendar month, with an explicit cast documented in the migration to avoid leaning on the server's timezone. The settings page must use that window exactly. A page that computes month-to-date any other way would show a number that disagrees with what actually stops a run, which is worse than showing nothing.

**R4 — the worst-case reservation is the maximum across the project's active agents.**
§6.4 requires the page to state "the worst-case reservation at the project's current models, because that figure — not the average — is what decides whether a run is refused." A project has several agents on possibly different models. The figure shown is `max(worstCaseUsd(agent.model, per_run_token_cap))` over the project's **active** agents — the largest single reservation any one run could take. An average or a sum would both be wrong: the average understates the refusal threshold, and the sum describes a scenario (every agent running at once, each at full token cap) that the per-run check never evaluates.

**R5 — delete is confirmed by typing the slug, and the server re-checks it.**
§6.4 requires typing the project's slug. The typed value is validated **server-side** against the resolved project, not only in the browser. A confirmation that exists only in the client is a speed bump, not a control, and this is the one irreversible action in the product.

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/app/supabase/migrations/20260829000100_user_settings_locale_tz.sql` | **Create.** Adds `user_settings.locale` and `time_zone`. |
| `apps/app/lib/schemas/project.ts` | **Modify.** Gains `deleteProjectSchema`. `updateProjectSchema` already exists here and is reused unchanged. |
| `apps/app/lib/schemas/budget.ts` | **Create.** `updateBudgetSchema`. |
| `apps/app/lib/db/projects.ts` | **Modify.** Gains `updateProject`, `deleteProject`. |
| `apps/app/lib/db/budgets.ts` | **Create.** `getBudget`, `updateBudget`, `monthToDateSpend`, `worstCaseReservationUsd`. |
| `apps/app/app/api/agents/[agentId]/ask/route.ts` | **Modify.** Drops its private `loadBudget`; imports `getBudget`. |
| `apps/app/app/(workspace)/actions.ts` | **Modify.** Gains `updateProjectAction`, `updateBudgetAction`, `deleteProjectAction`. |
| `apps/app/lib/shell/destinations.ts` | **Modify.** Adds the trailing `settings` destination. |
| `apps/app/components/shell/workspace-sidebar.tsx` | **Modify.** Renders a rule before the trailing group. |
| `apps/app/app/(workspace)/projects/[slug]/settings/page.tsx` | **Create.** The settings route. |
| `apps/app/app/(workspace)/projects/[slug]/settings/project-form.tsx` | **Create.** Title, brief, status. |
| `apps/app/app/(workspace)/projects/[slug]/settings/budget-form.tsx` | **Create.** Caps, with spend shown against them. |
| `apps/app/app/(workspace)/projects/[slug]/settings/danger-zone.tsx` | **Create.** Delete, confirmed by slug. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | **Modify.** New strings, all three. |

---

## Task 1: The migration

**Files:**
- Create: `apps/app/supabase/migrations/20260829000100_user_settings_locale_tz.sql`
- Test: `apps/app/tests/rls/schema.test.ts` (extend the existing column assertions)

**Interfaces:**
- Produces: `user_settings.locale text not null default 'en'`, `user_settings.time_zone text not null default 'UTC'`.

- [ ] **Step 1: Write the migration**

```sql
-- Account preferences that currently live nowhere.
--
-- `locale` is resolved from a cookie today (packages/i18n reads NEXT_LOCALE),
-- which means a language choice does not follow a person to a new browser.
-- `time_zone` does not exist at all, so every date in the product renders in
-- whatever zone the server happens to run in — issue #14.
--
-- Both columns are INERT until slice D2 wires the account settings page to
-- them. They land here because a production migration is the riskiest step in
-- a slice and this repo lands schema ahead of the code that reads it, rather
-- than shipping two migrations for one feature.

alter table user_settings
  add column locale    text not null default 'en'
    check (locale in ('en', 'ms', 'zh')),
  add column time_zone text not null default 'UTC';

comment on column user_settings.locale is
  'Preferred UI language. Cookie remains the request-time source; this is the durable preference. Read from slice D2 onward.';

comment on column user_settings.time_zone is
  'IANA zone name, e.g. "Asia/Kuala_Lumpur". Dates render in this zone from slice D2 onward. Not constrained by CHECK: the IANA list changes, and a stale constraint would reject a legitimate new zone.';
```

- [ ] **Step 2: Apply to the local stack and confirm**

```bash
cd apps/app
corepack pnpm db:reset
```

Then confirm both columns exist with their defaults:

```bash
set -a; . ./.env.test; set +a
curl -s "$API_URL/rest/v1/user_settings?select=locale,time_zone&limit=1" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

Expected: a JSON array (empty or with rows), not a "column does not exist" error.

- [ ] **Step 3: Extend the schema test**

`apps/app/tests/rls/schema.test.ts` already asserts the shape of every table. Add `locale` and `time_zone` to its `user_settings` column expectations, following the existing idiom in that file exactly — read it first rather than inventing an assertion style.

- [ ] **Step 4: Run the RLS suite**

Run: `corepack pnpm test:rls`
Expected: PASS. The suite is at 72 tests before this change.

- [ ] **Step 5: Commit**

```bash
git add apps/app/supabase/migrations/20260829000100_user_settings_locale_tz.sql apps/app/tests/rls/schema.test.ts
git commit -m "feat(settings): add locale and time zone to user settings"
```

**Note for whoever merges:** this migration is not yet applied to production. Production application is a separate, deliberate step — see "Before merge" at the end of this plan.

---

## Task 2: Schemas for a project update, a budget update, and a deletion

**Files:**
- Modify: `apps/app/lib/schemas/project.ts`
- Create: `apps/app/lib/schemas/budget.ts`
- Create: `apps/app/tests/unit/project-schema.test.ts`, `apps/app/tests/unit/budget-schema.test.ts`

**Interfaces:**
- Consumes: `requiredText`, `projectStatuses`, `projectStatusSchema` from `@/lib/schemas/common`.
- Produces: `deleteProjectSchema`, `DeleteProjectValues`, `updateBudgetSchema`, `UpdateBudgetValues`.
- Re-uses, unchanged: the **already-existing** `updateProjectSchema` / `UpdateProjectValues`.

**Read `apps/app/lib/schemas/project.ts` before writing anything.** `updateProjectSchema` already exists there — `{ id: uuid, title?: requiredText(120), brief?: optionalText(2_000), status?: projectStatusSchema }` — and currently has no consumer and no test. **Do not redefine it.** It is already the right shape for this form: the settings page submits all four fields, and the optional markers exist so a partial update is expressible. Task 2 adds tests for it, plus the two genuinely new schemas.

Likewise `projectStatuses` (the `as const` tuple) and `projectStatusSchema` already live in `apps/app/lib/schemas/common.ts`. Import them; do not declare a second list of statuses that can drift from the column's check constraint.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/app/tests/unit/budget-schema.test.ts
import { describe, expect, it } from 'vitest';

import { updateBudgetSchema } from '@/lib/schemas/budget';

const valid = { monthly_cap_usd: 25, per_run_token_cap: 200_000 };

describe('updateBudgetSchema', () => {
  it('accepts a well-formed budget', () => {
    expect(updateBudgetSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a zero monthly cap, which stops every run', () => {
    // Zero is a legitimate setting — "no agent spending this month" — and is
    // distinct from absent. The column is not nullable precisely so that the
    // default posture cannot become "unlimited".
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 0 }).success).toBe(true);
  });

  it('rejects a negative monthly cap', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: -1 }).success).toBe(false);
  });

  it('rejects more than two decimal places, which the column cannot store', () => {
    // numeric(10,2). A third decimal would be rounded by Postgres, so the value
    // read back would differ from the value submitted, with no error anywhere.
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 1.005 }).success).toBe(false);
  });

  it('rejects a monthly cap beyond what numeric(10,2) holds', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, monthly_cap_usd: 100_000_000 }).success).toBe(
      false
    );
  });

  it('rejects a fractional token cap', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, per_run_token_cap: 1000.5 }).success).toBe(
      false
    );
  });

  it('rejects a token cap below a floor that could never complete a run', () => {
    expect(updateBudgetSchema.safeParse({ ...valid, per_run_token_cap: 100 }).success).toBe(false);
  });
});
```

```typescript
// apps/app/tests/unit/project-schema.test.ts
import { describe, expect, it } from 'vitest';

import { projectStatuses } from '@/lib/schemas/common';
import { deleteProjectSchema, updateProjectSchema } from '@/lib/schemas/project';

const id = '11111111-1111-4111-8111-111111111111';

describe('updateProjectSchema', () => {
  // The schema already existed with no test. These pin the behaviour the
  // settings form depends on before that form is written against it.
  const valid = { id, title: 'Desktop companion robot', brief: 'Sits on a desk.', status: 'active' };

  it('accepts a well-formed update', () => {
    expect(updateProjectSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty brief', () => {
    // projects.brief is nullable and optionalText trims, so empty is a
    // legitimate value rather than a missing one.
    expect(updateProjectSchema.safeParse({ ...valid, brief: '' }).success).toBe(true);
  });

  it('rejects a blank title when one is supplied', () => {
    expect(updateProjectSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
  });

  it('rejects a status outside the column’s check constraint', () => {
    expect(updateProjectSchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false);
  });

  it('accepts every status the database allows, from the shared list', () => {
    // Iterating the same tuple the column's constraint was written from means
    // this test fails if the two ever diverge.
    for (const status of projectStatuses) {
      expect(updateProjectSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it('drops a slug — a project’s slug is its identity, not a setting', () => {
    const parsed = updateProjectSchema.safeParse({ ...valid, slug: 'renamed' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'slug' in parsed.data).toBe(false);
  });

  it('requires the id, which names the row to update', () => {
    const { id: _omitted, ...withoutId } = valid;
    expect(updateProjectSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe('deleteProjectSchema', () => {
  it('requires the typed confirmation', () => {
    expect(deleteProjectSchema.safeParse({ confirmSlug: '' }).success).toBe(false);
    expect(deleteProjectSchema.safeParse({ confirmSlug: 'robot' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/budget-schema.test.ts tests/unit/project-schema.test.ts`
Expected: FAIL — the schemas do not exist.

- [ ] **Step 3: Write the schemas**

```typescript
// apps/app/lib/schemas/budget.ts
import { z } from 'zod';

/**
 * A project's spending limits.
 *
 * Both caps mirror their columns exactly, because a value this schema accepts
 * and the column cannot store is the worst kind of validation: Postgres
 * silently rounds `numeric(10,2)`, so the figure read back would differ from
 * the one submitted with nothing reporting a problem.
 *
 * The token floor is not arbitrary. A cap of a few hundred tokens cannot
 * complete any useful run, so setting one would look like a configuration
 * choice and behave like an outage.
 */
export const MIN_PER_RUN_TOKEN_CAP = 1_000;
export const MAX_PER_RUN_TOKEN_CAP = 2_000_000;

export const updateBudgetSchema = z.object({
  monthly_cap_usd: z
    .number()
    .min(0)
    // numeric(10,2): eight digits before the point, two after.
    .max(99_999_999.99)
    .refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9, {
      message: 'A cap is set to the cent.',
    }),
  per_run_token_cap: z.number().int().min(MIN_PER_RUN_TOKEN_CAP).max(MAX_PER_RUN_TOKEN_CAP),
});

export type UpdateBudgetValues = z.output<typeof updateBudgetSchema>;
```

`updateProjectSchema` is already correct — **leave it exactly as it is**. Append only the deletion schema to `apps/app/lib/schemas/project.ts`, above the existing type exports:

```typescript
/**
 * Deleting a project is the one irreversible act in the product.
 *
 * The typed slug is checked against the resolved project on the server, not
 * only in the browser — a confirmation that lives only in the client is a
 * speed bump rather than a control.
 *
 * Note what is absent: the slug is not editable anywhere in this schema file.
 * It is the project's identity — in every URL, in bookmarks, and in the
 * `unique (owner_id, slug)` constraint — so renaming it would be a migration
 * of the user's own links, and needs its own design if it is ever wanted.
 */
export const deleteProjectSchema = z.object({
  confirmSlug: requiredText(200),
});

export type DeleteProjectValues = z.output<typeof deleteProjectSchema>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/budget-schema.test.ts tests/unit/project-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/schemas/budget.ts apps/app/lib/schemas/project.ts apps/app/tests/unit/budget-schema.test.ts apps/app/tests/unit/project-schema.test.ts
git commit -m "feat(settings): schemas for project, budget, and deletion"
```

---

## Task 3: Project update and delete

**Files:**
- Modify: `apps/app/lib/db/projects.ts`
- Test: `apps/app/tests/rls/project-settings.test.ts`

**Interfaces:**
- Consumes: `UpdateProjectValues` (Task 2).
- Produces: `updateProject(supabase, { id, ownerId, values }): Promise<Project | null>`, `deleteProject(supabase, { id, ownerId }): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/rls/project-settings.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { deleteProject, getProjectBySlug, updateProject } from '@/lib/db/projects';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;
let slug: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`proj-settings-${Date.now()}@example.test`);
  slug = `robot-${Date.now()}`;

  const { data, error } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug, kind: 'build' })
    .select()
    .single();
  if (error) throw error;
  projectId = data.id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('updateProject', () => {
  it('changes title, brief and status', async () => {
    const updated = await updateProject(client(), {
      id: projectId,
      ownerId: alice!.id,
      values: { title: 'Desk robot', brief: 'Sits on a desk.', status: 'paused' },
    });
    expect(updated?.title).toBe('Desk robot');
    expect(updated?.status).toBe('paused');
  });

  it('leaves the slug alone', async () => {
    const after = await getProjectBySlug(client(), alice!.id, slug);
    expect(after?.slug).toBe(slug);
  });

  it('returns null for a project this caller does not own', async () => {
    bob = await createTestUser(`proj-bob-${Date.now()}@example.test`);
    const updated = await updateProject(bob.client as never, {
      id: projectId,
      ownerId: bob.id,
      values: { title: 'Bob was here', brief: '', status: 'active' },
    });
    expect(updated).toBeNull();

    const untouched = await getProjectBySlug(client(), alice!.id, slug);
    expect(untouched?.title).toBe('Desk robot');
  });
});

describe('deleteProject', () => {
  it('refuses a project this caller does not own, and leaves it standing', async () => {
    const removed = await deleteProject(bob!.client as never, {
      id: projectId,
      ownerId: bob!.id,
    });
    expect(removed).toBe(false);
    expect(await getProjectBySlug(client(), alice!.id, slug)).not.toBeNull();
  });

  it('deletes the owner’s own project and cascades to its rows', async () => {
    // Seed one child row per cascading table, so the assertion is that the
    // cascade actually fired rather than that the project row vanished.
    const { data: entry } = await alice!.client
      .from('entries')
      .insert({ project_id: projectId, owner_id: alice!.id, kind: 'note', body: 'x' })
      .select()
      .single();
    const { data: doc } = await alice!.client
      .from('documents')
      .insert({ project_id: projectId, owner_id: alice!.id, title: 'D', body: 'x' })
      .select()
      .single();

    expect(await deleteProject(client(), { id: projectId, ownerId: alice!.id })).toBe(true);
    expect(await getProjectBySlug(client(), alice!.id, slug)).toBeNull();

    const { data: entriesLeft } = await alice!.client
      .from('entries')
      .select('id')
      .eq('id', entry!.id);
    const { data: docsLeft } = await alice!.client.from('documents').select('id').eq('id', doc!.id);
    expect(entriesLeft).toEqual([]);
    expect(docsLeft).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `corepack pnpm test:rls`
Expected: FAIL — `updateProject` is not exported.

- [ ] **Step 3: Implement**

Append to `apps/app/lib/db/projects.ts`, following the `PROJECT_COLUMNS` / cast idiom already in the file:

```typescript
/**
 * Update a project's own fields.
 *
 * Filtered on `owner_id` as well as `id`. RLS already refuses another owner's
 * row, but stating ownership here means the function returns null rather than
 * relying on a policy to raise — and null is what lets the caller tell
 * "refused" from "changed" instead of reporting a silent no-op as success.
 */
export async function updateProject(
  supabase: Client,
  { id, ownerId, values }: { id: string; ownerId: string; values: UpdateProjectValues }
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Project | null;
}

/**
 * Delete a project and everything that hangs off it.
 *
 * Every child table declares `on delete cascade` against `projects(id)`, so
 * this one statement removes entries, work items, documents and their
 * revisions, attachments, agents, runs, tool calls, proposals, and usage rows.
 * That breadth is the reason the caller must confirm by typing the slug.
 *
 * Returns whether a row was actually removed, so a refusal is distinguishable
 * from a success. `select()` after `delete()` returns the deleted rows, which
 * is how we know.
 */
export async function deleteProject(
  supabase: Client,
  { id, ownerId }: { id: string; ownerId: string }
): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('id');

  if (error) throw error;
  return (data ?? []).length > 0;
}
```

Add `import type { UpdateProjectValues } from '@/lib/schemas/project';` to the file's imports.

- [ ] **Step 4: Run to verify it passes**

Run: `corepack pnpm test:rls`
Expected: PASS — the new file contributes 5 tests, and all pre-existing RLS tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/db/projects.ts apps/app/tests/rls/project-settings.test.ts
git commit -m "feat(settings): update and delete a project, owner-scoped and cascade-tested"
```

---

## Task 4: Budget reads, and moving them out of the ask route

**Files:**
- Create: `apps/app/lib/db/budgets.ts`
- Modify: `apps/app/app/api/agents/[agentId]/ask/route.ts`
- Test: `apps/app/tests/rls/budgets.test.ts`, `apps/app/tests/unit/budget-reservation.test.ts`

**Interfaces:**
- Consumes: `UpdateBudgetValues` (Task 2), `worstCaseUsd` from `@/lib/agents/cost`.
- Produces: `type Budget = { monthly_cap_usd: number; per_run_token_cap: number }`, `getBudget(supabase, projectId, ownerId): Promise<Budget>`, `updateBudget(supabase, { projectId, ownerId, values }): Promise<Budget | null>`, `monthToDateSpend(supabase, projectId): Promise<number>`, `worstCaseReservationUsd(models: string[], perRunTokenCap: number): number`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/app/tests/unit/budget-reservation.test.ts
import { describe, expect, it } from 'vitest';

import { worstCaseReservationUsd } from '@/lib/db/budgets';
import { worstCaseUsd } from '@/lib/agents/cost';

describe('worstCaseReservationUsd', () => {
  it('reports the largest single reservation, not the average or the sum', () => {
    // §6.4: "the worst-case reservation at the project's current models,
    // because that figure — not the average — is what decides whether a run is
    // refused." The per-run check evaluates one run at a time, so the sum
    // describes a scenario it never asks about.
    const models = ['openai/gpt-4o-mini', 'anthropic/claude-opus-5'];
    const cap = 200_000;
    const expected = Math.max(...models.map((m) => worstCaseUsd(m, cap)));

    expect(worstCaseReservationUsd(models, cap)).toBeCloseTo(expected, 9);
    expect(worstCaseReservationUsd(models, cap)).toBeGreaterThan(
      worstCaseUsd('openai/gpt-4o-mini', cap)
    );
  });

  it('reports zero when a project has no agents', () => {
    expect(worstCaseReservationUsd([], 200_000)).toBe(0);
  });

  it('ignores a model with no rate rather than treating it as free', () => {
    // worstCaseUsd returns 0 for an unpriced model. Letting that 0 win a
    // max() is harmless; letting it be the only value would understate the
    // figure, so a project with one unpriced model reports 0 and the reader
    // sees a figure that is obviously wrong rather than plausibly wrong.
    expect(worstCaseReservationUsd(['acme/unpriced'], 200_000)).toBe(0);
  });
});
```

```typescript
// apps/app/tests/rls/budgets.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { getBudget, monthToDateSpend, updateBudget } from '@/lib/db/budgets';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let projectId: string;

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`budgets-${Date.now()}@example.test`);

  const { data: project } = await alice.client
    .from('projects')
    .insert({ owner_id: alice.id, title: 'Robot', slug: `b-${Date.now()}`, kind: 'build' })
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

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: projectId,
      owner_id: alice.id,
      agent_id: agent!.id,
      trigger: 'conversation',
      status: 'succeeded',
    })
    .select()
    .single();

  await alice.client.from('ai_usage').insert([
    {
      project_id: projectId,
      owner_id: alice.id,
      run_id: run!.id,
      model: 'openai/gpt-4o-mini',
      cost_usd: 1.25,
    },
    {
      project_id: projectId,
      owner_id: alice.id,
      run_id: run!.id,
      model: 'openai/gpt-4o-mini',
      cost_usd: 0.75,
    },
    // Last month: outside the window the cap uses, so it must not be counted.
    {
      project_id: projectId,
      owner_id: alice.id,
      run_id: run!.id,
      model: 'openai/gpt-4o-mini',
      cost_usd: 99,
      created_at: '2020-01-15T00:00:00Z',
    },
  ]);
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('getBudget', () => {
  it('creates the row with its defaults on first read', async () => {
    const budget = await getBudget(client(), projectId, alice!.id);
    expect(budget.monthly_cap_usd).toBe(10);
    expect(budget.per_run_token_cap).toBe(200_000);
  });

  it('is idempotent — a second read does not duplicate the row', async () => {
    await getBudget(client(), projectId, alice!.id);
    const { data } = await alice!.client
      .from('project_budgets')
      .select('project_id')
      .eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });
});

describe('updateBudget', () => {
  it('changes both caps', async () => {
    const updated = await updateBudget(client(), {
      projectId,
      ownerId: alice!.id,
      values: { monthly_cap_usd: 42.5, per_run_token_cap: 150_000 },
    });
    expect(updated?.monthly_cap_usd).toBe(42.5);
    expect(updated?.per_run_token_cap).toBe(150_000);
  });

  it('refuses another owner', async () => {
    bob = await createTestUser(`budgets-bob-${Date.now()}@example.test`);
    const updated = await updateBudget(bob.client as never, {
      projectId,
      ownerId: bob.id,
      values: { monthly_cap_usd: 0, per_run_token_cap: 1_000 },
    });
    expect(updated).toBeNull();

    const untouched = await getBudget(client(), projectId, alice!.id);
    expect(untouched.monthly_cap_usd).toBe(42.5);
  });
});

describe('monthToDateSpend', () => {
  it('sums this calendar month and excludes earlier months', async () => {
    // The window must match start_agent_run's exactly, or the page shows a
    // number that disagrees with what refuses a run.
    expect(await monthToDateSpend(client(), projectId)).toBeCloseTo(2.0, 6);
  });

  it('reports zero for another owner, who can see none of it', async () => {
    expect(await monthToDateSpend(bob!.client as never, projectId)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/budget-reservation.test.ts` then `corepack pnpm test:rls`
Expected: FAIL — `@/lib/db/budgets` does not exist.

- [ ] **Step 3: Implement**

```typescript
// apps/app/lib/db/budgets.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type { UpdateBudgetValues } from '@/lib/schemas/budget';
import { worstCaseUsd } from '@/lib/agents/cost';

type Client = SupabaseClient<Database>;

export interface Budget {
  monthly_cap_usd: number;
  per_run_token_cap: number;
}

const DEFAULTS: Budget = { monthly_cap_usd: 10, per_run_token_cap: 200_000 };

/**
 * A project's budget, creating it with the column defaults on first read.
 *
 * This function was a private copy inside the agent ask route. It lives here so
 * the settings page and the executor read the same definition of a cap — two
 * copies would be two definitions, and the one that drifts would be the one
 * nobody is looking at.
 */
export async function getBudget(
  supabase: Client,
  projectId: string,
  ownerId: string
): Promise<Budget> {
  const { data, error } = await supabase
    .from('project_budgets')
    .select('monthly_cap_usd, per_run_token_cap')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    // numeric comes back from PostgREST as a string.
    return {
      monthly_cap_usd: Number(data.monthly_cap_usd),
      per_run_token_cap: data.per_run_token_cap,
    };
  }

  // Ignore a conflict: two concurrent first reads both find nothing, and the
  // loser of the insert race still wants the defaults rather than an error.
  await supabase.from('project_budgets').insert({ project_id: projectId, owner_id: ownerId });
  return { ...DEFAULTS };
}

export async function updateBudget(
  supabase: Client,
  {
    projectId,
    ownerId,
    values,
  }: { projectId: string; ownerId: string; values: UpdateBudgetValues }
): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('project_budgets')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('owner_id', ownerId)
    .select('monthly_cap_usd, per_run_token_cap')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    monthly_cap_usd: Number(data.monthly_cap_usd),
    per_run_token_cap: data.per_run_token_cap,
  };
}

/**
 * What this project's agents have cost since the start of the UTC month.
 *
 * The window is copied deliberately from `start_agent_run`, which sums
 * `ai_usage` where `created_at >= date_trunc('month', now() at time zone 'utc')
 * at time zone 'utc'`. Computing it any other way here would put a number on
 * the settings page that disagrees with the number that refuses a run — and
 * the page would be the one people believe.
 */
export async function monthToDateSpend(supabase: Client, projectId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { data, error } = await supabase
    .from('ai_usage')
    .select('cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', monthStart);

  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + Number(row.cost_usd), 0);
}

/**
 * The largest reservation a single run could take, across a project's models.
 *
 * The maximum, not the average and not the sum. §6.4 asks for the figure that
 * decides whether a run is refused, and the cap check evaluates one run at a
 * time: the average understates the threshold, and the sum describes every
 * agent running at once at full token cap, which nothing ever checks.
 */
export function worstCaseReservationUsd(models: string[], perRunTokenCap: number): number {
  if (models.length === 0) return 0;
  return Math.max(...models.map((model) => worstCaseUsd(model, perRunTokenCap)));
}
```

- [ ] **Step 4: Remove the private copy from the ask route**

In `apps/app/app/api/agents/[agentId]/ask/route.ts`, delete the local `loadBudget` function and import `getBudget` from `@/lib/db/budgets` instead, updating the call site. The local `Budget` type, if declared there, is replaced by the exported one. **Leave every other line of that route alone** — it is the executor path and is out of scope for this slice.

- [ ] **Step 5: Run everything**

```bash
corepack pnpm typecheck && corepack pnpm test && corepack pnpm test:rls
```
Expected: PASS. Confirm no file still declares its own `loadBudget`:

```bash
grep -rn "loadBudget" apps/app --include=*.ts | grep -v node_modules
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/db/budgets.ts "apps/app/app/api/agents/[agentId]/ask/route.ts" apps/app/tests/rls/budgets.test.ts apps/app/tests/unit/budget-reservation.test.ts
git commit -m "feat(settings): budget reads in lib/db, shared with the executor"
```

---

## Task 5: Actions, destination, and strings

**Files:**
- Modify: `apps/app/app/(workspace)/actions.ts`
- Modify: `apps/app/lib/shell/destinations.ts`
- Modify: the sidebar component that renders destinations
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`
- Test: `apps/app/tests/unit/shell-destinations.test.ts` (extend)

**Interfaces:**
- Produces: `updateProjectAction(slug, input)`, `updateBudgetAction(slug, input)`, `deleteProjectAction(slug, input)`; a destination `{ key: 'settings', trailing: true }`.

- [ ] **Step 1: Write the failing test**

Add to `apps/app/tests/unit/shell-destinations.test.ts`:

```typescript
describe('the settings destination', () => {
  it('comes last, after the sections', () => {
    const keys = destinationsFor('robot', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual([
      'resume',
      'work',
      'log',
      'inbox',
      'documents',
      'agents',
      'settings',
    ]);
  });

  it('is marked trailing, so the sidebar can rule it off from the sections', () => {
    // The spec's sidebar sketch puts a rule above Settings: it is project
    // scope, not a section of the record. The flag carries that rather than
    // the sidebar hardcoding a key name.
    const all = destinationsFor('robot', { inbox: 0 });
    expect(all.filter((d) => d.trailing).map((d) => d.key)).toEqual(['settings']);
  });

  it('is active on the settings route', () => {
    const settings = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'settings')!;
    expect(isActive('/projects/robot/settings/', settings)).toBe(true);
    expect(isActive('/projects/robot/documents/', settings)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the destination**

In `apps/app/lib/shell/destinations.ts`, add `trailing?: true` to the `Destination` interface with a comment explaining it marks project-scope entries that sit below the rule, and append to the array returned by `destinationsFor`:

```typescript
    {
      key: 'settings',
      href: `${base}/settings`,
      labelKey: 'app.settings.title',
      exact: false,
      trailing: true,
    },
```

Then, in `apps/app/components/shell/workspace-sidebar.tsx`, which maps over destinations, render a hairline rule before the first destination whose `trailing` is true — `border-t border-rule` on that item, or a separator element, whichever matches the component's existing structure. Read the component before choosing; do not restructure it.

- [ ] **Step 4: Add the actions**

Add to `apps/app/app/(workspace)/actions.ts`, following the shape of the existing `updateDocumentAction`:

```typescript
export async function updateProjectAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ slug: string }>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    // The schema carries an id, but the row updated is the one the *slug*
    // resolved to. Trusting the client's id here would let a caller aim an
    // update at another of their own projects through this page's URL.
    const updated = await updateProject(supabase, {
      id: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    if (!updated) return fail('app.errors.projectMissing');

    revalidatePath(`/projects/${slug}/settings`);
    revalidateProject(slug);
    return ok({ slug: updated.slug });
  } catch {
    return fail('app.errors.generic');
  }
}

export async function updateBudgetAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ monthlyCapUsd: number }>> {
  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const updated = await updateBudget(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });
    if (!updated) return fail('app.errors.projectMissing');

    revalidatePath(`/projects/${slug}/settings`);
    return ok({ monthlyCapUsd: updated.monthly_cap_usd });
  } catch {
    return fail('app.errors.generic');
  }
}

/**
 * Delete a project, after checking the typed slug on the server.
 *
 * The browser also checks it, to disable the button — but that check is a
 * convenience. This one is the control, because it is the only one an attacker
 * or a mis-wired client cannot skip.
 */
export async function deleteProjectAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ deleted: true }>> {
  const parsed = deleteProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, project } = await resolveProject(slug);
  if (!project) return fail('app.errors.projectMissing');

  if (parsed.data.confirmSlug !== project.slug) {
    return fail('app.settings.deleteMismatch');
  }

  try {
    const removed = await deleteProject(supabase, { id: project.id, ownerId: userId });
    if (!removed) return fail('app.errors.projectMissing');

    revalidatePath('/', 'layout');
    return ok({ deleted: true });
  } catch {
    return fail('app.errors.generic');
  }
}
```

Add the needed imports: `updateProject`, `deleteProject` from `@/lib/db/projects`; `updateBudget` from `@/lib/db/budgets`; `updateProjectSchema`, `deleteProjectSchema` from `@/lib/schemas/project`; `updateBudgetSchema` from `@/lib/schemas/budget`; and `revalidatePath` if not already imported.

- [ ] **Step 5: Add the strings to all three locales**

Add an `app.settings` block. `en`:

```json
"settings": {
  "title": "Settings",
  "project": "Project",
  "titleLabel": "Title",
  "briefLabel": "Brief",
  "statusLabel": "Status",
  "status": {
    "active": "Active",
    "paused": "Paused",
    "done": "Done",
    "abandoned": "Abandoned"
  },
  "save": "Save",
  "saving": "Saving",
  "saved": "Saved",
  "spend": "Agent spend",
  "spentThisMonth": "Spent this month",
  "monthlyCap": "Monthly cap",
  "perRunTokenCap": "Per-run token cap",
  "worstCase": "Worst case per run, at this project's models",
  "worstCaseNote": "This figure, not the average, is what decides whether a run is refused.",
  "dangerZone": "Danger zone",
  "deleteExplain": "Deleting this project removes every entry, work item, document, revision, attachment, agent, run, and proposal in it. This cannot be undone.",
  "deleteConfirmLabel": "Type the project's slug to confirm",
  "delete": "Delete this project",
  "deleting": "Deleting",
  "deleteMismatch": "That is not this project's slug."
}
```

`ms`:

```json
"settings": {
  "title": "Tetapan",
  "project": "Projek",
  "titleLabel": "Tajuk",
  "briefLabel": "Ringkasan",
  "statusLabel": "Status",
  "status": {
    "active": "Aktif",
    "paused": "Dijeda",
    "done": "Selesai",
    "abandoned": "Ditinggalkan"
  },
  "save": "Simpan",
  "saving": "Menyimpan",
  "saved": "Disimpan",
  "spend": "Perbelanjaan ejen",
  "spentThisMonth": "Dibelanjakan bulan ini",
  "monthlyCap": "Had bulanan",
  "perRunTokenCap": "Had token setiap larian",
  "worstCase": "Kes terburuk setiap larian, pada model projek ini",
  "worstCaseNote": "Angka ini, bukan purata, yang menentukan sama ada sesuatu larian ditolak.",
  "dangerZone": "Zon bahaya",
  "deleteExplain": "Memadam projek ini akan membuang setiap catatan, item kerja, dokumen, semakan, lampiran, ejen, larian, dan cadangan di dalamnya. Ini tidak boleh dibatalkan.",
  "deleteConfirmLabel": "Taip slug projek untuk mengesahkan",
  "delete": "Padam projek ini",
  "deleting": "Memadam",
  "deleteMismatch": "Itu bukan slug projek ini."
}
```

`zh`:

```json
"settings": {
  "title": "设置",
  "project": "项目",
  "titleLabel": "标题",
  "briefLabel": "简介",
  "statusLabel": "状态",
  "status": {
    "active": "进行中",
    "paused": "已暂停",
    "done": "已完成",
    "abandoned": "已放弃"
  },
  "save": "保存",
  "saving": "保存中",
  "saved": "已保存",
  "spend": "代理支出",
  "spentThisMonth": "本月已用",
  "monthlyCap": "每月上限",
  "perRunTokenCap": "单次运行令牌上限",
  "worstCase": "按本项目模型计算的单次运行最坏情况",
  "worstCaseNote": "决定运行是否被拒绝的是这个数字，而不是平均值。",
  "dangerZone": "危险区域",
  "deleteExplain": "删除此项目将移除其中的每一条记录、工作项、文档、修订、附件、代理、运行和提议。此操作无法撤销。",
  "deleteConfirmLabel": "输入项目 slug 以确认",
  "delete": "删除此项目",
  "deleting": "删除中",
  "deleteMismatch": "这不是本项目的 slug。"
}
```

- [ ] **Step 6: Verify**

```bash
corepack pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts
corepack pnpm --filter @goalspace/i18n test
corepack pnpm typecheck
```
Expected: all pass, including locale parity.

- [ ] **Step 7: Commit**

```bash
git add "apps/app/app/(workspace)/actions.ts" apps/app/lib/shell/destinations.ts apps/app/components/shell apps/app/tests/unit/shell-destinations.test.ts packages/i18n/src/locales
git commit -m "feat(settings): actions, the settings destination, and strings in three locales"
```

---

## Task 6: The settings page and the project form

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/settings/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/settings/project-form.tsx`

**Interfaces:**
- Consumes: `getProjectBySlug`, `getBudget`, `monthToDateSpend`, `worstCaseReservationUsd`, `listAgents`, `updateProjectAction`, `projectStatuses` (from `@/lib/schemas/common`).

- [ ] **Step 1: Write the project form**

A client component with title, brief and status, following `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/agent-editor.tsx` for the `useTransition` / `ActionResult` / field-error pattern — **read it first**, including how it renders `result.fieldErrors` beside each control with `aria-invalid` and `aria-describedby`, and copy that rather than inventing one. Status is a `<select>` over `projectStatuses` from `@/lib/schemas/common` — the same tuple the column's check constraint was written from — each option labelled from `app.settings.status.*`. Errors use `text-oxide` with `role="alert"`.

- [ ] **Step 2: Write the page**

The page resolves the project, then reads in parallel: `getBudget`, `monthToDateSpend`, and `listAgents` (for the models the worst-case figure needs). It renders three sections separated by hairline rules — project, spend, danger zone — with the project form and the budget form as client components and the spend figures as server-rendered text.

The spend section states, in this order: spent this month, the monthly cap, and the worst-case reservation with its explanatory note from `app.settings.worstCaseNote`. Money renders with `tabular-nums` and two decimals; the worst-case figure needs four, because at small token caps it is fractions of a cent.

Pass `worstCaseReservationUsd(agents.filter((a) => a.is_active).map((a) => a.model), budget.per_run_token_cap)` — **active agents only**, because an inactive agent cannot start a run and so cannot reserve anything.

- [ ] **Step 3: Verify**

```bash
corepack pnpm typecheck
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```
Expected: pass, with `/projects/[slug]/settings` in the route list.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/settings"
git commit -m "feat(settings): the project settings page, with spend against the cap"
```

---

## Task 7: The budget form

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/settings/budget-form.tsx`

- [ ] **Step 1: Write the form**

Both caps editable, submitted through `updateBudgetAction`. Number inputs carry `min`, `max` and `step` matching the schema — `step="0.01"` for the monthly cap, `step="1"` with `min={MIN_PER_RUN_TOKEN_CAP}` and `max={MAX_PER_RUN_TOKEN_CAP}` for the token cap — so the browser refuses obviously invalid values before a round trip, and the schema still refuses them if it does not. Field errors render beside their control, same pattern as Task 6.

Setting the monthly cap to `0` is legitimate and means "no agent spending this month". Do not treat it as empty or coerce it away.

- [ ] **Step 2: Verify**

```bash
corepack pnpm typecheck && corepack pnpm test
```

- [ ] **Step 3: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/settings/budget-form.tsx"
git commit -m "feat(settings): editable spend caps"
```

---

## Task 8: The danger zone

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/settings/danger-zone.tsx`

- [ ] **Step 1: Write the component**

The one irreversible act in the product. It states plainly what will be removed (`app.settings.deleteExplain` enumerates the cascading tables), then requires the project's slug typed into a labelled input. The delete button is disabled until the typed value matches — and the server checks it again regardless, because the client check is a convenience and the server check is the control.

Use `oxide-deep` for the destructive button. **There is no `danger` token**; `text-danger` or `bg-danger` would compile to nothing and render an unstyled button on the most dangerous control in the product.

On success, `router.push('/')` — the project no longer exists, so staying on its settings page would render a 404 the person did not ask for.

Do **not** use a browser `confirm()` dialog. Beyond the design system, a native modal blocks the page and is not what the spec asks for: it asks for the slug to be typed.

- [ ] **Step 2: Verify**

```bash
corepack pnpm typecheck && corepack pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/settings/danger-zone.tsx"
git commit -m "feat(settings): delete a project, confirmed by typing its slug"
```

---

## Task 9: Browser pass

Not optional. `apps/app` runs vitest in `node` with no DOM, so **nothing in the test suite can observe layout or rendering**. Every slice so far has shipped defects the suite passed over — an active-state bug, a mobile sheet ignoring its own state, a horizontal scrollbar on every route, a control rendered off-screen at 375px, and raw translation keys on three routes. Assume this slice has its own.

- [ ] **Step 1: Seed and run against the local stack**

The dev server's `.env.local` points at **production**. Point it at the local stack instead:

```bash
cd apps/app
set -a; . ./.env.test; set +a
NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" corepack pnpm dev
```

Seed a project with several agents on different models, and some `ai_usage` rows in the current month.

- [ ] **Step 2: Walk the route at 1440px and 390px, in `en` and `ms`**

Measure rather than eyeball. Specifically:
- `document.documentElement.scrollWidth - clientWidth` is 0 at both widths, in both locales.
- **No raw `app.*` keys appear in the server HTML.** Fetch the route and regex the response body — do not scan a `document.write`'d iframe, which silently returns empty text and missed exactly this defect last slice.
- The sidebar shows Settings below a rule, marks it active on this route, and does not mark it active on any other.
- Field errors render visibly in `oxide` and carry `role="alert"` — check they are *visible*, not merely present.
- The delete button is disabled until the slug matches, and the danger zone's button is actually styled.

- [ ] **Step 3: Exercise the destructive path deliberately**

On a throwaway seeded project: type a wrong slug (button stays disabled), then the right one, and confirm the project is gone, the redirect lands on `/`, and the sidebar no longer lists it. Then confirm in the database that a child row from at least two cascading tables is gone too.

- [ ] **Step 4: Fix what you find, then re-verify**

Each fix gets its own commit, with the measurement in the message rather than a description of the symptom.

---

## Done when

1. `user_settings` carries `locale` and `time_zone`, asserted by the schema test.
2. A project's title, brief and status are editable through the pre-existing `updateProjectSchema`, which gains its first tests and its first consumer; the slug is not editable.
3. Month-to-date spend is shown against the monthly cap, computed over the same UTC-month window `start_agent_run` uses.
4. The worst-case per-run reservation is shown as the maximum across the project's **active** agents' models, with the note explaining why that figure and not the average.
5. Both caps are editable, and a zero monthly cap is accepted.
6. A project can be deleted after typing its slug, checked on the server, and the cascade is proven by test.
7. The budget helpers exist in exactly one place; `grep -rn "loadBudget" apps/app` returns nothing.
8. Settings appears in the sidebar below a rule, and is active only on its own route.
9. All three locales carry identical key sets.
10. Zero horizontal overflow at 390px and 1440px in `en` and `ms`, measured.
11. `corepack pnpm typecheck`, `test`, `test:rls`, and `build` all pass.

## Before merge

**The migration is not applied to production by this plan.** Applying it is a separate, deliberate step taken with the owner present, following the procedure this repo has used four times: read the SQL, apply via the Supabase MCP, correct the recorded migration version (the tool stamps its own timestamp), verify the catalogs, and check `get_advisors(security)` for new lint. Both columns are additive with defaults, so production code that predates them is unaffected — but that is a reason it is safe to apply early, not a reason to apply it unattended.

## Deliberately not in this slice

- **Account settings** (`/settings`: theme, language, time zone, email notifications) and **wiring the time zone through the twelve date call sites** — slice D2. `user_settings.locale` and `time_zone` are inert until then.
- **Making `user_settings.theme` the source of truth for theme.** Today `next-themes` owns theme in localStorage and nothing writes that column. D2 changes that, and it touches first-paint behaviour, which is why it is not bolted onto a slice containing a delete flow.
- **Renaming a project's slug.** It is the project's identity, in every URL and in a unique constraint; making it editable needs its own design.

# Project Intake — Slice 2c-3: Record and Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a partly-failed apply visible instead of silent, prove the intake's isolation under RLS, and correct the documentation that still describes a deleted product.

**Architecture:** No new surfaces. One behavioural change (the wizard stops navigating away from a failure it never told the owner about), two RLS tests, and three documentation corrections.

**Tech Stack:** TypeScript · Vitest 4 · Supabase Postgres · i18next

**Spec:** [docs/superpowers/specs/2026-09-02-project-intake-design.md](../specs/2026-09-02-project-intake-design.md) — §8.3, §9.5, §12
**Builds on:** [slice 2c-1](2026-09-02-intake-slice-2c1-agents.md) and [slice 2c-2](2026-09-02-intake-slice-2c2-wizard.md), both merged to `main`.

## Global Constraints

- **Question work items already ship.** Spec §13 lists them under this slice; they landed in 2c-2 and are verified live. Nothing to do.
- **Node ≥22** — `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` before `pnpm test:rls`.
- **Working directory is `apps/app`** unless stated otherwise.
- **Locale keys in `en`, `ms` and `zh`**, as always.

---

### Task 1: Name a partly-failed apply

Spec §8.3: "if item seven of nine fails validation, the six that applied stay applied, the failure is named, and the remaining two are left pending so they appear in the inbox." The first and third hold today. The second does not: `applyIntakeAction` counts `failed` and returns it, and the wizard navigates away without reading it. The owner is told nothing.

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/intake/intake-wizard.tsx`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`
- Test: `apps/app/tests/unit/intake-outcome.test.ts`
- Create: `apps/app/lib/intake/outcome.ts`

**Interfaces:**
- Produces: `describeApplyOutcome({ applied, questions, failed })` → `{ key: string; count: number } | null`. Null means everything landed and the wizard should navigate.

The decision is pure, so it is tested directly rather than through the component.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/intake-outcome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { describeApplyOutcome } from '@/lib/intake/outcome';

describe('describeApplyOutcome', () => {
  it('says nothing when everything landed', () => {
    // Silence is the success signal: the owner arrives at a populated resume
    // view, which is the confirmation. A banner saying "4 items created" would
    // be the progress celebration PRODUCT.md excludes.
    expect(describeApplyOutcome({ applied: 4, questions: 2, failed: 0 })).toBeNull();
  });

  it('says nothing when the owner accepted nothing at all', () => {
    // Rejecting every proposal is a legitimate outcome, not a failure.
    expect(describeApplyOutcome({ applied: 0, questions: 0, failed: 0 })).toBeNull();
  });

  it('names a partial failure and how many were lost', () => {
    // Six applied, one refused: the six stay, and the owner is told about the
    // one rather than discovering later that the list was shorter than the
    // one they ticked.
    expect(describeApplyOutcome({ applied: 6, questions: 0, failed: 1 })).toEqual({
      key: 'app.intake.partialFailure',
      count: 1,
    });
  });

  it('names a total failure with the same key', () => {
    // Nothing applied and everything refused is the same message with a
    // different count. A separate string would be two sentences to translate
    // for one situation.
    expect(describeApplyOutcome({ applied: 0, questions: 0, failed: 3 })).toEqual({
      key: 'app.intake.partialFailure',
      count: 3,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/intake-outcome.test.ts`
Expected: FAIL — cannot resolve `@/lib/intake/outcome`.

- [ ] **Step 3: Write the module**

Create `apps/app/lib/intake/outcome.ts`:

```ts
export interface ApplyCounts {
  applied: number;
  questions: number;
  failed: number;
}

/**
 * What to tell the owner after applying, or nothing.
 *
 * Nothing is the common case and the right default. They arrive at a resume
 * view holding the items they ticked, which is the confirmation; announcing a
 * count on top of it would be the progress celebration PRODUCT.md excludes.
 *
 * A failure is different. `applyIntakeAction` keeps whatever applied and
 * leaves the rest pending, so a silent partial failure means the owner walks
 * away believing they created nine items when they created six — and finds
 * the other three in an inbox they have no reason to open.
 */
export function describeApplyOutcome(counts: ApplyCounts): { key: string; count: number } | null {
  if (counts.failed === 0) return null;
  return { key: 'app.intake.partialFailure', count: counts.failed };
}
```

- [ ] **Step 4: Use it in the wizard**

In `intake-wizard.tsx`, import it and change the tail of `apply()` so a failure holds the screen instead of navigating:

```ts
import { describeApplyOutcome } from '@/lib/intake/outcome';
```

```ts
    if (!result.ok) {
      setError(describe(result.message));
      setBusy(false);
      return;
    }

    // A failure holds the screen. Navigating away from it would leave the
    // owner believing every item they ticked was created.
    const outcome = describeApplyOutcome(result.data);
    if (outcome) {
      setError(t(outcome.key, { count: outcome.count }));
      setBusy(false);
      return;
    }

    router.push(`/projects/${slug}`);
    router.refresh();
```

- [ ] **Step 5: Add the locale keys**

`en.json`, under `app.intake`:

```json
"partialFailure_one": "{{count}} item could not be created and is waiting in the inbox. Everything else was created.",
"partialFailure_other": "{{count}} items could not be created and are waiting in the inbox. Everything else was created."
```

Translate into `ms.json` and `zh.json`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test` and `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/intake/outcome.ts apps/app/tests/unit/intake-outcome.test.ts \
        "apps/app/app/(workspace)/projects/[slug]/intake/intake-wizard.tsx" \
        packages/i18n/src/locales/
git commit -m "feat(intake): name a partly-failed apply instead of navigating past it"
```

---

### Task 2: RLS tests for the intake

Spec §12. The composite foreign key on `proposals` is the guard the design leans on in §6.2, and nothing tests it.

**Files:**
- Create: `apps/app/tests/rls/intake-isolation.test.ts`

- [ ] **Step 1: Write the test**

Create `apps/app/tests/rls/intake-isolation.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProject: string;
let aliceAgent: string;
let aliceRun: string;
let bobProject: string;

beforeAll(async () => {
  alice = await createTestUser(`intake-a-${Date.now()}@example.test`);
  bob = await createTestUser(`intake-b-${Date.now()}@example.test`);

  const mk = async (user: TestUser, slug: string) => {
    const { data } = await user.client
      .from('projects')
      .insert({ owner_id: user.id, title: 'Intake', slug, kind: 'build' })
      .select()
      .single();
    return data!.id as string;
  };

  aliceProject = await mk(alice, `intake-a-${Date.now()}`);
  bobProject = await mk(bob, `intake-b-${Date.now()}`);

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      slug: 'planner',
      name: 'Planner',
      system_prompt: 'Propose.',
      model: 'openai/gpt-4o-mini',
    })
    .select()
    .single();
  aliceAgent = agent!.id;

  const { data: run } = await alice.client
    .from('agent_runs')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      agent_id: aliceAgent,
      trigger: 'intake',
      status: 'succeeded',
    })
    .select()
    .single();
  aliceRun = run!.id;

  // The intake note, written by the owner rather than the agent.
  await alice.client.from('entries').insert({
    project_id: aliceProject,
    owner_id: alice.id,
    agent_id: null,
    kind: 'note',
    title: 'Intake',
    body: 'What are you building?\nA lathe restoration.',
  });

  await alice.client.from('proposals').insert({
    project_id: aliceProject,
    owner_id: alice.id,
    agent_id: aliceAgent,
    run_id: aliceRun,
    kind: 'work_item',
    payload: { title: 'Strip the bed ways', kind: 'task' },
    rationale: 'From the answers.',
    citations: [],
  });
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('intake isolation', () => {
  it('hides the intake note from another user', async () => {
    const { data } = await bob!.client.from('entries').select('id').eq('project_id', aliceProject);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides the intake proposals from another user', async () => {
    const { data } = await bob!.client
      .from('proposals')
      .select('id')
      .eq('project_id', aliceProject);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses a proposal attributed to another project’s agent', async () => {
    // The guard §6.2 leans on. Bob owns his project, so RLS alone would allow
    // this insert — it is the composite foreign key on (agent_id, project_id)
    // that refuses it. Without that, an owner of two projects could file a
    // proposal in one and attribute it to an agent in the other.
    const { error } = await bob!.client.from('proposals').insert({
      project_id: bobProject,
      owner_id: bob!.id,
      agent_id: aliceAgent,
      run_id: aliceRun,
      kind: 'work_item',
      payload: { title: 'Forged', kind: 'task' },
      rationale: 'Should not land.',
      citations: [],
    });

    expect(error).not.toBeNull();
  });

  it('refuses an intake run against a project the caller does not own', async () => {
    const { error } = await bob!.client.from('agent_runs').insert({
      project_id: aliceProject,
      owner_id: bob!.id,
      agent_id: aliceAgent,
      trigger: 'intake',
      status: 'running',
    });

    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test:rls -- -t "intake isolation"`
Expected: PASS, all four. These document existing guarantees rather than driving new code — if one fails, the guarantee is missing and that is the finding.

- [ ] **Step 3: Commit**

```bash
git add apps/app/tests/rls/intake-isolation.test.ts
git commit -m "test(intake): prove isolation and the composite provenance key"
```

---

### Task 3: Correct the documentation

Spec §9.5.

**Files:**
- Modify: `docs/usage-tracking.md`, `docs/ROADMAP.md`, `CLAUDE.md`

- [ ] **Step 1: Delete the deleted product's analytics events**

In `docs/usage-tracking.md`, remove the whole `### Goal Setting Events` block (lines 45–51): `goal_form_submitted`, `goal_analysis_started`, `questions_generated`, `goal_analysis_with_answers`, `spaces_generated`. None fires anywhere; they describe the flow removed in `8b7245a`. Replace with an `### Intake Events` note stating that the intake currently emits none, so the section is not silently reintroduced as aspiration.

- [ ] **Step 2: Add phase 2c to the roadmap**

In `docs/ROADMAP.md`, after the "Still unbuilt, in dependency order" paragraph in the Phase 2 section, add a paragraph recording that 2c shipped the intake, and update the phase's status line.

- [ ] **Step 3: Add the new directories to CLAUDE.md**

In the `apps/app` code-layout table, add `lib/intake/` ("Pure intake logic — note body, dedupe, apply outcome. No I/O.") next to `lib/work-items/`.

- [ ] **Step 4: Commit**

```bash
git add docs/usage-tracking.md docs/ROADMAP.md CLAUDE.md
git commit -m "docs: correct the record for phase 2c"
```

---

## Deferred, and now better understood

- **`read_entry`.** There is no tool to fetch an entry by id. The Planner exposed it; the Tutor and Critic share it. Entries are the log, which is the product, so this is a real gap in the phase-2a surface — its own work, not intake cleanup.
- **The server-side twelve-item cap.** `applyIntakeSchema` caps `proposalIds` at 12, which bounds what can be applied. A Planner proposing more would have the surplus undisplayable rather than refused.
- **A date as a date.** The intake can now ask what the owner is aiming for, but the answer lands as prose in the note. Turning it into a `wake_at` on a proposed work item is a feature, not cleanup.

## Done when

- A partly-failed apply holds the screen and names how many items are waiting in the inbox.
- `pnpm test`, `pnpm typecheck` and `pnpm test:rls` all pass.
- No documentation in the repository describes the goals/spaces/mentors product.

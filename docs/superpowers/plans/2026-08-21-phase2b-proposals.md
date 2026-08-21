# Phase 2b — Proposals and the Approval Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "agents propose, they never write" a property the product enforces rather than a property the Critic happens to have.

**Architecture:** Three write tools emit rows into a `proposals` table instead of mutating anything. Every cited id is validated against the project before a proposal is stored, so fabricated provenance is rejected at the tool call rather than surfacing as a plausible-looking suggestion. An owner reviews pending proposals in an inbox and accepts, edits-and-accepts, or rejects; acceptance validates the payload against the *same* zod schema the human forms use, then writes the real row with `agent_id` set. Document edits write a `document_revisions` row first, which is where phase 1's revision system finally pays for itself.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Postgres + RLS) · zod · Vitest.

**Spec:** [2026-07-30-goalspace-grounded-copartner-design.md](../specs/2026-07-30-goalspace-grounded-copartner-design.md) — §6 is this plan; §5.2 and §5.5 supply the tool and template changes.

**Depends on:** Phase 2a, built and merged. [2026-08-18-phase2a-agent-core.md](2026-08-18-phase2a-agent-core.md) — read its "As built" section before starting; several things there differ from what its task bodies say.

## Global Constraints

- **Agents propose; they never write.** No tool in this plan may insert into `entries`, `work_items`, or `documents`. The only table a write tool touches is `proposals`.
- **Agents are capability boundaries, not personas.** A tool absent from `agent.tools` must be unreachable, enforced by `registry ∩ allowlist` in the executor. Never by prompt instruction.
- **One validation path.** Proposal payloads validate against the phase-1 zod schemas the human forms already use. Do not write a second set.
- **Owner-only RLS, no public branch.** `proposals` gets `owner_id = auth.uid()` for select and delete; insert and update additionally require the row's `project_id` to belong to the caller. No `visibility = 'public'` branch anywhere, for the same reason phase 2a has none: a published project must not publish the machinery behind it.
- **Policies written out longhand.** No loops, no format strings. Security rules must be greppable.
- **Routes are not locale-segmented in `apps/app`.** The spec's §8 shows `app/[locale]/(workspace)/...`; that is the marketing site's convention. This app resolves locale from a cookie and its routes live at `app/(workspace)/...`. Follow the app.
- **Models are `"provider/model"` strings through the AI Gateway.** No per-provider SDKs.
- **Strings are i18n keys, never prose.** Server actions return keys like `app.errors.validation`; the client resolves them. Layouts must survive strings ~40% longer than English.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/app/lib/schemas/document.ts` | zod schemas for document create and update. Pure. |
| `apps/app/lib/db/documents.ts` | typed document queries; `updateDocument` writes a revision first. |
| `apps/app/supabase/migrations/20260822000100_phase2b_proposals.sql` | `proposals` table, indexes, owner-only RLS. |
| `apps/app/lib/schemas/proposal.ts` | citation and per-kind payload schemas; `payloadSchemaFor(kind)`. Pure. |
| `apps/app/lib/proposals/citations.ts` | resolve cited ids against the project; pure shape parsing split from the query. |
| `apps/app/lib/proposals/apply.ts` | claim, validate, apply, set provenance, write revision, supersede. |
| `apps/app/lib/db/proposals.ts` | typed proposal queries and the status transitions. |
| `apps/app/lib/agents/tools/registry.ts` | **modify** — three write tools, `WRITE_TOOLS` group. |
| `apps/app/lib/agents/tools/handlers/index.ts` | **modify** — widened `ToolContext`, three proposal-emitting handlers. |
| `apps/app/lib/agents/executor.ts` | **modify** — pass the widened context through `dispatchToolCall`. |
| `apps/app/lib/agents/templates.ts` | **modify** — seed the Tutor, which has write tools. |
| `apps/app/app/(workspace)/projects/[slug]/inbox/page.tsx` | the approval inbox. |
| `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx` | one proposal: rationale, citations, payload editor, three buttons. |
| `apps/app/app/(workspace)/actions.ts` | **modify** — `acceptProposalAction`, `rejectProposalAction`. |
| `apps/app/tests/unit/*.test.ts` | pure-schema, citation, and apply-logic tests. No database. |
| `apps/app/tests/rls/proposals-isolation.test.ts` | two-user isolation over `proposals`. |

Tasks 1–2 are phase-1 groundwork that was never built: `documents` and `document_revisions` have existed since phase 1 but have no schema, no queries, and no UI. `propose_document_edit` has nothing to apply to until they do.

---

## Task 1: Document schemas (pure)

**Files:**
- Create: `apps/app/lib/schemas/document.ts`
- Test: `apps/app/tests/unit/document-schema.test.ts`

**Interfaces:**
- Consumes: `requiredText`, `optionalText` from `@/lib/schemas/common`.
- Produces: `createDocumentSchema`, `updateDocumentSchema`, `type CreateDocumentValues`, `type UpdateDocumentValues`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/document-schema.test.ts
import { describe, expect, it } from 'vitest';

import { createDocumentSchema, updateDocumentSchema } from '@/lib/schemas/document';

describe('createDocumentSchema', () => {
  it('requires a title', () => {
    expect(createDocumentSchema.safeParse({ body: 'text' }).success).toBe(false);
  });

  it('trims the title and rejects one that is only whitespace', () => {
    // requiredText trims before checking length, so "   " is not a title.
    expect(createDocumentSchema.safeParse({ title: '   ', body: '' }).success).toBe(false);
    const parsed = createDocumentSchema.parse({ title: '  Spec  ', body: '' });
    expect(parsed.title).toBe('Spec');
  });

  it('defaults an absent body to empty rather than null', () => {
    // documents.body is `not null default ''`; null would be rejected by the
    // database after passing validation, which is the worst ordering.
    expect(createDocumentSchema.parse({ title: 'Spec' }).body).toBe('');
  });

  it('rejects a body beyond the column budget', () => {
    const tooLong = 'x'.repeat(200_001);
    expect(createDocumentSchema.safeParse({ title: 'Spec', body: tooLong }).success).toBe(false);
  });
});

describe('updateDocumentSchema', () => {
  it('requires the id', () => {
    expect(updateDocumentSchema.safeParse({ title: 'Spec' }).success).toBe(false);
  });

  it('accepts a title-only or body-only edit', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(updateDocumentSchema.safeParse({ id, title: 'New' }).success).toBe(true);
    expect(updateDocumentSchema.safeParse({ id, body: 'New body' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/document-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/document`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/schemas/document.ts
import { z } from 'zod';

import { requiredText } from './common';

/**
 * Documents are living artifacts, not log entries: they are rewritten in
 * place, and every rewrite is kept as a revision. The body budget is an order
 * of magnitude larger than an entry's for that reason — a document is the
 * thing an entry refers to.
 *
 * The body defaults to empty rather than null because the column is
 * `not null default ''`. A schema that permitted null would validate happily
 * and then be rejected by the database, which is the least useful place to
 * find out.
 */
export const createDocumentSchema = z.object({
  title: requiredText(200),
  body: z.string().max(200_000).default(''),
});

export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  title: requiredText(200).optional(),
  body: z.string().max(200_000).optional(),
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type CreateDocumentValues = z.output<typeof createDocumentSchema>;
export type UpdateDocumentValues = z.output<typeof updateDocumentSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/document-schema.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/schemas/document.ts apps/app/tests/unit/document-schema.test.ts
git commit -m "feat(documents): add create and update schemas"
```

---

## Task 2: Document queries, with revision on every update

**Files:**
- Create: `apps/app/lib/db/documents.ts`

**Interfaces:**
- Consumes: `CreateDocumentValues`, `UpdateDocumentValues` (Task 1); `Database`, `Tables` from `@/types/supabase`.
- Produces: `type Document`, `listDocuments`, `getDocument`, `createDocument`, `updateDocument`.

There is no unit test here: every function is a Supabase round trip with no branching logic worth isolating. The revision behaviour is covered by Task 9's apply tests through a stub, and by `pnpm test:rls`.

- [ ] **Step 1: Write the implementation**

```typescript
// apps/app/lib/db/documents.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { CreateDocumentValues, UpdateDocumentValues } from '@/lib/schemas/document';

type Client = SupabaseClient<Database>;

export type Document = Omit<Tables<'documents'>, 'search_tsv'>;

const DOCUMENT_COLUMNS = 'id, project_id, owner_id, agent_id, title, body, created_at, updated_at';

export async function listDocuments(supabase: Client, projectId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getDocument(
  supabase: Client,
  projectId: string,
  id: string
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Document | null;
}

export async function createDocument(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: CreateDocumentValues;
    agentId?: string | null;
  }
): Promise<Document> {
  const { projectId, ownerId, values, agentId = null } = params;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      agent_id: agentId,
      title: values.title,
      body: values.body,
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Update a document, keeping what it said before.
 *
 * The revision is written *first*, and it records the state being replaced
 * rather than the state being written. Ordering it this way means a failure
 * between the two statements leaves a redundant revision, which costs a row;
 * the other order would lose the previous body, which costs the undo path
 * this whole table exists to provide.
 *
 * This is what makes an accepted agent edit safe to accept: the owner can
 * always get back to what they wrote themselves.
 */
export async function updateDocument(
  supabase: Client,
  params: {
    projectId: string;
    ownerId: string;
    values: UpdateDocumentValues;
    agentId?: string | null;
  }
): Promise<Document> {
  const { projectId, ownerId, values, agentId = null } = params;

  const current = await getDocument(supabase, projectId, values.id);
  if (!current) throw new Error(`Document ${values.id} not found in this project`);

  const { error: revisionError } = await supabase.from('document_revisions').insert({
    document_id: current.id,
    project_id: projectId,
    owner_id: ownerId,
    title: current.title,
    body: current.body,
  });
  if (revisionError) throw revisionError;

  const { data, error } = await supabase
    .from('documents')
    .update({
      ...(values.title !== undefined ? { title: values.title } : {}),
      ...(values.body !== undefined ? { body: values.body } : {}),
      // Null means human-authored. An agent-applied edit stamps the agent that
      // proposed it; a human edit clears it back to null, so the column always
      // describes the *current* body rather than the last agent to touch it.
      agent_id: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('id', values.id)
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) throw error;
  return data as Document;
}
```

- [ ] **Step 2: Verify the project typechecks**

Run: `pnpm typecheck`
Expected: PASS for both apps.

- [ ] **Step 3: Commit**

```bash
git add apps/app/lib/db/documents.ts
git commit -m "feat(documents): add queries, writing a revision on every update"
```

---

## Task 3: Migration — the proposals table

**Files:**
- Create: `apps/app/supabase/migrations/20260822000100_phase2b_proposals.sql`
- Modify: `apps/app/types/supabase.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: table `proposals`; the generated `Tables<'proposals'>` type.

- [ ] **Step 1: Write the migration**

```sql
-- apps/app/supabase/migrations/20260822000100_phase2b_proposals.sql
--
-- Phase 2b: the proposal is the only way an agent changes anything.
--
-- Every write tool inserts here and nowhere else. Acceptance is what produces
-- a real row, and it is always a human action.

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid not null references agents(id) on delete cascade,
  run_id      uuid not null references agent_runs(id) on delete cascade,
  kind        text not null check (kind in ('entry','work_item','document_edit')),

  -- The document being edited, for kind = 'document_edit'. Null otherwise.
  target_id   uuid,

  payload     jsonb not null,
  rationale   text not null,

  -- [{ "type": "entry" | "work_item" | "document", "id": uuid }, ...]
  -- Validated against the project before the row is stored (§6.3), so a
  -- citation in here is known to have resolved at least once.
  citations   jsonb not null default '[]',

  status      text not null default 'pending'
              check (status in ('pending','accepted','rejected','superseded')),

  -- True when the owner changed the payload before accepting. Worth recording:
  -- an accepted-as-written proposal and an accepted-after-rewrite proposal say
  -- very different things about the agent.
  edited      boolean not null default false,

  -- The row created or updated on acceptance. Deliberately carries no foreign
  -- key: its target table varies by kind.
  applied_id  uuid,

  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

-- The inbox reads pending proposals for one project, newest first.
create index proposals_project_status_idx on proposals (project_id, status, created_at desc);
-- The run trace reads every proposal a run produced.
create index proposals_run_idx on proposals (run_id, created_at);

alter table proposals enable row level security;

-- Owner-only, with no public branch — the same regime as the rest of the
-- agent layer and for the same reason. A published project publishes entries
-- and documents; it must not publish the suggestions that were rejected, nor
-- the rationale behind the ones that were not.
--
-- Insert and update additionally require the row's project to belong to the
-- caller, so ownership cannot be forged by relocating a row into someone
-- else's project. Written out longhand: you cannot grep for a policy that
-- exists only as a format string.

create policy proposals_select on proposals for select
  using (owner_id = auth.uid());
create policy proposals_insert on proposals for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = proposals.project_id and p.owner_id = auth.uid()));
create policy proposals_update on proposals for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = proposals.project_id and p.owner_id = auth.uid()));
create policy proposals_delete on proposals for delete
  using (owner_id = auth.uid());
```

- [ ] **Step 2: Apply the migration locally and verify it is reversible from scratch**

```bash
cd apps/app && pnpm db:reset
```

Expected: every migration replays clean, including this one.

- [ ] **Step 3: Verify the RLS carries no public branch**

```bash
grep -c "visibility" apps/app/supabase/migrations/20260822000100_phase2b_proposals.sql
```

Expected: `0`. If this is not zero, a public-read branch has crept in — remove it.

- [ ] **Step 4: Regenerate types**

```bash
cd apps/app && pnpm supabase gen types typescript --local > types/supabase.ts
```

Do not hand-edit the result. If a generated type is wrong for a call site — as it is for nullable function arguments — put the cast in a typed wrapper in `lib/db/`, the way `startAgentRun` does. A hand edit here is reverted by the next regeneration without anyone noticing.

- [ ] **Step 5: Verify the project still typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/supabase/migrations/20260822000100_phase2b_proposals.sql apps/app/types/supabase.ts
git commit -m "feat(db): add the proposals table with owner-only RLS"
```

---

## Task 4: RLS isolation tests for proposals

**Files:**
- Create: `apps/app/tests/rls/proposals-isolation.test.ts`

**Interfaces:**
- Consumes: `createTestUser`, `deleteTestUser`, `type TestUser` from `../helpers/supabase`; the table from Task 3.

**Before you start:** `pnpm test:rls` needs `SUPABASE_SERVICE_ROLE_KEY` in `apps/app/.env.local`. It is absent as of phase 2a, so this suite cannot run without adding it.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/rls/proposals-isolation.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProjectId: string;
let aliceProposalId: string;
let alicePublicProjectId: string;
let alicePublicProposalId: string;
let bobProjectId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as { id: string };
};

const seedProposal = async (user: TestUser, projectId: string, rationale: string) => {
  const agentId = (await insert(user, 'agents', {
    project_id: projectId, owner_id: user.id, slug: 'tutor', name: 'Tutor',
    system_prompt: 'Draft things.', tools: ['propose_entry'],
  })).id;

  const runId = (await insert(user, 'agent_runs', {
    project_id: projectId, owner_id: user.id, agent_id: agentId,
    trigger: 'conversation', status: 'running',
  })).id;

  return (await insert(user, 'proposals', {
    project_id: projectId, owner_id: user.id, agent_id: agentId, run_id: runId,
    kind: 'entry', payload: { kind: 'note', body: 'Drafted body' }, rationale,
  })).id;
};

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`prop-alice-${stamp}@example.test`);
  bob = await createTestUser(`prop-bob-${stamp}@example.test`);

  aliceProjectId = (await insert(alice, 'projects', {
    owner_id: alice.id, slug: 'ev-bike', title: 'Custom EV bike', kind: 'build',
  })).id;

  alicePublicProjectId = (await insert(alice, 'projects', {
    owner_id: alice.id, slug: 'open-notes', title: 'Open notes', kind: 'learn',
    visibility: 'public',
  })).id;

  bobProjectId = (await insert(bob, 'projects', {
    owner_id: bob.id, slug: 'bob-thing', title: 'Bob thing', kind: 'research',
  })).id;

  aliceProposalId = await seedProposal(alice, aliceProjectId, 'Because the log says so.');
  alicePublicProposalId = await seedProposal(alice, alicePublicProjectId, 'Secret rationale.');
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('proposals RLS', () => {
  it('lets the owner read their own proposal', async () => {
    const { data } = await alice!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data?.length).toBe(1);
  });

  it('hides a proposal from another user', async () => {
    const { data } = await bob!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data ?? []).toHaveLength(0);
  });

  it('hides proposals even on a PUBLIC project', async () => {
    // This is the assertion that matters. Phase 1's child tables carry a
    // public-read branch; copying it here would publish the rationale, the
    // payload, and the fact that a suggestion was rejected.
    const { data } = await bob!.client
      .from('proposals')
      .select('id, rationale')
      .eq('id', alicePublicProposalId);
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses an insert that forges ownership', async () => {
    const { error } = await bob!.client.from('proposals').insert({
      project_id: aliceProjectId, owner_id: alice!.id, agent_id: aliceProposalId,
      run_id: aliceProposalId, kind: 'entry', payload: {}, rationale: 'forged',
    });
    expect(error).toBeTruthy();
  });

  it('refuses to relocate a proposal into another user’s project', async () => {
    const { data } = await bob!.client
      .from('proposals')
      .update({ project_id: bobProjectId })
      .eq('id', aliceProposalId)
      .select();
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses a delete by another user', async () => {
    await bob!.client.from('proposals').delete().eq('id', aliceProposalId);
    const { data } = await alice!.client.from('proposals').select('id').eq('id', aliceProposalId);
    expect(data?.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails against an un-migrated database**

Run: `pnpm test:rls`
Expected: FAIL if Task 3's migration has not reached the target project. Apply it, then continue.

- [ ] **Step 3: Run to verify it passes**

Run: `pnpm test:rls`
Expected: PASS, 6 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/app/tests/rls/proposals-isolation.test.ts
git commit -m "test(rls): prove proposals stay private, including on public projects"
```

---

## Task 5: Proposal payload schemas (pure)

**Files:**
- Create: `apps/app/lib/schemas/proposal.ts`
- Test: `apps/app/tests/unit/proposal-schema.test.ts`

**Interfaces:**
- Consumes: `createEntrySchema` from `@/lib/schemas/entry`; `createWorkItemSchema` from `@/lib/schemas/work-item`; `updateDocumentSchema` from `@/lib/schemas/document` (Task 1).
- Produces: `proposalKinds`, `proposalKindSchema`, `type ProposalKind`, `citationSchema`, `citationsSchema`, `type Citation`, `documentEditPayloadSchema`, `payloadSchemaFor`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/proposal-schema.test.ts
import { describe, expect, it } from 'vitest';

import { citationsSchema, payloadSchemaFor } from '@/lib/schemas/proposal';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('citationsSchema', () => {
  it('accepts an empty list', () => {
    expect(citationsSchema.parse([])).toEqual([]);
  });

  it('accepts the three citable types', () => {
    const cites = [
      { type: 'entry', id: UUID },
      { type: 'work_item', id: UUID },
      { type: 'document', id: UUID },
    ];
    expect(citationsSchema.parse(cites)).toHaveLength(3);
  });

  it('rejects a type that is not citable', () => {
    // A URL is not citable in this phase — proposals.citations resolves ids
    // inside the project, and web_search does not exist yet.
    expect(citationsSchema.safeParse([{ type: 'url', id: UUID }]).success).toBe(false);
  });

  it('rejects an id that is not a uuid', () => {
    expect(citationsSchema.safeParse([{ type: 'entry', id: 'e1' }]).success).toBe(false);
  });
});

describe('payloadSchemaFor', () => {
  it('validates an entry payload with the schema the capture form uses', () => {
    const parsed = payloadSchemaFor('entry').safeParse({ kind: 'note', body: 'Something happened' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an entry payload with an unknown kind', () => {
    expect(payloadSchemaFor('entry').safeParse({ kind: 'rambling', body: 'x' }).success).toBe(false);
  });

  it('validates a work item payload', () => {
    expect(payloadSchemaFor('work_item').safeParse({ title: 'Order the servo' }).success).toBe(true);
  });

  it('requires base_updated_at on a document edit', () => {
    // Without it there is no way to tell that the document moved on since the
    // agent read it, and the proposal would apply stale content over newer work.
    expect(payloadSchemaFor('document_edit').safeParse({ id: UUID, body: 'New' }).success).toBe(false);
    const withBase = {
      id: UUID,
      body: 'New',
      base_updated_at: '2026-08-21T00:00:00.000Z',
    };
    expect(payloadSchemaFor('document_edit').safeParse(withBase).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/proposal`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/schemas/proposal.ts
import { z } from 'zod';

import { createEntrySchema } from './entry';
import { createWorkItemSchema } from './work-item';
import { updateDocumentSchema } from './document';

export const proposalKinds = ['entry', 'work_item', 'document_edit'] as const;
export const proposalKindSchema = z.enum(proposalKinds);
export type ProposalKind = z.infer<typeof proposalKindSchema>;

/**
 * What an agent may cite.
 *
 * Ids inside the project, and nothing else. A URL has no place here yet:
 * §6.3 validates every citation against the project, and there is no
 * `web_search` to produce one. When it arrives, that is a spec decision about
 * how external findings are cited — not a quiet widening of this enum.
 */
export const citationSchema = z.object({
  type: z.enum(['entry', 'work_item', 'document']),
  id: z.string().uuid(),
});

export const citationsSchema = z.array(citationSchema).max(50);
export type Citation = z.infer<typeof citationSchema>;

/**
 * A document edit carries the `updated_at` the agent read.
 *
 * This is what makes `superseded` decidable. Without it, accepting a proposal
 * generated an hour ago would overwrite whatever the owner has written since,
 * and neither side would know.
 */
export const documentEditPayloadSchema = updateDocumentSchema.extend({
  base_updated_at: z.string().datetime({ offset: true }),
});

/**
 * One validation path.
 *
 * These are the phase-1 schemas the human forms already post through — not a
 * parallel set with agent-specific rules. If a payload would be rejected from
 * a form, it is rejected from a proposal, and the reverse.
 */
export function payloadSchemaFor(kind: ProposalKind): z.ZodTypeAny {
  switch (kind) {
    case 'entry':
      return createEntrySchema;
    case 'work_item':
      return createWorkItemSchema;
    case 'document_edit':
      return documentEditPayloadSchema;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-schema.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/schemas/proposal.ts apps/app/tests/unit/proposal-schema.test.ts
git commit -m "feat(proposals): add citation and per-kind payload schemas"
```

---

## Task 6: Citation resolution

**Files:**
- Create: `apps/app/lib/proposals/citations.ts`
- Test: `apps/app/tests/unit/proposal-citations.test.ts`

**Interfaces:**
- Consumes: `citationsSchema`, `type Citation` (Task 5).
- Produces: `type CitationCheck`, `groupCitations`, `resolveCitations`.

`groupCitations` is pure and carries the logic worth testing; `resolveCitations` is the thin query around it.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/proposal-citations.test.ts
import { describe, expect, it } from 'vitest';

import { groupCitations, resolveCitations } from '@/lib/proposals/citations';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('groupCitations', () => {
  it('groups ids by the table they must be found in', () => {
    const grouped = groupCitations([
      { type: 'entry', id: A },
      { type: 'entry', id: B },
      { type: 'document', id: A },
    ]);
    expect(grouped.entries).toEqual([A, B]);
    expect(grouped.documents).toEqual([A]);
    expect(grouped.work_items).toEqual([]);
  });

  it('de-duplicates repeated ids', () => {
    // A model citing the same entry three times must not cost three lookups.
    const grouped = groupCitations([
      { type: 'entry', id: A },
      { type: 'entry', id: A },
    ]);
    expect(grouped.entries).toEqual([A]);
  });
});

describe('resolveCitations', () => {
  const stub = (present: Record<string, string[]>) => ({
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: ids.filter((id) => (present[table] ?? []).includes(id)).map((id) => ({ id })),
              error: null,
            }),
          }),
        }),
      };
    },
  });

  it('passes when every cited id exists in the project', async () => {
    const result = await resolveCitations(
      stub({ entries: [A] }) as never,
      'project-1',
      [{ type: 'entry', id: A }]
    );
    expect(result.ok).toBe(true);
  });

  it('fails and names the ids that did not resolve', async () => {
    // A model that invents a citation must get an error it can act on, not a
    // stored proposal that cites nothing. Fabricated provenance is worse than
    // none, because it is trusted.
    const result = await resolveCitations(
      stub({ entries: [A] }) as never,
      'project-1',
      [{ type: 'entry', id: A }, { type: 'entry', id: B }]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual([{ type: 'entry', id: B }]);
  });

  it('passes trivially on an empty citation list', async () => {
    // Not every proposal draws on something specific. An empty list is honest;
    // a fabricated one is not.
    const result = await resolveCitations(stub({}) as never, 'project-1', []);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-citations.test.ts`
Expected: FAIL — cannot resolve `@/lib/proposals/citations`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/proposals/citations.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type { Citation } from '@/lib/schemas/proposal';

type Client = SupabaseClient<Database>;

export type CitationCheck =
  | { ok: true }
  | { ok: false; missing: Citation[] };

interface Grouped {
  entries: string[];
  work_items: string[];
  documents: string[];
}

/** Pure: citation list → the ids to look for in each table, de-duplicated. */
export function groupCitations(citations: Citation[]): Grouped {
  const grouped: Grouped = { entries: [], work_items: [], documents: [] };
  const seen = new Set<string>();

  for (const citation of citations) {
    const key = `${citation.type}:${citation.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (citation.type === 'entry') grouped.entries.push(citation.id);
    else if (citation.type === 'work_item') grouped.work_items.push(citation.id);
    else grouped.documents.push(citation.id);
  }

  return grouped;
}

const TABLE_FOR = {
  entry: 'entries',
  work_item: 'work_items',
  document: 'documents',
} as const;

/**
 * Every cited id must exist and belong to this project.
 *
 * Called before a proposal is stored, so a model that invents an id gets an
 * error and a chance to correct itself rather than producing a suggestion
 * whose provenance looks solid and is not. The project filter is what stops a
 * citation reaching across projects; RLS already prevents reading the row, so
 * a cross-project id simply fails to resolve.
 */
export async function resolveCitations(
  supabase: Client,
  projectId: string,
  citations: Citation[]
): Promise<CitationCheck> {
  if (citations.length === 0) return { ok: true };

  const grouped = groupCitations(citations);
  const found = new Set<string>();

  const lookups: Array<[keyof Grouped, string]> = [
    ['entries', 'entries'],
    ['work_items', 'work_items'],
    ['documents', 'documents'],
  ];

  for (const [bucket, table] of lookups) {
    const ids = grouped[bucket];
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('project_id', projectId)
      .in('id', ids);

    if (error) throw error;
    for (const row of data ?? []) found.add(`${table}:${(row as { id: string }).id}`);
  }

  const missing = citations.filter(
    (citation) => !found.has(`${TABLE_FOR[citation.type]}:${citation.id}`)
  );

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-citations.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/proposals/citations.ts apps/app/tests/unit/proposal-citations.test.ts
git commit -m "feat(proposals): reject a proposal whose citations do not resolve"
```

---

## Task 7: The write tools, and a widened tool context

**Files:**
- Modify: `apps/app/lib/agents/tools/registry.ts`
- Modify: `apps/app/lib/agents/tools/handlers/index.ts`
- Modify: `apps/app/lib/agents/executor.ts`
- Test: `apps/app/tests/unit/agents-registry.test.ts` (extend), `apps/app/tests/unit/agents-write-handlers.test.ts` (create)

**Interfaces:**
- Consumes: `payloadSchemaFor`, `citationsSchema` (Task 5); `resolveCitations` (Task 6).
- Produces: `WRITE_TOOLS`; `ToolName` widened with `'propose_entry' | 'propose_work_item' | 'propose_document_edit'`; `ToolContext` widened with `ownerId`, `agentId`, `runId`.

**Why the context has to widen:** phase 2a's `ToolContext` is `{ supabase, projectId }`, which is all a read tool needs. A proposal row carries `owner_id`, `agent_id`, and `run_id`, and none of them may come from the model. They come from the run context, the same way `projectId` does.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/agents-write-handlers.test.ts
import { describe, expect, it, vi } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, REPO_READ, WRITE_TOOLS } from '@/lib/agents/tools/registry';

const UUID = '11111111-1111-4111-8111-111111111111';

function contextWith(inserted: unknown[], citable: string[] = []): ToolContext {
  return {
    supabase: {
      from(table: string) {
        if (table === 'proposals') {
          return {
            insert: (row: unknown) => {
              inserted.push(row);
              return {
                select: () => ({ single: async () => ({ data: { id: UUID }, error: null }) }),
              };
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({
              in: async (_c: string, ids: string[]) => ({
                data: ids.filter((id) => citable.includes(id)).map((id) => ({ id })),
                error: null,
              }),
            }),
            maybeSingle: async () => ({
              data: { id: UUID, updated_at: '2026-08-21T00:00:00.000Z' },
              error: null,
            }),
          }),
        };
      },
    } as never,
    projectId: 'project-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
  };
}

describe('write tools in the registry', () => {
  it('marks every write tool as writing and not external', () => {
    for (const name of WRITE_TOOLS) {
      expect(REGISTRY[name].writes).toBe(true);
      expect(REGISTRY[name].external).toBe(false);
    }
  });

  it('keeps repo-read free of every write tool', () => {
    // An agent described as reading only must stay that way. The Critic is
    // defined against REPO_READ, so a write tool leaking in here would hand it
    // the ability to change the record.
    for (const name of WRITE_TOOLS) {
      expect(REPO_READ as readonly string[]).not.toContain(name);
    }
  });
});

describe('propose_entry', () => {
  it('writes a proposal, never an entry', async () => {
    const inserted: unknown[] = [];
    const result = await HANDLERS.propose_entry(contextWith(inserted), {
      payload: { kind: 'note', body: 'The servo arrived damaged.' },
      rationale: 'The session entry mentions it but nothing records the outcome.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
    const row = inserted[0] as Record<string, unknown>;
    expect(row.kind).toBe('entry');
    expect(row.status).toBeUndefined(); // the column default is 'pending'
    expect(row.owner_id).toBe('owner-1');
    expect(row.agent_id).toBe('agent-1');
    expect(row.run_id).toBe('run-1');
    expect(result).toMatchObject({ proposal_id: UUID });
  });

  it('rejects a payload the capture form would reject', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_entry(contextWith(inserted), {
        payload: { kind: 'rambling', body: 'x' },
        rationale: 'because',
        citations: [],
      } as never)
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it('rejects a citation that does not resolve, storing nothing', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_entry(contextWith(inserted, []), {
        payload: { kind: 'note', body: 'Something' },
        rationale: 'because',
        citations: [{ type: 'entry', id: UUID }],
      } as never)
    ).rejects.toThrow(/citation/i);
    expect(inserted).toHaveLength(0);
  });
});

describe('propose_document_edit', () => {
  it('stamps the document’s current updated_at as the edit base', async () => {
    // The agent does not supply this — it is read from the row at propose
    // time, so the model cannot claim to have based its edit on a newer
    // version than it actually read.
    const inserted: unknown[] = [];
    await HANDLERS.propose_document_edit(contextWith(inserted, [UUID]), {
      payload: { id: UUID, body: 'Rewritten' },
      rationale: 'Tightens the summary.',
      citations: [{ type: 'document', id: UUID }],
    } as never);

    const row = inserted[0] as { payload: { base_updated_at: string }; target_id: string };
    expect(row.payload.base_updated_at).toBe('2026-08-21T00:00:00.000Z');
    expect(row.target_id).toBe(UUID);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-write-handlers.test.ts`
Expected: FAIL — `WRITE_TOOLS` is not exported and `HANDLERS.propose_entry` is undefined.

- [ ] **Step 3: Widen the registry**

In `apps/app/lib/agents/tools/registry.ts`, extend `REGISTRY_NAMES`, add the three definitions, and export the group. Replace the module docstring's claim that every tool is `writes: false` — it is no longer true.

```typescript
export const REGISTRY_NAMES = [
  'search_repo',
  'list_entries',
  'list_work_items',
  'get_work_item',
  'read_document',
  'propose_entry',
  'propose_work_item',
  'propose_document_edit',
] as const;
```

Add to `REGISTRY`:

```typescript
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
      }),
      rationale: z.string().min(1).describe('Why this belongs in the record. The owner reads this first.'),
      citations: z
        .array(z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() }))
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
        .array(z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() }))
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
        .array(z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() }))
        .default([]),
    }),
    writes: true,
    external: false,
  },
```

And below `REPO_READ`:

```typescript
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
```

- [ ] **Step 4: Widen the tool context and add the handlers**

In `apps/app/lib/agents/tools/handlers/index.ts`, widen the interface and add the three handlers:

```typescript
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
}
```

```typescript
async function storeProposal(
  ctx: ToolContext,
  kind: ProposalKind,
  payload: unknown,
  rationale: string,
  rawCitations: unknown,
  targetId: string | null
): Promise<{ proposal_id: string }> {
  // One validation path: the schema the human form posts through. A payload
  // that would be rejected from the form is rejected here.
  const parsedPayload = payloadSchemaFor(kind).safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error(
      `That payload is not valid for a ${kind} proposal: ${parsedPayload.error.issues
        .map((i) => `${i.path.join('.') || 'payload'} ${i.message}`)
        .join('; ')}`
    );
  }

  const parsedCitations = citationsSchema.safeParse(rawCitations ?? []);
  if (!parsedCitations.success) throw new Error('Citations must be {type, id} objects with uuid ids.');

  const check = await resolveCitations(ctx.supabase, ctx.projectId, parsedCitations.data);
  if (!check.ok) {
    throw new Error(
      `These citations do not exist in this project: ${check.missing
        .map((c) => `${c.type} ${c.id}`)
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
```

```typescript
  async propose_entry(ctx, args: { payload: unknown; rationale: string; citations?: unknown }) {
    return storeProposal(ctx, 'entry', args.payload, args.rationale, args.citations, null);
  },

  async propose_work_item(ctx, args: { payload: unknown; rationale: string; citations?: unknown }) {
    return storeProposal(ctx, 'work_item', args.payload, args.rationale, args.citations, null);
  },

  async propose_document_edit(
    ctx,
    args: { payload: { id: string; title?: string; body?: string }; rationale: string; citations?: unknown }
  ) {
    // base_updated_at is read from the row, never taken from the model. It is
    // the evidence that this edit was written against the version now on
    // record, and a model that supplied its own could defeat the staleness
    // check simply by claiming a newer one.
    const { data, error } = await ctx.supabase
      .from('documents')
      .select('id, updated_at')
      .eq('project_id', ctx.projectId)
      .eq('id', args.payload.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error(`No document ${args.payload.id} in this project.`);

    return storeProposal(
      ctx,
      'document_edit',
      { ...args.payload, base_updated_at: data.updated_at },
      args.rationale,
      args.citations,
      args.payload.id
    );
  },
```

- [ ] **Step 5: Pass the widened context through the executor**

In `apps/app/lib/agents/executor.ts`, `dispatchToolCall` builds a `ToolContext` from the run context. Widen it:

```typescript
  const toolContext: ToolContext = {
    supabase: ctx.supabase,
    projectId: ctx.projectId,
    ownerId: ctx.ownerId,
    agentId: ctx.agentId,
    runId: ctx.runId,
  };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-write-handlers.test.ts tests/unit/agents-registry.test.ts tests/unit/agents-executor.test.ts`
Expected: PASS. The pre-existing executor and registry tests must still pass — the allowlist enforcement they prove is unchanged.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/agents apps/app/tests/unit/agents-write-handlers.test.ts apps/app/tests/unit/agents-registry.test.ts
git commit -m "feat(agents): add the three propose tools, which write only to proposals"
```

---

## Task 8: Proposal queries and status transitions

**Files:**
- Create: `apps/app/lib/db/proposals.ts`

**Interfaces:**
- Consumes: `type ProposalKind` (Task 5).
- Produces: `type Proposal`, `listPendingProposals`, `getProposal`, `claimProposal`, `releaseProposal`, `settleProposal`. Task 11 adds `countPendingProposals` to the same module.

- [ ] **Step 1: Write the implementation**

```typescript
// apps/app/lib/db/proposals.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';
import type { Citation, ProposalKind } from '@/lib/schemas/proposal';

type Client = SupabaseClient<Database>;

/**
 * The generated types widen the check-constrained columns to `string` and the
 * jsonb columns to `Json`. Narrowed here rather than at each call site: the
 * CHECK constraints guarantee kind and status, and `citations` is written by
 * exactly one function — storeProposal — which validates through
 * citationsSchema first.
 */
export type Proposal = Omit<Tables<'proposals'>, 'kind' | 'status' | 'citations'> & {
  kind: ProposalKind;
  status: 'pending' | 'accepted' | 'rejected' | 'superseded';
  citations: Citation[];
};

const PROPOSAL_COLUMNS =
  'id, project_id, owner_id, agent_id, run_id, kind, target_id, payload, rationale, citations, status, edited, applied_id, created_at, decided_at';

export async function listPendingProposals(
  supabase: Client,
  projectId: string
): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Proposal[];
}

export async function getProposal(supabase: Client, id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Proposal | null;
}

/**
 * Take a pending proposal off the board before applying it.
 *
 * The `eq('status', 'pending')` guard is the whole point: it makes the claim
 * conditional, so two tabs racing to accept the same proposal produce one
 * winner and one no-op instead of two entries. Returns null when the claim
 * lost, which the caller reports rather than treating as an error.
 */
export async function claimProposal(supabase: Client, id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .update({ status: 'accepted', decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select(PROPOSAL_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Proposal | null;
}

/** Put a claimed proposal back, for when applying it failed. */
export async function releaseProposal(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'pending', decided_at: null })
    .eq('id', id);

  if (error) throw error;
}

export async function settleProposal(
  supabase: Client,
  id: string,
  status: 'accepted' | 'rejected' | 'superseded',
  params: { appliedId?: string | null; edited?: boolean } = {}
): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({
      status,
      decided_at: new Date().toISOString(),
      ...(params.appliedId !== undefined ? { applied_id: params.appliedId } : {}),
      ...(params.edited !== undefined ? { edited: params.edited } : {}),
    })
    .eq('id', id);

  if (error) throw error;
}
```

- [ ] **Step 2: Verify the project typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/lib/db/proposals.ts
git commit -m "feat(proposals): add queries and a conditional claim for acceptance"
```

---

## Task 9: Applying a proposal

**Files:**
- Create: `apps/app/lib/proposals/apply.ts`
- Test: `apps/app/tests/unit/proposal-apply.test.ts`

**Interfaces:**
- Consumes: `payloadSchemaFor` (Task 5); `claimProposal`, `releaseProposal`, `settleProposal`, `getProposal`, `type Proposal` (Task 8); `createEntry` from `@/lib/db/entries`; `createWorkItem` from `@/lib/db/work-items`; `getDocument`, `updateDocument` (Task 2).
- Produces: `type ApplyOutcome`, `isSuperseded`, `applyProposal`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/proposal-apply.test.ts
import { describe, expect, it } from 'vitest';

import { isSuperseded } from '@/lib/proposals/apply';

describe('isSuperseded', () => {
  it('is false when the document has not moved since the agent read it', () => {
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21T00:00:00.000Z')).toBe(false);
  });

  it('is true when the document changed after the proposal was generated', () => {
    // Applying here would overwrite whatever the owner wrote in between, which
    // is the one failure the revision system cannot make good on: the owner
    // would have to notice before they could undo.
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21T09:00:00.000Z')).toBe(true);
  });

  it('compares instants, not strings', () => {
    // Postgres renders timestamptz with a +00 offset, not a Z suffix. String
    // comparison would call these two different and supersede every edit.
    expect(isSuperseded('2026-08-21T00:00:00.000Z', '2026-08-21 00:00:00+00')).toBe(false);
  });

  it('treats an unparseable base as superseded', () => {
    // Fail closed. A base we cannot read is not evidence that applying is safe.
    expect(isSuperseded('not a date', '2026-08-21T00:00:00.000Z')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-apply.test.ts`
Expected: FAIL — cannot resolve `@/lib/proposals/apply`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/proposals/apply.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { payloadSchemaFor, type ProposalKind } from '@/lib/schemas/proposal';
import {
  claimProposal,
  releaseProposal,
  settleProposal,
  type Proposal,
} from '@/lib/db/proposals';
import { createEntry } from '@/lib/db/entries';
import { createWorkItem } from '@/lib/db/work-items';
import { getDocument, updateDocument } from '@/lib/db/documents';
import type { CreateEntryValues } from '@/lib/schemas/entry';
import type { CreateWorkItemValues } from '@/lib/schemas/work-item';
import type { UpdateDocumentValues } from '@/lib/schemas/document';

type Client = SupabaseClient<Database>;

export type ApplyOutcome =
  | { status: 'applied'; appliedId: string }
  | { status: 'superseded' }
  | { status: 'gone' }
  | { status: 'invalid'; message: string };

/**
 * Has the document moved since the agent read it?
 *
 * Compared as instants rather than strings, because Postgres renders
 * timestamptz as `2026-08-21 00:00:00+00` while the payload carries an ISO
 * string with a `Z`. Comparing those textually marks every edit stale.
 *
 * An unparseable base is treated as superseded. Failing closed costs the owner
 * a re-run; failing open overwrites their work.
 */
export function isSuperseded(baseUpdatedAt: string, currentUpdatedAt: string): boolean {
  const base = Date.parse(baseUpdatedAt);
  const current = Date.parse(currentUpdatedAt);
  if (Number.isNaN(base) || Number.isNaN(current)) return true;
  return current > base;
}

/**
 * Accept a proposal and produce the real row.
 *
 * Claim first, apply second. The claim is a conditional update that only
 * succeeds from `pending`, so two tabs racing to accept the same proposal
 * yield one entry rather than two; if applying then fails, the claim is
 * released and the proposal returns to the inbox. The alternative ordering —
 * apply then mark — leaves an orphan row behind on any failure between them.
 *
 * The payload is validated again here even though the tool validated it at
 * propose time, because the owner may have edited it in the inbox. That edited
 * payload is what applies, and `edited` records that it was not the agent's
 * words that landed.
 */
export async function applyProposal(
  supabase: Client,
  params: {
    proposalId: string;
    ownerId: string;
    payloadOverride?: unknown;
  }
): Promise<ApplyOutcome> {
  const claimed = await claimProposal(supabase, params.proposalId);
  if (!claimed) return { status: 'gone' };

  const edited = params.payloadOverride !== undefined;
  const raw = edited ? params.payloadOverride : claimed.payload;

  const parsed = payloadSchemaFor(claimed.kind as ProposalKind).safeParse(raw);
  if (!parsed.success) {
    await releaseProposal(supabase, claimed.id);
    return { status: 'invalid', message: 'app.errors.validation' };
  }

  try {
    const appliedId = await applyByKind(supabase, claimed, parsed.data, params.ownerId);
    if (appliedId === null) {
      await settleProposal(supabase, claimed.id, 'superseded');
      return { status: 'superseded' };
    }

    await settleProposal(supabase, claimed.id, 'accepted', { appliedId, edited });
    return { status: 'applied', appliedId };
  } catch (error) {
    await releaseProposal(supabase, claimed.id);
    throw error;
  }
}

/** Returns the new row's id, or null when the proposal turned out to be stale. */
async function applyByKind(
  supabase: Client,
  proposal: Proposal,
  payload: unknown,
  ownerId: string
): Promise<string | null> {
  if (proposal.kind === 'entry') {
    // agent_id is what makes provenance visible in the log. It is set from the
    // proposal, never from the payload — the owner edits content, not authorship.
    const entry = await createEntry(supabase, {
      projectId: proposal.project_id,
      ownerId,
      values: payload as CreateEntryValues,
    });
    await supabase.from('entries').update({ agent_id: proposal.agent_id }).eq('id', entry.id);
    return entry.id;
  }

  if (proposal.kind === 'work_item') {
    const item = await createWorkItem(supabase, {
      projectId: proposal.project_id,
      ownerId,
      values: payload as CreateWorkItemValues,
    });
    await supabase.from('work_items').update({ agent_id: proposal.agent_id }).eq('id', item.id);
    return item.id;
  }

  const edit = payload as { id: string; base_updated_at: string };
  const current = await getDocument(supabase, proposal.project_id, edit.id);
  if (!current) return null;
  if (isSuperseded(edit.base_updated_at, current.updated_at)) return null;

  // updateDocument writes the revision before the update, so this is where
  // phase 1's revision table gives every agent edit its undo path.
  const updated = await updateDocument(supabase, {
    projectId: proposal.project_id,
    ownerId,
    values: payload as UpdateDocumentValues,
    agentId: proposal.agent_id,
  });
  return updated.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/proposal-apply.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/proposals/apply.ts apps/app/tests/unit/proposal-apply.test.ts
git commit -m "feat(proposals): apply an accepted proposal, claiming it first"
```

---

## Task 10: Server actions for accept and reject

**Files:**
- Modify: `apps/app/app/(workspace)/actions.ts`

**Interfaces:**
- Consumes: `applyProposal` (Task 9); `settleProposal` (Task 8); `requireSessionContext` from `@/lib/auth/session`; `ok`, `fail`, `type ActionResult` from `@/lib/actions/result`.
- Produces: `acceptProposalAction`, `rejectProposalAction`.

- [ ] **Step 1: Write the implementation**

Append to `apps/app/app/(workspace)/actions.ts`:

```typescript
export async function acceptProposalAction(input: {
  proposalId: string;
  payloadOverride?: unknown;
}): Promise<ActionResult<{ status: string; appliedId?: string }>> {
  const { supabase, userId } = await requireSessionContext();

  try {
    const outcome = await applyProposal(supabase, {
      proposalId: input.proposalId,
      ownerId: userId,
      payloadOverride: input.payloadOverride,
    });

    revalidatePath('/', 'layout');

    switch (outcome.status) {
      case 'applied':
        return ok({ status: 'applied', appliedId: outcome.appliedId });
      case 'superseded':
        // Not an error: the proposal was honest when written and the record
        // moved on. Saying so is more useful than a generic failure.
        return fail('app.inbox.superseded');
      case 'gone':
        return fail('app.inbox.alreadyDecided');
      case 'invalid':
        return fail(outcome.message);
    }
  } catch (error) {
    console.error('acceptProposalAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function rejectProposalAction(
  proposalId: string
): Promise<ActionResult<{ status: string }>> {
  const { supabase } = await requireSessionContext();

  try {
    await settleProposal(supabase, proposalId, 'rejected');
    revalidatePath('/', 'layout');
    return ok({ status: 'rejected' });
  } catch (error) {
    console.error('rejectProposalAction failed', error);
    return fail('app.errors.generic');
  }
}
```

Add the imports at the top of the file:

```typescript
import { applyProposal } from '@/lib/proposals/apply';
import { settleProposal } from '@/lib/db/proposals';
```

- [ ] **Step 2: Add the i18n keys**

Add `app.inbox.superseded`, `app.inbox.alreadyDecided`, `app.inbox.title`, `app.inbox.empty`, `app.inbox.accept`, `app.inbox.reject`, `app.inbox.rationale`, `app.inbox.citations`, and `app.inbox.edited` to each locale file in `packages/i18n` — `en`, `ms`, and `zh`. Every locale gets a real translation; an English string in the `zh` file is a bug, not a placeholder.

- [ ] **Step 3: Verify the project typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/app/app/\(workspace\)/actions.ts packages/i18n
git commit -m "feat(proposals): add accept and reject server actions"
```

---

## Task 11: The approval inbox

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/inbox/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/inbox/loading.tsx`

**Interfaces:**
- Consumes: `listPendingProposals`, `type Proposal` (Task 8); `acceptProposalAction`, `rejectProposalAction` (Task 10); `requireSessionContext`, `getProjectBySlug`, `getFixedT`, `getLocale`, `formatDate` — follow `app/(workspace)/projects/[slug]/log/page.tsx` for the exact import shapes and page skeleton.

**Design notes, from §6.4:**
- Each card shows the rationale **first** — it is what the owner reads to decide — then the payload, then the resolved citations as links into the log or work tree.
- Three actions: accept, edit-and-accept, reject. Edit-and-accept opens the payload in a textarea; submitting sends it as `payloadOverride`.
- Citations render as links. A citation that no longer resolves renders as plain text rather than a broken link — the row may have been deleted since.
- Empty state matters here: an inbox with nothing in it is the normal state, and it should read as calm rather than broken. No celebration, no "all caught up!" — see PRODUCT.md on the excluded register.

- [ ] **Step 1: Write the page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/inbox/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listPendingProposals } from '@/lib/db/proposals';
import { getLocale } from '@/lib/format';
import { ProposalCard } from './proposal-card';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.inbox.title')} · ${slug}` };
}

export default async function InboxPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const proposals = await listPendingProposals(supabase, project.id);
  const t = getFixedT(await getLocale());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl">{t('app.inbox.title')}</h1>

      {proposals.length === 0 ? (
        <p className="text-ink-soft">{t('app.inbox.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard proposal={proposal} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the card**

```tsx
// apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@goalspace/ui';

import { acceptProposalAction, rejectProposalAction } from '@/app/(workspace)/actions';
import type { Proposal } from '@/lib/db/proposals';

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  // The payload is rendered as JSON rather than as a form. A per-kind form is
  // three more components for a surface whose job is review, not authoring —
  // and the payload validates against the same schema either way, so a bad
  // edit is refused rather than stored.
  const asText = JSON.stringify(proposal.payload, null, 2);

  function decide(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? 'app.errors.generic');
    });
  }

  function accept() {
    if (draft === null) {
      decide(() => acceptProposalAction({ proposalId: proposal.id }));
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      // Caught here rather than sent to the server: a JSON syntax error is not
      // a validation failure, and reporting it as one would be misleading.
      setError('app.inbox.malformedEdit');
      return;
    }
    decide(() => acceptProposalAction({ proposalId: proposal.id, payloadOverride: parsed }));
  }

  return (
    <article className="flex flex-col gap-3 border border-rule p-4">
      {/* Rationale first: it is what the owner reads to decide. */}
      <p>{proposal.rationale}</p>

      {draft === null ? (
        <pre className="overflow-x-auto bg-paper-shade p-3 text-sm">{asText}</pre>
      ) : (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={12}
          className="w-full border border-rule-strong bg-paper p-3 font-mono text-sm"
        />
      )}

      {proposal.citations.length > 0 ? (
        <p className="text-sm text-ink-soft">
          {t('app.inbox.citations')}:{' '}
          {proposal.citations.map((citation) => `${citation.type} ${citation.id.slice(0, 8)}`).join(', ')}
        </p>
      ) : null}

      {error ? <p className="text-sm text-danger">{t(error)}</p> : null}

      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={accept}>
          {t('app.inbox.accept')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setDraft(draft === null ? asText : null)}
        >
          {t(draft === null ? 'app.inbox.edit' : 'app.inbox.cancelEdit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => decide(() => rejectProposalAction(proposal.id))}
        >
          {t('app.inbox.reject')}
        </Button>
      </div>
    </article>
  );
}
```

Add `app.inbox.edit`, `app.inbox.cancelEdit`, and `app.inbox.malformedEdit` to
the three locale files alongside the keys from Task 10.

- [ ] **Step 3: Add the inbox to the project navigation**

`app/(workspace)/projects/[slug]/layout.tsx` renders the per-project tabs. Add one for the inbox, following the existing tab markup exactly:

```tsx
const pendingCount = await countPendingProposals(supabase, project.id);
```

```tsx
<Link
  href={`/projects/${project.slug}/inbox`}
  className={cn('label px-3 py-2', segment === 'inbox' && 'border-b-2 border-ink')}
>
  {t('app.inbox.title')}
  {/* A badge reading "0" is noise. An empty inbox is the normal state. */}
  {pendingCount > 0 ? <span className="ml-2 text-ink-soft">{pendingCount}</span> : null}
</Link>
```

Add the count query to `lib/db/proposals.ts`:

```typescript
export async function countPendingProposals(supabase: Client, projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 4: Verify the build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS; `/projects/[slug]/inbox` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/\(workspace\)/projects/\[slug\]/inbox apps/app/app/\(workspace\)/projects/\[slug\]/layout.tsx
git commit -m "feat(inbox): review, edit, accept, and reject proposals"
```

---

## Task 12: Seed the Tutor

**Files:**
- Modify: `apps/app/lib/agents/templates.ts`
- Test: `apps/app/tests/unit/agents-templates.test.ts` (extend)

**Interfaces:**
- Consumes: `REPO_READ`, `WRITE_TOOLS` (Task 7).
- Produces: a second entry in `SEEDED_TEMPLATES`.

The Critic exists to demonstrate a boundary by having no write tools. Until now nothing has had any, so the proposal path has had no agent to exercise it. The Tutor is that agent.

The spec's Tutor also carries `generate_audio`, which does not exist. It is left out for the same reason the Tutor itself was left out of phase 2a: an agent whose tools are absent claims capabilities it does not have. Its description must not mention audio.

- [ ] **Step 1: Write the failing test**

```typescript
// append to apps/app/tests/unit/agents-templates.test.ts
describe('the Tutor', () => {
  it('is seeded with repo-read plus the entry and document write tools', () => {
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor');
    expect(tutor).toBeDefined();
    expect(tutor!.tools).toContain('propose_entry');
    expect(tutor!.tools).toContain('propose_document_edit');
    expect(tutor!.tools).toContain('search_repo');
  });

  it('cannot propose work items or reach outside the system', () => {
    // The Researcher is the one that opens work items and searches the web.
    // Widening the Tutor here would make the two templates indistinguishable.
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.tools).not.toContain('propose_work_item');
    for (const name of tutor.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].external).toBe(false);
    }
  });

  it('does not claim a capability it has no tool for', () => {
    // generate_audio ships in a later phase. A description that promises it
    // now is a lie the model will repeat.
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.role_description.toLowerCase()).not.toContain('audio');
    expect(tutor.system_prompt.toLowerCase()).not.toContain('audio');
  });

  it('leaves the Critic writing nothing', () => {
    // The regression that matters: adding write tools to the registry must not
    // quietly widen the agent defined as reaching nowhere.
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic')!;
    for (const name of critic.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-templates.test.ts`
Expected: FAIL — no template with slug `tutor`.

- [ ] **Step 3: Add the template**

```typescript
  {
    slug: 'tutor',
    name: 'Tutor',
    role_description:
      'Explains what you have written back to you, and drafts entries and document edits for you to accept.',
    system_prompt: [
      'You help the owner understand and consolidate their own project record.',
      '',
      'You can read the record, and you can propose changes to it. You cannot',
      'change anything yourself: propose_entry and propose_document_edit create',
      'suggestions the owner reviews, and nothing you do reaches the record',
      'until they accept it. Never say you have written, saved, or updated',
      'anything — say what you have proposed.',
      '',
      'Cite what you drew on, using ids you have actually seen in a tool result.',
      'A citation you invent will be rejected and the proposal discarded, so',
      'read before you propose.',
      '',
      'Write proposals in the owner’s register: plain, specific, unsentimental.',
      'You are drafting something they will put their name to.',
    ].join('\n'),
    tools: [...REPO_READ, 'propose_entry', 'propose_document_edit'],
    model: CRITIC_MODEL,
  },
```

Rename the `CRITIC_MODEL` constant to `DEFAULT_MODEL` now that two templates share it, and update the Critic's reference.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/agents-templates.test.ts`
Expected: PASS. The existing template tests must also still pass — `agentRowsFor` and the rate-table coverage test now cover two templates.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/agents/templates.ts apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(agents): seed the Tutor, the first agent that can propose"
```

---

## Done when

1. A Tutor asked to draft an entry produces a `proposals` row and **no** `entries` row, and the run trace shows the tool call that made it.
2. A proposal citing an id that does not exist in the project is rejected at the tool call, recorded as a failed tool call, and never stored — proven by `tests/unit/agents-write-handlers.test.ts`.
3. Accepting a proposal produces a real row with `agent_id` set to the proposing agent; accepting a `document_edit` also produces a `document_revisions` row carrying the previous body.
4. Editing a proposal before accepting applies the edited payload and records `edited = true`.
5. Accepting a `document_edit` whose document changed since generation marks it `superseded` and leaves the document untouched.
6. Accepting the same proposal twice produces one row, not two.
7. `pnpm test:rls` proves no second user can read a proposal — including on a project marked public.
8. The Critic still has no write tools, proven by `tests/unit/agents-templates.test.ts`.

## Not in this plan

Conversations and message persistence; the ask and run-trace surfaces; the agent editor; `web_search`; `generate_audio`; the Researcher template; embeddings and vector search. Phase 4's outside contributions reuse this inbox — that is why it is built once, here, rather than as an agent-specific feature.

## Before starting

- Read the "As built" section of the phase 2a plan. Several statements in its task bodies were corrected during implementation, and the corrections are what the code does.
- `pnpm test:rls` needs `SUPABASE_SERVICE_ROLE_KEY` in `apps/app/.env.local`. It is not there as of phase 2a, and Task 4 cannot be verified without it.
- The one open spec decision — how web findings are cited (§6.3 vs the Researcher) — does not block this plan. `citationSchema` deliberately admits only in-project ids, so resolving that decision later is an additive change to one enum rather than a rework.

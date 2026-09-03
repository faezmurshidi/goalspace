# Document Generation, Slice 2e-1: the `document` proposal kind

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent can propose a whole document, and the owner accepts it in the inbox that already exists.

**Architecture:** Four small changes along one existing path. `proposalKinds` gains `'document'` and `payloadSchemaFor` maps it to the `createDocumentSchema` the human create-form already posts through; `applyProposal` gains a case that calls `createDocument` with the proposing agent's id; the registry gains a `propose_document` tool whose handler is a two-line call into the existing `storeProposal`; and a migration widens the `proposals.kind` CHECK constraint and grants the tool to Tutors already seeded. Nothing new is invented — every piece plugs into machinery phase 2b built.

**Tech Stack:** TypeScript, zod, Supabase (Postgres + RLS), Vitest 4, pnpm workspaces + Turborepo.

**Spec:** [docs/superpowers/specs/2026-09-03-document-generation-design.md](../specs/2026-09-03-document-generation-design.md)

## Global Constraints

- **Node ≥22 is required.** The shell here defaults to v20, under which every RLS test fails with "native WebSocket not found". Prefix RLS runs with the v22 path — see Task 5.
- **Agents propose; they never write.** `propose_document` inserts into `proposals` and touches nothing else. It is `writes: 'proposes'`, which puts it in `WRITE_TOOLS`.
- **One validation path.** `payloadSchemaFor('document')` returns `createDocumentSchema` itself — not a copy, not an agent-specific variant. If the create-form would reject a payload, the proposal is rejected, and the reverse.
- **`target_id` stays null for a `document` proposal.** That column names the document being *edited*; a proposal to create one has no document yet.
- **This slice adds no staleness.** No `synthesised_through` column, no counting, no UI. That is slice 2e-2.
- **Work on a branch, never on `main`.** Commit messages carry the reasoning behind the decision, not just the change. A pre-commit hook scans the command line and rejects multi-line commit messages written inline; write the message to a file and use `git commit -F <file>`.
- Run commands from the repository root (`/Users/faez/Documents/goalspace`) unless a step says otherwise. Turborepo fans out to the workspaces.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `apps/app/lib/schemas/proposal.ts` | Modify | Add `'document'` to `proposalKinds`; map it in `payloadSchemaFor`. |
| `apps/app/lib/proposals/apply.ts` | Modify | `applyByKind` gains a `document` branch calling `createDocument`. |
| `apps/app/lib/agents/tools/registry.ts` | Modify | `propose_document` definition; add it to `REGISTRY_NAMES` and `WRITE_TOOLS`. |
| `apps/app/lib/agents/tools/handlers/index.ts` | Modify | `propose_document` handler — one `storeProposal` call. |
| `apps/app/lib/agents/templates.ts` | Modify | Grant `propose_document` to the Tutor; amend its prompt and role description. |
| `apps/app/supabase/migrations/20260903000600_proposals_document_kind.sql` | Create | Widen the kind CHECK; grant the tool to Tutors already seeded. |
| `apps/app/tests/unit/proposal-schema.test.ts` | Modify | The kind exists; the payload schema is the create-form's. |
| `apps/app/tests/unit/agents-registry.test.ts` | Modify | `propose_document` is a proposal tool and disjoint from `REPO_READ`. |
| `apps/app/tests/unit/agents-templates.test.ts` | Modify | The Tutor holds it; the Critic and Planner do not. |
| `apps/app/tests/unit/agents-write-handlers.test.ts` | Modify | The handler stores a proposal with `target_id` null and validates citations. |
| `apps/app/tests/rls/proposals-apply.test.ts` | Modify | Accepting one creates a real document carrying `agent_id`. |
| `apps/app/tests/rls/proposals-isolation.test.ts` | Modify | A second user can read neither the proposal nor the document it created. |

No UI file changes. `ProposalCard` renders the payload as JSON and reads no kind label, so a `document` proposal already renders and already accepts — verified in `apps/app/app/(workspace)/projects/[slug]/inbox/proposal-card.tsx:17-21`.

---

### Task 1: The proposal kind and its payload schema

**Files:**
- Modify: `apps/app/lib/schemas/proposal.ts:7`, `apps/app/lib/schemas/proposal.ts:52-60`
- Test: `apps/app/tests/unit/proposal-schema.test.ts`

**Interfaces:**
- Consumes: `createDocumentSchema` from `@/lib/schemas/document` — `z.object({ title: requiredText(200), body: z.string().max(200_000).default('') })`.
- Produces: `proposalKinds` is `['entry', 'work_item', 'document', 'document_edit'] as const`; `ProposalKind` gains `'document'`; `payloadSchemaFor('document')` returns `createDocumentSchema`.

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/unit/proposal-schema.test.ts`:

```ts
describe('the document kind', () => {
  it('is a proposal kind', () => {
    expect(proposalKindSchema.safeParse('document').success).toBe(true);
  });

  it('validates through the same schema the create form posts through', () => {
    // One validation path. Not a schema that happens to agree with
    // createDocumentSchema — the schema itself, so the two cannot drift.
    expect(payloadSchemaFor('document')).toBe(createDocumentSchema);
  });

  it('rejects a payload the create form would reject', () => {
    const parsed = payloadSchemaFor('document').safeParse({ title: '', body: 'Something' });
    expect(parsed.success).toBe(false);
  });

  it('defaults the body to empty, matching the not-null column default', () => {
    const parsed = payloadSchemaFor('document').safeParse({ title: 'Tide clock state' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ title: 'Tide clock state', body: '' });
  });

  it('is distinct from document_edit, which still requires an id and a base version', () => {
    // The two kinds share a noun and nothing else: one creates, one rewrites
    // against a version the agent read. Mapping them to one schema would let a
    // create proposal skip the staleness check.
    const asEdit = payloadSchemaFor('document_edit').safeParse({ title: 'Tide clock state' });
    expect(asEdit.success).toBe(false);
  });
});
```

Make sure the file's imports include everything the block uses:

```ts
import { createDocumentSchema } from '@/lib/schemas/document';
import { payloadSchemaFor, proposalKindSchema } from '@/lib/schemas/proposal';
```

If a symbol is already imported there, merge into the existing import rather than adding a second one.

- [ ] **Step 2: Run the test to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/proposal-schema.test.ts
```

Expected: FAIL. `proposalKindSchema.safeParse('document')` returns `success: false`, and `payloadSchemaFor('document')` is a TypeScript error because `'document'` is not a `ProposalKind`.

- [ ] **Step 3: Add the kind**

In `apps/app/lib/schemas/proposal.ts`, replace line 7:

```ts
export const proposalKinds = ['entry', 'work_item', 'document', 'document_edit'] as const;
```

- [ ] **Step 4: Map it in `payloadSchemaFor`**

Widen the existing import on line 3 of the same file:

```ts
import {
  CHANGES_SOMETHING_MESSAGE,
  changesSomething,
  createDocumentSchema,
  updateDocumentFields,
} from './document';
```

Then add the case to the switch, above `document_edit`:

```ts
export function payloadSchemaFor(kind: ProposalKind): z.ZodTypeAny {
  switch (kind) {
    case 'entry':
      return createEntrySchema;
    case 'work_item':
      return createWorkItemSchema;
    // The create-form schema itself, not a copy. A document an agent proposes
    // is a document a person could have typed, and the way to keep that true
    // is to have one schema rather than two that agree today.
    case 'document':
      return createDocumentSchema;
    case 'document_edit':
      return documentEditPayloadSchema;
  }
}
```

- [ ] **Step 5: Run the test to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/proposal-schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck — the switch is exhaustive, so other call sites may now fail**

```bash
pnpm typecheck
```

Expected: PASS. If anything fails, it is a `switch (kind)` elsewhere that no longer covers every member — fix it rather than adding a `default`, because the exhaustiveness is what makes the next kind impossible to overlook.

- [ ] **Step 7: Commit**

```bash
cd /Users/faez/Documents/goalspace
cat > /tmp/msg-2e1-task1.txt <<'MSG'
feat(proposals): a document is a thing an agent can propose

proposalKinds carried entry, work_item and document_edit, so an agent
could rewrite a document that exists and could not bring one into being.

payloadSchemaFor returns createDocumentSchema itself rather than a
schema shaped like it: one validation path means a payload the create
form would reject is rejected here, and the two cannot drift.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git add apps/app/lib/schemas/proposal.ts apps/app/tests/unit/proposal-schema.test.ts
git commit -F /tmp/msg-2e1-task1.txt
```

---

### Task 2: The apply path

**Files:**
- Modify: `apps/app/lib/proposals/apply.ts:88-118` (the `applyByKind` branches)
- Create: `apps/app/supabase/migrations/20260903000600_proposals_document_kind.sql`
- Test: `apps/app/tests/rls/proposals-apply.test.ts`

**Interfaces:**
- Consumes: `payloadSchemaFor('document')` from Task 1; `createDocument(supabase, { projectId, ownerId, values, agentId })` from `@/lib/db/documents`, which returns a `Document` with an `id`.
- Produces: `applyProposal` returns `{ status: 'applied', appliedId }` for a `document` proposal, where `appliedId` is the new `documents.id`.

The test here is an RLS test rather than a unit test, because the behaviours that matter are database behaviours — the insert, the `agent_id` that lands on it, and the `applied_id` written back to the proposal. A stubbed client would only prove the stub was written to agree with the code. It needs a live Supabase project and Node 22 (see Global Constraints).

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/rls/proposals-apply.test.ts`. It uses the `proposalOf`, `client`, `alice`, `projectId` and `agentId` helpers already defined at the top of that file:

```ts
describe('applying a document proposal', () => {
  it('creates the document with agent_id set to the proposing agent', async () => {
    const id = await proposalOf({
      kind: 'document',
      payload: {
        title: 'Harmonic constituents',
        body: 'Five constituents, chosen for the Solent.',
      },
    });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('title, body, agent_id')
      .eq('id', outcome.appliedId)
      .single();

    expect(doc!.title).toBe('Harmonic constituents');
    expect(doc!.body).toBe('Five constituents, chosen for the Solent.');
    // Provenance. Null would mean the owner typed it.
    expect(doc!.agent_id).toBe(agentId);

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status, applied_id, target_id')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('accepted');
    expect(proposal!.applied_id).toBe(outcome.appliedId);
    // target_id names the document being edited. A proposal to create one has
    // no document yet, so it stays null.
    expect(proposal!.target_id).toBeNull();
  });

  it('produces one document when the same proposal is accepted twice', async () => {
    // The claim is a conditional update from 'pending'. Two tabs racing must
    // yield one document, not two — the same guarantee entries already have.
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'Bearing selection', body: 'Ceramic, for the salt.' },
    });

    const first = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    const second = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });

    expect(first.status).toBe('applied');
    expect(second.status).toBe('gone');

    const { data: docs } = await alice!.client
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('title', 'Bearing selection');
    expect(docs).toHaveLength(1);
  });

  it('applies the owner’s edit rather than the agent’s title', async () => {
    const id = await proposalOf({
      kind: 'document',
      payload: { title: 'The agent’s title', body: 'Body as drafted.' },
    });

    const outcome = await applyProposal(client(), {
      proposalId: id,
      ownerId: alice!.id,
      payloadOverride: { title: 'What the owner called it', body: 'Body as drafted.' },
    });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: doc } = await alice!.client
      .from('documents')
      .select('title')
      .eq('id', outcome.appliedId)
      .single();
    expect(doc!.title).toBe('What the owner called it');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('edited')
      .eq('id', id)
      .single();
    expect(proposal!.edited).toBe(true);
  });

  it('returns the proposal to the inbox when the title is empty', async () => {
    const id = await proposalOf({ kind: 'document', payload: { title: '', body: 'x' } });

    const outcome = await applyProposal(client(), { proposalId: id, ownerId: alice!.id });
    expect(outcome.status).toBe('invalid');

    const { data: proposal } = await alice!.client
      .from('proposals')
      .select('status')
      .eq('id', id)
      .single();
    expect(proposal!.status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.local/share/mise/installs/node/22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-apply.test.ts
```

If that Node path does not exist on this machine, find one: `ls ~/.local/share/mise/installs/node/ 2>/dev/null || ls ~/.nvm/versions/node/`. Any v22 works.

Expected: FAIL at insert time — the database rejects `kind = 'document'` with `violates check constraint "proposals_kind_check"`. That failure is why Step 3 exists; do not work around it.

- [ ] **Step 3: Write the migration that makes the kind storable**

Create `apps/app/supabase/migrations/20260903000600_proposals_document_kind.sql`:

```sql
-- A document is a thing an agent can propose, not only a thing it can edit.
--
-- proposals.kind was constrained to entry, work_item and document_edit, which
-- is why phase 2b's agents could rewrite a document that exists and could not
-- bring one into being. The type widened in the same slice; without this the
-- database refuses the row and the tool fails at its last step.
--
-- Dropped and recreated rather than widened in place: Postgres has no ALTER
-- CONSTRAINT for a CHECK. The name is the one Postgres generated for the
-- inline check in 20260822000100_phase2b_proposals.sql.
alter table proposals drop constraint proposals_kind_check;

alter table proposals add constraint proposals_kind_check
  check (kind in ('entry', 'work_item', 'document', 'document_edit'));

-- Grant propose_document to Tutors seeded before the tool existed.
--
-- Same reasoning as 20260902000200: a live agent's allowlist is a stored
-- array, so an agent created before this migration would keep the tools it was
-- seeded with and be unable to do what its role description now claims.
--
-- Scoped to agents already holding propose_document_edit, which is the marker
-- of an agent seeded as a Tutor rather than one an owner has narrowed. An owner
-- who stripped a Tutor back to reading keeps their choice, and no other seeded
-- agent matches: the Critic proposes nothing, the Planner holds
-- propose_work_item only, the Partner records rather than proposes, and the
-- Interviewer's allowlist is empty.
--
-- propose_document writes to proposals and nowhere else, so this widens what
-- an agent may ask for, never what it may change.
update public.agents
set tools = array_append(tools, 'propose_document')
where 'propose_document_edit' = any (tools)
  and not ('propose_document' = any (tools));
```

- [ ] **Step 4: Apply the migration locally**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm db:reset
```

Expected: the reset completes and replays every migration including the new one. If `pnpm db:start` has not been run in this shell, run it first.

- [ ] **Step 5: Re-run the test — it should now fail differently**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.local/share/mise/installs/node/22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-apply.test.ts
```

Expected: FAIL, but now on the assertion rather than the insert. `applyByKind` falls through to its `document_edit` tail, reads `payload.id` (undefined), finds no document, and returns null — so `outcome.status` is `'superseded'` where the test expects `'applied'`. That is the bug Step 6 fixes.

- [ ] **Step 6: Add the apply branch**

In `apps/app/lib/proposals/apply.ts`, widen the import on line 3:

```ts
import { createDocument, getDocument, updateDocument } from '@/lib/db/documents';
```

and line 7:

```ts
import type { CreateDocumentValues, UpdateDocumentValues } from '@/lib/schemas/document';
```

Then insert this branch in `applyByKind`, after the `work_item` branch and before the `const edit = ...` tail:

```ts
  if (proposal.kind === 'document') {
    // A create cannot be superseded — there is no prior version to be stale
    // against, which is the whole difference between this kind and
    // document_edit. So no read, no version check, and no null return.
    const document = await createDocument(supabase, {
      projectId: proposal.project_id,
      ownerId,
      values: payload as CreateDocumentValues,
      agentId: proposal.agent_id,
    });
    return document.id;
  }
```

- [ ] **Step 7: Run the test to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.local/share/mise/installs/node/22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-apply.test.ts
```

Expected: PASS, including the pre-existing entry and document-edit cases.

- [ ] **Step 8: Commit**

```bash
cd /Users/faez/Documents/goalspace
cat > /tmp/msg-2e1-task2.txt <<'MSG'
feat(proposals): accepting a document proposal creates the document

The type widening alone was not enough — proposals.kind is CHECK
constrained, so the database refused the row until the constraint said
otherwise. Dropped and recreated, because Postgres has no ALTER
CONSTRAINT for a CHECK.

A create cannot be superseded: there is no prior version to be stale
against, which is the difference between this kind and document_edit.
So the branch reads nothing and returns no null.

The same migration grants propose_document to Tutors already seeded,
scoped to agents holding propose_document_edit — an owner who narrowed
theirs keeps their choice.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git add apps/app/lib/proposals/apply.ts apps/app/tests/rls/proposals-apply.test.ts \
  apps/app/supabase/migrations/20260903000600_proposals_document_kind.sql
git commit -F /tmp/msg-2e1-task2.txt
```

---

### Task 3: The `propose_document` tool

**Files:**
- Modify: `apps/app/lib/agents/tools/registry.ts:23-35` (`REGISTRY_NAMES`), `:62-243` (`REGISTRY`), `:272-276` (`WRITE_TOOLS`)
- Modify: `apps/app/lib/agents/tools/handlers/index.ts:345-352` (beside the other propose handlers)
- Test: `apps/app/tests/unit/agents-registry.test.ts`, `apps/app/tests/unit/agents-write-handlers.test.ts`

**Interfaces:**
- Consumes: `storeProposal(ctx, kind, payload, rationale, rawCitations, targetId)` — a module-private function in `handlers/index.ts` that validates the payload through `payloadSchemaFor`, resolves citations against the project, inserts the row, and returns `{ proposal_id: string }`.
- Produces: registry entry `REGISTRY.propose_document` with `writes: 'proposes'`, `external: false`; handler `HANDLERS.propose_document(ctx, { payload, rationale, citations })` returning `{ proposal_id: string }`.

- [ ] **Step 1: Write the failing registry test**

Append to `apps/app/tests/unit/agents-registry.test.ts`:

```ts
describe('propose_document', () => {
  it('is a proposal tool, so the owner is asked before anything is created', () => {
    // 'proposes' exactly, not merely truthy. record_entry is also a write and
    // carries 'records', which is the distinction the union exists to make.
    expect(REGISTRY.propose_document.writes).toBe('proposes');
    expect(REGISTRY.propose_document.external).toBe(false);
  });

  it('is in WRITE_TOOLS, and therefore not in REPO_READ', () => {
    expect(WRITE_TOOLS as readonly string[]).toContain('propose_document');
    expect(REPO_READ as readonly string[]).not.toContain('propose_document');
  });

  it('takes a title and a body, and no document id', () => {
    // An id would make it an edit. propose_document_edit is that tool, and it
    // additionally requires a version the agent has read.
    const parsed = REGISTRY.propose_document.inputSchema.safeParse({
      payload: { title: 'Harmonic constituents', body: 'Five, for the Solent.' },
      rationale: 'The decision is spread across four entries.',
      citations: [],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.payload).not.toHaveProperty('id');
  });

  it('refuses a payload with an empty title', () => {
    const parsed = REGISTRY.propose_document.inputSchema.safeParse({
      payload: { body: 'A body with nothing to call it.' },
      rationale: 'because',
    });
    expect(parsed.success).toBe(false);
  });
});
```

Ensure the file imports `WRITE_TOOLS`; line 3 currently imports `isAllowed, REGISTRY, REPO_READ, resolveTools`. Merge, do not duplicate:

```ts
import {
  isAllowed,
  REGISTRY,
  REPO_READ,
  resolveTools,
  WRITE_TOOLS,
} from '@/lib/agents/tools/registry';
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-registry.test.ts
```

Expected: FAIL — `REGISTRY.propose_document` is undefined, and TypeScript rejects the property access because `'propose_document'` is not a `ToolName`.

- [ ] **Step 3: Add the registry entry**

In `apps/app/lib/agents/tools/registry.ts`, add the name to `REGISTRY_NAMES` immediately before `'propose_document_edit'`:

```ts
  'propose_document',
  'propose_document_edit',
] as const;
```

Add the definition to `REGISTRY`, immediately before `propose_document_edit`:

```ts
  propose_document: {
    name: 'propose_document',
    description:
      'Propose a new document for the owner to accept or reject. This does NOT create it. ' +
      'Use this for a standing answer the record does not yet hold in one place — what was ' +
      'decided and why, or the current state of one part of the project. Cite the entries you ' +
      'drew on: they are how the owner checks it. To change a document that already exists, ' +
      'use propose_document_edit instead.',
    inputSchema: z.object({
      payload: z.object({
        title: z.string().min(1).max(200),
        body: z.string().max(200_000).default(''),
      }),
      rationale: z.string().min(1),
      citations: z
        .array(
          z.object({ type: z.enum(['entry', 'work_item', 'document']), id: z.string().uuid() })
        )
        .default([]),
    }),
    writes: 'proposes',
    external: false,
  },
```

Add it to `WRITE_TOOLS`, keeping the order matching `REGISTRY_NAMES`:

```ts
export const WRITE_TOOLS = [
  'propose_entry',
  'propose_work_item',
  'propose_document',
  'propose_document_edit',
] as const satisfies readonly ToolName[];
```

- [ ] **Step 4: Run the registry test to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-registry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing handler test**

Append to `apps/app/tests/unit/agents-write-handlers.test.ts`. It uses the `contextWith(inserted, citable)` helper and the `UUID` constant already defined at the top of that file:

```ts
describe('propose_document', () => {
  it('stores a proposal, never a document, with no target', async () => {
    const inserted: unknown[] = [];
    const result = await HANDLERS.propose_document(contextWith(inserted), {
      payload: { title: 'Harmonic constituents', body: 'Five, for the Solent.' },
      rationale: 'The decision is spread across four entries and nowhere summarised.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
    const row = inserted[0] as Record<string, unknown>;
    expect(row.kind).toBe('document');
    // target_id names the document being edited. There is not one yet.
    expect(row.target_id).toBeNull();
    expect(row.owner_id).toBe('owner-1');
    expect(row.agent_id).toBe('agent-1');
    expect(row.run_id).toBe('run-1');
    expect(result).toMatchObject({ proposal_id: UUID });
  });

  it('rejects a payload the create form would reject, storing nothing', async () => {
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_document(contextWith(inserted), {
        payload: { title: '', body: 'A document with no name.' },
        rationale: 'because',
        citations: [],
      } as never)
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it('rejects a citation that does not resolve, storing nothing', async () => {
    // The failure this catches is the one that recurred through phase 2c: an
    // agent naming an id it never saw. A stored document citing invented
    // entries looks better evidenced than one citing none.
    const inserted: unknown[] = [];
    await expect(
      HANDLERS.propose_document(contextWith(inserted, []), {
        payload: { title: 'Harmonic constituents', body: 'Five.' },
        rationale: 'because',
        citations: [{ type: 'entry', id: UUID }],
      } as never)
    ).rejects.toThrow(/citation/i);
    expect(inserted).toHaveLength(0);
  });

  it('does not require the document to have been read first', async () => {
    // propose_document_edit does, because an edit is written against a version.
    // A create has no prior version, so demanding a read would be demanding an
    // id that cannot exist — the shape of bug that cost phase 2c three rounds.
    const inserted: unknown[] = [];
    const ctx = contextWith(inserted);
    expect(ctx.documentVersions.size).toBe(0);

    await HANDLERS.propose_document(ctx, {
      payload: { title: 'Bearing selection', body: 'Ceramic, for the salt.' },
      rationale: 'Nothing records why ceramic.',
      citations: [],
    } as never);

    expect(inserted).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-write-handlers.test.ts
```

Expected: FAIL — `HANDLERS.propose_document` is not a function. The file's pre-existing "marks every proposal tool as proposing" case iterates `WRITE_TOOLS` and now covers `propose_document` too; that one should already pass from Step 3.

- [ ] **Step 7: Add the handler**

In `apps/app/lib/agents/tools/handlers/index.ts`, add to `HANDLERS` immediately before `propose_document_edit`:

```ts
  async propose_document(ctx, args: { payload: unknown; rationale: string; citations?: unknown }) {
    // No documentVersions lookup, unlike propose_document_edit. There is no
    // prior version to be written against — that is what makes this a create.
    return storeProposal(ctx, 'document', args.payload, args.rationale, args.citations, null);
  },
```

- [ ] **Step 8: Run the handler test to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-write-handlers.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run the whole unit suite and typecheck**

```bash
pnpm test && pnpm typecheck
```

Expected: PASS. `HANDLERS` is a `Record<ToolName, ...>`, so a missing handler is a type error rather than a runtime surprise — if typecheck fails here, the handler name does not match the registry name.

- [ ] **Step 10: Commit**

```bash
cd /Users/faez/Documents/goalspace
cat > /tmp/msg-2e1-task3.txt <<'MSG'
feat(agents): propose_document

Takes a title and a body and no id — an id would make it an edit, and
propose_document_edit is that tool. It needs no prior read for the same
reason: there is no version to be written against. Demanding one would
be demanding an id that cannot exist, which is the shape of bug that
cost phase 2c three rounds.

writes: 'proposes', so it files itself under the heading on the agents
page that promises the owner an approval step, and lands in WRITE_TOOLS
— which is disjoint from REPO_READ by construction, so the Critic stays
describable as writing nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git add apps/app/lib/agents/tools/registry.ts apps/app/lib/agents/tools/handlers/index.ts \
  apps/app/tests/unit/agents-registry.test.ts apps/app/tests/unit/agents-write-handlers.test.ts
git commit -F /tmp/msg-2e1-task3.txt
```

---

### Task 4: The Tutor holds it

**Files:**
- Modify: `apps/app/lib/agents/templates.ts:59-81` (the Tutor template)
- Test: `apps/app/tests/unit/agents-templates.test.ts`

**Interfaces:**
- Consumes: `REGISTRY.propose_document` from Task 3.
- Produces: `SEEDED_TEMPLATES.find(t => t.slug === 'tutor').tools` contains `'propose_document'`.

The Tutor rather than a new agent: it already drafts, and its role description already says so. A sixth template for one tool would be a persona, and §5 of the phase 2 design forbids that — agents are capability boundaries.

- [ ] **Step 1: Write the failing test**

In `apps/app/tests/unit/agents-templates.test.ts`, add to the Tutor's describe block (around line 108):

```ts
  it('can propose a whole document, not only an edit to one', () => {
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.tools).toContain('propose_document');
    expect(tutor.tools).toContain('propose_document_edit');
  });

  it('says so in its role description, so the agents page is not lying', () => {
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.role_description.toLowerCase()).toContain('document');
  });
```

Add to the Critic's block:

```ts
  it('cannot propose a document', () => {
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic')!;
    expect(critic.tools).not.toContain('propose_document');
  });
```

And to the Planner's block:

```ts
  it('proposes work items and no documents', () => {
    const planner = SEEDED_TEMPLATES.find((t) => t.slug === 'planner')!;
    expect(planner.tools).not.toContain('propose_document');
  });
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-templates.test.ts
```

Expected: FAIL on the two Tutor cases. The Critic and Planner cases pass already and are there as regressions — they are what makes "a write tool added to the registry does not leak into a read-only agent" checkable rather than claimed.

- [ ] **Step 3: Grant the tool and amend the words**

In `apps/app/lib/agents/templates.ts`, in the Tutor template, replace the `role_description` on lines 61-62:

```ts
    role_description:
      'Explains what you have written back to you, and drafts entries and documents for you to accept.',
```

In `system_prompt`, replace the paragraph beginning "You can read the record" with:

```ts
      'You can read the record, and you can propose changes to it. You cannot',
      'change anything yourself: propose_entry, propose_document and',
      'propose_document_edit create suggestions the owner reviews, and nothing',
      'you do reaches the record until they accept it. Never say you have',
      'written, saved, or updated anything — say what you have proposed.',
      '',
      'Propose a document when the record holds an answer in pieces and nowhere',
      'whole — what was decided and why, or the current state of one part of',
      'the project. Propose an edit when such a document already exists; read',
      'it first, because an edit written against a stale version is rejected.',
```

And the tools on line 79:

```ts
    tools: [...REPO_READ, 'propose_entry', 'propose_document', 'propose_document_edit'],
```

- [ ] **Step 4: Run it to see it pass**

```bash
cd /Users/faez/Documents/goalspace/apps/app && pnpm vitest run tests/unit/agents-templates.test.ts
```

Expected: PASS. The file's existing "every template's tools are registry names" and "carries each template's tools through unchanged" cases cover the new entry automatically.

- [ ] **Step 5: Run the whole unit suite**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/faez/Documents/goalspace
cat > /tmp/msg-2e1-task4.txt <<'MSG'
feat(agents): the Tutor can draft a document, not only edit one

The Tutor rather than a new template. It already drafts and its role
description already said so; another agent for one tool would be a
persona, and agents here are capability boundaries.

The prompt says when to use which — propose_document when the record
holds an answer in pieces and nowhere whole, propose_document_edit when
one already exists. That distinction is not enforceable in the schema,
since both are valid calls, so it is stated where the model reads it
and the tool descriptions repeat it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git add apps/app/lib/agents/templates.ts apps/app/tests/unit/agents-templates.test.ts
git commit -F /tmp/msg-2e1-task4.txt
```

---

### Task 5: Isolation, and the full gate

**Files:**
- Modify: `apps/app/tests/rls/proposals-isolation.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4. No new production code.

A `document` proposal is a new row shape reaching a table whose policies were written when there were three kinds. The policies are kind-agnostic — ownership is flat, and insert additionally checks the row's project belongs to the caller — but "fine by inspection" is exactly what the RLS suite exists to disbelieve.

- [ ] **Step 1: Write the test**

Append to `apps/app/tests/rls/proposals-isolation.test.ts`. It uses that file's
existing helpers: `insert(user, table, values)`, `seedAgentAndRun(user, projectId)`
returning `{ agentId, runId }`, and the module-level `alice`, `bob`,
`aliceProjectId`. Add the `applyProposal` import at the top:

```ts
import { applyProposal } from '@/lib/proposals/apply';
```

Then:

```ts
describe('a document proposal is as private as any other', () => {
  it('is invisible to a second user, as is the document accepting it creates', async () => {
    const { agentId, runId } = await seedAgentAndRun(alice!, aliceProjectId);

    const proposalId = (
      await insert(alice!, 'proposals', {
        project_id: aliceProjectId,
        owner_id: alice!.id,
        agent_id: agentId,
        run_id: runId,
        kind: 'document',
        rationale: 'The decision is spread across four entries.',
        payload: { title: 'Harmonic constituents', body: 'Five, for the Solent.' },
      })
    ).id;

    const { data: seenProposal } = await bob!.client
      .from('proposals')
      .select('id')
      .eq('id', proposalId);
    expect(seenProposal ?? []).toHaveLength(0);

    const outcome = await applyProposal(alice!.client as never, {
      proposalId,
      ownerId: alice!.id,
    });
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;

    const { data: seenDocument } = await bob!.client
      .from('documents')
      .select('id')
      .eq('id', outcome.appliedId);
    expect(seenDocument ?? []).toHaveLength(0);

    // And the owner can still read it, so the assertion above is isolation
    // rather than the row having failed to exist.
    const { data: own } = await alice!.client
      .from('documents')
      .select('id')
      .eq('id', outcome.appliedId);
    expect(own ?? []).toHaveLength(1);
  });
});
```

Do not add a forging case here: the file's existing "refuses an insert that
forges ownership" covers it, and the policies are kind-agnostic — a second copy
differing only in `kind` would assert nothing new.

- [ ] **Step 2: Run it**

```bash
cd /Users/faez/Documents/goalspace/apps/app
PATH="$HOME/.local/share/mise/installs/node/22.23.2/bin:$PATH" pnpm vitest run tests/rls/proposals-isolation.test.ts
```

Expected: PASS on the first run — this test records a property rather than driving a change. The policies were written longhand for ownership rather than per kind, so the new kind inherits them; this fails loudly if someone later writes a kind-specific policy that forgets one. If it does fail, stop: it means a `document` proposal or the document accepting it creates is visible across users, which is a security defect rather than a test to adjust.

- [ ] **Step 3: Check the public-project case too**

The file's own comment calls this "the assertion that matters" — phase 1's child tables carry a public-read branch, and a document proposal's payload is an entire document body. Append:

```ts
  it('stays hidden on a PUBLIC project, payload and all', async () => {
    const publicProjectId = (
      await insert(alice!, 'projects', {
        owner_id: alice!.id,
        slug: 'open-notes-doc',
        title: 'Open notes',
        kind: 'learn',
        visibility: 'public',
      })
    ).id;

    const { agentId, runId } = await seedAgentAndRun(alice!, publicProjectId);
    const proposalId = (
      await insert(alice!, 'proposals', {
        project_id: publicProjectId,
        owner_id: alice!.id,
        agent_id: agentId,
        run_id: runId,
        kind: 'document',
        rationale: 'Secret rationale.',
        payload: { title: 'Unpublished draft', body: 'Not for anyone else.' },
      })
    ).id;

    const { data } = await bob!.client
      .from('proposals')
      .select('id, payload')
      .eq('id', proposalId);
    expect(data ?? []).toHaveLength(0);
  });
```

Place it inside the same describe block, then re-run the command from Step 2. Expected: PASS.

- [ ] **Step 4: Run every gate**

```bash
cd /Users/faez/Documents/goalspace
pnpm test && pnpm typecheck && pnpm lint
PATH="$HOME/.local/share/mise/installs/node/22.23.2/bin:$PATH" pnpm test:rls
```

Expected: all green. Unit was 391 before this slice and gains 17 cases (5 in Task 1, 8 in Task 3, 4 in Task 4); RLS was 101 and gains 7 (4 in Task 2, 3 in Task 5).

- [ ] **Step 5: Live pass — ask the Tutor for a document and accept it**

Everything model-facing in phase 2d was correct only after being run, so this is a step rather than a hope.

```bash
pnpm dev
```

In the app at `http://localhost:3001`, in a project that already holds some log entries:

1. Open the project's resume view and type `@tutor write up what we have decided about <something your project actually decided> as a document`.
2. Confirm the reply says it has **proposed** a document and does not claim to have written one.
3. Open the inbox. Confirm one proposal is there, its payload shows `title` and `body` and no `id`, and its citations resolve to real entries.
4. Accept it. Confirm the documents tab now lists it.
5. Open it and confirm the body is what the proposal said, and that the document's author shows as the agent rather than as the owner.

If anything needs fixing, fix it in its own commit before Step 6, and say in that commit what the live pass revealed.

- [ ] **Step 6: Commit**

```bash
cd /Users/faez/Documents/goalspace
cat > /tmp/msg-2e1-task5.txt <<'MSG'
test(rls): a document proposal is as private as any other

The policies are kind-agnostic — ownership is flat, and insert
additionally checks the row's project belongs to the caller — so this
passed first run. It is here so that a later kind-specific policy that
forgets 'document' fails rather than quietly widens.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git add apps/app/tests/rls/proposals-isolation.test.ts
git commit -F /tmp/msg-2e1-task5.txt
```

---

## What this slice deliberately leaves undone

Named so a reviewer does not read them as oversights:

- **No `synthesised_through` column and no staleness count.** Slice 2e-2, per spec §10. A document created in this slice records what it synthesised nowhere, which is why 2e-2 follows immediately rather than eventually.
- **No documents-tab or inbox UI change.** The inbox renders payloads as JSON and reads no kind label, so a `document` proposal already reviews and accepts through the surface that exists.
- **No document chat, no templates, no auto-regeneration, no rich text.** Spec §7 argues each.

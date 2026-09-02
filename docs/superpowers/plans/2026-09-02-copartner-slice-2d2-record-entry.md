# Co-partner Chat — Slice 2d-2: `record_entry`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Partner can write the owner's own words into the log, and provably cannot write anything else.

**Architecture:** The registry's `writes` flag widens from a boolean to `false | 'proposes' | 'records'`, because the agents page derives a user-facing promise from it and `record_entry` breaks that promise either way. The tool itself validates every cited message against this conversation's user turns before writing, in the shape `resolveCitations` already established.

**Tech Stack:** TypeScript · `zod@3` · Vitest 4 · Supabase Postgres

**Spec:** [docs/superpowers/specs/2026-09-02-copartner-chat-design.md](../specs/2026-09-02-copartner-chat-design.md) — §6, §6.1, §6.2
**Builds on:** [slice 2d-1](2026-09-02-copartner-slice-2d1-data-and-delegation.md), PR #27.

## Global Constraints

- **No UI in this slice.** 2d-3 builds the surface.
- **`record_entry` must not be able to write text the owner did not type.** Enforced server-side against `messages`, never asked for in a prompt.
- **The Partner still holds no `propose_*`.** Adding `record_entry` does not change that.
- **Node ≥22** before `pnpm test:rls`. **Working directory `apps/app`** unless stated.

---

### Task 1: Widen `writes` to a union

Pure refactor, no new tool. Done first so `record_entry` has an honest category to land in rather than being retrofitted into one.

**Files:**
- Modify: `apps/app/lib/agents/tools/registry.ts`, `apps/app/lib/agents/tool-groups.ts`
- Modify: `apps/app/tests/unit/agents-registry.test.ts`, `apps/app/tests/unit/tool-groups.test.ts`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**Interfaces:**
- Produces: `ToolWrites = false | 'proposes' | 'records'`; `ToolGroupKey` gains `'records'`.

- [ ] **Step 1: Update the failing test first**

In `apps/app/tests/unit/agents-registry.test.ts`, line 55 currently reads:

```ts
      if (def.writes) expect(def.name.startsWith('propose_')).toBe(true);
```

Replace with:

```ts
      // 'records' writes to the log directly and is deliberately not named
      // propose_*, because it does not propose. Only the proposal tools carry
      // that prefix, and the check is now on the category rather than on
      // truthiness — which record_entry would otherwise silently fail.
      if (def.writes === 'proposes') expect(def.name.startsWith('propose_')).toBe(true);
      if (def.writes === 'records') expect(def.name.startsWith('propose_')).toBe(false);
```

In `apps/app/tests/unit/tool-groups.test.ts`, the first case asserts three groups in a fixed order. Update it:

```ts
  it('returns the four groups in a fixed order', () => {
    expect(toolGroups().map((g) => g.key)).toEqual(['reads', 'records', 'proposes', 'external']);
  });
```

and add:

```ts
  it('files a recording tool apart from the proposing ones', () => {
    // The agents page notes "you approve each" under the proposing group. A
    // tool that writes straight to the log must not appear beneath that
    // sentence — it would be a false statement about the only tool in the
    // system that does not work that way.
    const groups = Object.fromEntries(toolGroups().map((g) => [g.key, g.tools.map((t) => t.name)]));
    expect(groups.records).toContain('record_entry');
    expect(groups.proposes).not.toContain('record_entry');
    expect(groups.reads).not.toContain('record_entry');
  });
```

That last case fails until Task 2 adds the tool. That is expected and is noted again there.

- [ ] **Step 2: Run to verify the order test fails**

Run: `pnpm test -- tests/unit/tool-groups.test.ts`
Expected: FAIL on "returns the four groups in a fixed order" — three groups exist.

- [ ] **Step 3: Widen the type**

In `apps/app/lib/agents/tools/registry.ts`:

```ts
/**
 * What a tool does to the record.
 *
 * A union rather than a boolean because there are three answers, not two, and
 * the agents page states each of them to the owner in different words. Two
 * booleans would let `writes: true, records: true` be written and mean
 * nothing; this makes that unrepresentable.
 */
export type ToolWrites = false | 'proposes' | 'records';
```

and in `ToolDefinition`:

```ts
  /**
   * 'proposes' emits a proposal the owner accepts or rejects. 'records' writes
   * to the log directly, and only the owner's own words — see record_entry.
   */
  writes: ToolWrites;
```

Every existing entry changes `writes: false` → unchanged, and `writes: true` →
`writes: 'proposes'`. That is exactly the three `propose_*` entries; leave
every read tool at `false`.

`WRITE_TOOLS` keeps its meaning — it is the proposal group — but its comment
must now say so explicitly rather than relying on "write" being unambiguous.

- [ ] **Step 4: Add the fourth group**

In `apps/app/lib/agents/tool-groups.ts`, widen the key and insert the group
between reads and proposes, so the order still reads as escalating
consequence — see, then write what you said, then ask for a change, then leave
the building:

```ts
export type ToolGroupKey = 'reads' | 'records' | 'proposes' | 'external';
```

```ts
    {
      // Between reads and proposes on purpose. The order is escalating
      // consequence, and writing down what the owner already said is a smaller
      // act than asking to change something.
      key: 'records',
      labelKey: 'app.agents.tools.records',
      noteKey: 'app.agents.tools.recordsNote',
      tools: all.filter((t) => t.writes === 'records' && !t.external),
    },
```

and narrow the two existing filters, which currently rely on truthiness:

```ts
      tools: all.filter((t) => t.writes === false && !t.external),   // reads
      tools: all.filter((t) => t.writes === 'proposes' && !t.external), // proposes
```

- [ ] **Step 5: Add the locale keys**

Under `app.agents.tools` in `en.json`:

```json
"records": "Writes down what you say",
"recordsNote": "straight into the log, no approval step"
```

Translate into `ms.json` and `zh.json`.

- [ ] **Step 6: Run the tests**

Run: `pnpm test` and `pnpm typecheck` (from the repository root)
Expected: PASS **except** "files a recording tool apart from the proposing ones", which waits on Task 2.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/agents/tools/registry.ts apps/app/lib/agents/tool-groups.ts \
        apps/app/tests/unit/agents-registry.test.ts apps/app/tests/unit/tool-groups.test.ts \
        packages/i18n/src/locales/
git commit -m "refactor(agents): writes becomes a union, not a boolean"
```

---

### Task 2: `record_entry`

**Files:**
- Create: `apps/app/lib/agents/tools/sources.ts`
- Modify: `apps/app/lib/agents/tools/registry.ts`, `apps/app/lib/agents/tools/handlers/index.ts`, `apps/app/lib/agents/executor.ts`, `apps/app/lib/agents/templates.ts`
- Test: `apps/app/tests/unit/agents-record-entry.test.ts`

**Interfaces:**
- Produces: `unresolvedSources(cited: string[], allowed: Set<string>): string[]` — pure, and the whole of the rule.
- `ToolContext.conversationId?: string`.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/agents-record-entry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { SEEDED_TEMPLATES } from '@/lib/agents/templates';
import { unresolvedSources } from '@/lib/agents/tools/sources';
import { REGISTRY } from '@/lib/agents/tools/registry';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('unresolvedSources', () => {
  it('accepts ids the owner actually wrote', () => {
    expect(unresolvedSources([A, B], new Set([A, B, C]))).toEqual([]);
  });

  it('names an id that is not in the allowed set', () => {
    // The allowed set is this conversation's user turns. An id outside it is
    // an assistant turn, another conversation's message, or an invention —
    // and the tool cannot tell which, nor does it need to.
    expect(unresolvedSources([A, C], new Set([A, B]))).toEqual([C]);
  });

  it('rejects an empty citation list', () => {
    // Silence is not consent. A record_entry with no source is exactly the
    // agent authoring an entry, which is what the design forbids — so the
    // empty case must not fall through as "nothing to check, therefore fine".
    expect(unresolvedSources([], new Set([A]))).toEqual(['(none cited)']);
  });

  it('reports every unresolved id, not just the first', () => {
    // The model gets one chance to correct itself. Naming one id at a time
    // turns that into several round trips at the owner's expense.
    expect(unresolvedSources([B, C], new Set([A]))).toEqual([B, C]);
  });
});

describe('record_entry in the registry', () => {
  it('is categorised as recording, not proposing', () => {
    expect(REGISTRY.record_entry.writes).toBe('records');
    expect(REGISTRY.record_entry.external).toBe(false);
  });

  it('requires at least one source message', () => {
    const schema = REGISTRY.record_entry.inputSchema;
    const payload = { kind: 'note', title: null, body: 'Replaced the bearings.' };
    expect(schema.safeParse({ payload, source_message_ids: [] }).success).toBe(false);
    expect(schema.safeParse({ payload, source_message_ids: [A] }).success).toBe(true);
  });
});

describe('the Partner holds it', () => {
  it('can record, and still cannot propose', () => {
    const partner = SEEDED_TEMPLATES.find((t) => t.slug === 'partner')!;
    expect(partner.tools).toContain('record_entry');
    for (const name of partner.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes, name).not.toBe('proposes');
    }
  });

  it('is the only template that can record', () => {
    const holders = SEEDED_TEMPLATES.filter((t) => t.tools.includes('record_entry')).map(
      (t) => t.slug
    );
    expect(holders).toEqual(['partner']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- tests/unit/agents-record-entry.test.ts`
Expected: FAIL — cannot resolve `@/lib/agents/tools/sources`.

- [ ] **Step 3: Write the source check**

Create `apps/app/lib/agents/tools/sources.ts`:

```ts
/**
 * Which cited message ids the owner did not write.
 *
 * The whole of the rule that makes `record_entry` safe, kept pure so it is
 * tested directly rather than through a stubbed database. The caller supplies
 * the allowed set from `listUserMessageIds`, which restricts to `role = 'user'`
 * in the query — so an assistant turn is simply absent here, and needs no
 * special case.
 *
 * An empty citation list is a failure, not a trivial pass. A record_entry
 * citing nothing is the agent authoring an entry in the owner's log, which is
 * exactly what the design forbids; returning `[]` for it would let the one
 * case that matters through the one check that exists.
 */
export function unresolvedSources(cited: string[], allowed: Set<string>): string[] {
  if (cited.length === 0) return ['(none cited)'];
  return cited.filter((id) => !allowed.has(id));
}
```

- [ ] **Step 4: Add the registry entry**

Add `'record_entry'` to the name list after `'ask_agent'`, and:

```ts
  record_entry: {
    name: 'record_entry',
    description:
      'Write something the owner told you into the project log. You may choose the kind and ' +
      'the title; the body must be their own words, and every id in source_message_ids must ' +
      'be a message they wrote in this conversation. You cannot record your own summaries or ' +
      'conclusions — the call fails if you try.',
    inputSchema: z.object({
      payload: z.object({
        kind: z.enum(['note', 'decision', 'source', 'session']),
        title: z.string().max(200).nullable().optional(),
        body: z.string().min(1).max(20_000),
      }),
      // min(1): an entry citing nothing is the agent authoring the record.
      source_message_ids: z.array(z.string().uuid()).min(1).max(20),
    }),
    writes: 'records',
    external: false,
  },
```

- [ ] **Step 5: Add the handler**

In `handlers/index.ts`, add `conversationId?: string` to `ToolContext` with a comment saying it is present only on conversation runs, and add the handler. It imports `createEntry` and `listUserMessageIds` — neither creates a cycle, both being leaf modules under `lib/db`.

```ts
  async record_entry(
    ctx,
    args: {
      payload: { kind: string; title?: string | null; body: string };
      source_message_ids: string[];
    }
  ) {
    if (!ctx.conversationId) {
      // Loud, as with ask_agent: an agent holding record_entry outside a
      // conversation is a wiring bug, and there is no conversation whose user
      // turns could validate the sources.
      throw new Error(
        `record_entry was called on run ${ctx.runId} with no conversationId in the context.`
      );
    }

    const allowed = await listUserMessageIds(ctx.supabase, ctx.conversationId);
    const unresolved = unresolvedSources(args.source_message_ids, allowed);
    if (unresolved.length > 0) {
      // Returned rather than thrown: the model can correct itself, and the
      // owner should not see a failed run because an agent cited badly once.
      return {
        recorded: false,
        error:
          `These are not messages the owner wrote in this conversation: ${unresolved.join(', ')}. ` +
          'Record only what they told you, citing the message ids you are recording from.',
      };
    }

    // The one validation path, as everywhere else: the schema the human capture
    // form posts through is the schema this passes through.
    const parsed = createEntrySchema.safeParse({
      kind: args.payload.kind,
      title: args.payload.title ?? null,
      body: args.payload.body,
      work_item_id: null,
    });
    if (!parsed.success) {
      return { recorded: false, error: 'That entry is not valid.' };
    }

    const entry = await createEntry(ctx.supabase, {
      projectId: ctx.projectId,
      ownerId: ctx.ownerId,
      // Stamped, not laundered to null. The words are the owner's; the decision
      // to write them down, and the kind and title, are the agent's.
      agentId: ctx.agentId,
      values: parsed.data,
    });

    return { recorded: true, id: entry.id, kind: entry.kind };
  },
```

Add `conversationId?: string` to `RunContext` in `executor.ts` as well, so it reaches `buildToolSet`.

- [ ] **Step 6: Grant it to the Partner**

In `templates.ts`, change the Partner's tools and delete the comment that says `record_entry` is not yet available:

```ts
    tools: [...REPO_READ, 'ask_agent', 'record_entry'],
```

The existing Partner test asserting every tool has `writes === false` must become `not.toBe('proposes')`, since `record_entry` is now `'records'`. The intent it was written to protect — *the Partner proposes nothing* — is unchanged and better stated.

- [ ] **Step 7: Run everything**

Run: `pnpm test`, `pnpm typecheck` (repository root), `pnpm test:rls`
Expected: PASS, including the tool-groups case deferred from Task 1.

- [ ] **Step 8: Commit**

```bash
git add apps/app/lib/agents/tools/sources.ts apps/app/lib/agents/tools/registry.ts \
        apps/app/lib/agents/tools/handlers/index.ts apps/app/lib/agents/executor.ts \
        apps/app/lib/agents/templates.ts apps/app/tests/unit/agents-record-entry.test.ts \
        apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(chat): record_entry writes the owner's words, and only those"
```

---

## Deferred

- **Live verification** — 2d-3, with the chat route. Same reason as 2d-1: no caller exists here.
- **`work_item_id` on a recorded entry.** The human capture bar can file a note against a work item; `record_entry` always passes null. Worth adding once the Partner can be asked about a specific item, which is the inline affordance phase 2 §8 describes and this phase does not build.

## Done when

- `record_entry` is categorised `'records'` and appears on the agents page under its own heading, never beneath "you approve each".
- Citing an id the owner did not write returns an error and writes nothing.
- Citing nothing at all is refused by the schema and again by `unresolvedSources`.
- The Partner holds `record_entry` and still holds no `propose_*`.
- `pnpm test`, `pnpm typecheck` and `pnpm test:rls` pass.

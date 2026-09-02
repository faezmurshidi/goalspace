# Co-partner Chat — Slice 2d-1: Data and Delegation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist conversations and messages, and let the Partner invoke another agent without gaining any of its capabilities — provable before a chat surface exists.

**Architecture:** One migration creating `conversations` and `messages` with longhand RLS and composite provenance keys. Delegation arrives as an `ask_agent` tool whose executor is **injected into the run context** rather than imported, because importing `runTooled` from the handlers would close a module cycle. The Partner is a fifth seeded template holding no `propose_*` tool at all.

**Tech Stack:** TypeScript · Supabase Postgres · `ai@7.0.66` · `zod@3` · Vitest 4

**Spec:** [docs/superpowers/specs/2026-09-02-copartner-chat-design.md](../specs/2026-09-02-copartner-chat-design.md)
**Related:** phase 2 [grounded co-partner design](../specs/2026-07-30-goalspace-grounded-copartner-design.md) §8 defines the two tables; this plan does not redesign them.

## Global Constraints

- **No UI in this slice.** No route, no component, no locale string. 2d-3 builds the surface.
- **The Partner holds no `propose_*` tool.** Spec §4. If a task here grants one, the slice is wrong.
- **Delegation must not nest.** `ask_agent` goes to `partner` and nobody else, and the handler additionally refuses `agent_slug: 'partner'`. Two independent guards, both tested.
- **RLS written longhand**, per CLAUDE.md — "you cannot grep for a policy that exists only as a format string."
- **Composite foreign keys** on anything carrying provenance, matching `proposals`: `(id, project_id)`, never `(id)` alone.
- **`zai/glm-5.3-flash` ships with its `RATES` row** in the same task. Spec §4.1.
- **Node ≥22** — `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` before `pnpm test:rls`.
- **Working directory is `apps/app`** unless stated otherwise.

---

### Task 1: The migration

**Files:**
- Create: `apps/app/supabase/migrations/20260903000100_conversations.sql`
- Test: `apps/app/tests/rls/conversations-isolation.test.ts`

**Interfaces:**
- Produces: tables `conversations` and `messages`; column `agent_runs.conversation_id`.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/rls/conversations-isolation.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';

let alice: TestUser | undefined;
let bob: TestUser | undefined;
let aliceProject: string;
let bobProject: string;
let aliceConversation: string;

beforeAll(async () => {
  alice = await createTestUser(`conv-a-${Date.now()}@example.test`);
  bob = await createTestUser(`conv-b-${Date.now()}@example.test`);

  const mk = async (user: TestUser, slug: string) => {
    const { data } = await user.client
      .from('projects')
      .insert({ owner_id: user.id, title: 'Chat', slug, kind: 'build' })
      .select()
      .single();
    return data!.id as string;
  };
  aliceProject = await mk(alice, `conv-a-${Date.now()}`);
  bobProject = await mk(bob, `conv-b-${Date.now()}`);

  const { data: agent } = await alice.client
    .from('agents')
    .insert({
      project_id: aliceProject,
      owner_id: alice.id,
      slug: 'partner',
      name: 'Partner',
      system_prompt: 'Talk.',
      model: 'zai/glm-5.3-flash',
    })
    .select()
    .single();

  const { data: conv } = await alice.client
    .from('conversations')
    .insert({ project_id: aliceProject, owner_id: alice.id, agent_id: agent!.id })
    .select()
    .single();
  aliceConversation = conv!.id;

  await alice.client.from('messages').insert({
    conversation_id: aliceConversation,
    project_id: aliceProject,
    owner_id: alice.id,
    role: 'user',
    content: 'Why did I drop the belt drive?',
  });
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
  if (bob) await deleteTestUser(bob.id);
});

describe('conversation isolation', () => {
  it('hides conversations from another user', async () => {
    const { data } = await bob!.client.from('conversations').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('hides messages from another user', async () => {
    const { data } = await bob!.client.from('messages').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('refuses a message written into another owner’s conversation', async () => {
    // RLS on messages checks owner_id = auth.uid(); the project check is what
    // stops Bob claiming the row as his own while pointing it at Alice's
    // conversation.
    const { error } = await bob!.client.from('messages').insert({
      conversation_id: aliceConversation,
      project_id: bobProject,
      owner_id: bob!.id,
      role: 'user',
      content: 'Injected.',
    });
    expect(error).not.toBeNull();
  });

  it('refuses a role it does not know', async () => {
    // 'system' and 'tool' are deliberately absent: this table stores the
    // conversation as the owner sees it, not the model's full context window.
    const { error } = await alice!.client.from('messages').insert({
      conversation_id: aliceConversation,
      project_id: aliceProject,
      owner_id: alice!.id,
      role: 'system',
      content: 'Not a turn.',
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('23514');
  });

  it('links a run to its conversation', async () => {
    const { data: agent } = await alice!.client
      .from('agents')
      .select('id')
      .eq('project_id', aliceProject)
      .single();

    const { error } = await alice!.client.from('agent_runs').insert({
      project_id: aliceProject,
      owner_id: alice!.id,
      agent_id: agent!.id,
      conversation_id: aliceConversation,
      trigger: 'conversation',
      status: 'running',
    });
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:rls -- -t "conversation isolation"`
Expected: FAIL — `conversations` does not exist.

- [ ] **Step 3: Write the migration**

Create `apps/app/supabase/migrations/20260903000100_conversations.sql`:

```sql
-- Conversations and their messages.
--
-- Designed in the phase 2 spec (§8) and built now that a surface needs them.
-- Not redesigned here: the shapes below are that section's, with the
-- composite foreign keys the proposals table established afterwards.
--
-- These are the better-shaped descendant of the old `chat_messages` table,
-- which hung off `spaces` and recorded neither run nor cost.

create table conversations (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id   uuid not null references users(id) on delete cascade,
  agent_id   uuid not null,
  title      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite, as on proposals: pointing at agents(id) alone would let the
  -- owner of two projects open a conversation in one attributed to an agent
  -- in the other, and RLS would permit it because both rows are theirs.
  foreign key (agent_id, project_id) references agents(id, project_id) on delete cascade,

  -- One rolling conversation per (project, agent) in v1. The schema carries no
  -- opinion about that beyond this constraint, which is what makes
  -- getOrCreateConversation a single statement rather than a read-then-write
  -- race. Drop it when a conversation picker ships.
  unique (project_id, agent_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  owner_id        uuid not null references users(id) on delete cascade,

  -- Only the two roles the owner can see. A conversation row is the record of
  -- what passed between a person and an agent, not the model's context
  -- window: system prompts and tool traffic belong to agent_tool_calls and the
  -- run trace, where they are already recorded with their arguments.
  role            text not null check (role in ('user','assistant')),
  content         text not null,

  -- Which run produced an assistant turn. Null on user turns, and null on an
  -- assistant turn whose run row was deleted.
  run_id          uuid,
  created_at      timestamptz not null default now(),

  foreign key (run_id, project_id) references agent_runs(id, project_id) on delete set null
);

-- The transcript: one conversation, oldest first.
create index messages_conversation_idx on messages (conversation_id, created_at);
-- record_entry validates a citation against this conversation's user turns.
create index messages_role_idx on messages (conversation_id, role);
-- Every policy filters on owner_id; without these, RLS degrades to a scan.
create index conversations_owner_idx on conversations (owner_id);
create index messages_owner_idx on messages (owner_id);

-- agent_runs gains its link back. Added by alter table because agent_runs
-- predates conversations, which is the creation order the spec names.
alter table agent_runs
  add column conversation_id uuid references conversations(id) on delete set null;
create index agent_runs_conversation_idx on agent_runs (conversation_id, started_at);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Owner-only, no public branch: the same regime as the rest of the agent
-- layer. A published project publishes entries and documents; it must not
-- publish what its owner said to an agent in private.
--
-- Insert and update additionally require the row's project to belong to the
-- caller, so ownership cannot be forged by relocating a row into someone
-- else's project. Longhand on purpose — a policy that exists only as a format
-- string cannot be grepped for.
create policy conversations_select on conversations for select
  using (owner_id = auth.uid());
create policy conversations_insert on conversations for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = conversations.project_id and p.owner_id = auth.uid()));
create policy conversations_update on conversations for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = conversations.project_id and p.owner_id = auth.uid()));
create policy conversations_delete on conversations for delete
  using (owner_id = auth.uid());

create policy messages_select on messages for select
  using (owner_id = auth.uid());
create policy messages_insert on messages for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid())
    and exists (select 1 from conversations c where c.id = messages.conversation_id and c.owner_id = auth.uid()));
create policy messages_update on messages for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid()));
create policy messages_delete on messages for delete
  using (owner_id = auth.uid());

create or replace function public.touch_conversations_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_conversations_updated_at
  before update on conversations
  for each row execute function public.touch_conversations_updated_at();
```

- [ ] **Step 4: Apply and regenerate types**

Run: `pnpm db:reset`

Then regenerate `apps/app/types/supabase.ts`. There is **no `db:types` script** in `package.json` — the file has been regenerated by hand each time. Use the Supabase MCP `generate_typescript_types` tool, or:

```bash
npx supabase gen types typescript --local > apps/app/types/supabase.ts
```

Do not hand-edit the result: it is generated, and an edit is reverted by the next regeneration without anyone noticing. If `Tables<'conversations'>` does not resolve after this, the generation did not run — fix that rather than widening a type to compensate.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:rls -- -t "conversation isolation"`
Expected: PASS, all five.

- [ ] **Step 6: Commit**

```bash
git add apps/app/supabase/migrations/20260903000100_conversations.sql \
        apps/app/tests/rls/conversations-isolation.test.ts apps/app/types/supabase.ts
git commit -m "feat(chat): conversations and messages"
```

---

### Task 2: Conversation and message queries

**Files:**
- Create: `apps/app/lib/db/conversations.ts`
- Test: covered by Task 1's RLS suite plus Task 5's live check — see the note.

**Interfaces:**
- Produces:
  - `getOrCreateConversation(supabase, { projectId, ownerId, agentId }): Promise<Conversation>`
  - `listMessages(supabase, conversationId): Promise<Message[]>` — oldest first
  - `appendMessage(supabase, { conversationId, projectId, ownerId, role, content, runId? }): Promise<Message>`
  - `listUserMessageIds(supabase, conversationId): Promise<Set<string>>` — the set `record_entry` validates against in slice 2d-2

**Why no unit test:** every function is one PostgREST call. A unit test would assert against a stub of the client, which is a test of the stub. The RLS suite exercises the real table.

- [ ] **Step 1: Write the module**

Create `apps/app/lib/db/conversations.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type Conversation = Tables<'conversations'>;
export type Message = Omit<Tables<'messages'>, 'role'> & { role: 'user' | 'assistant' };

const MESSAGE_COLUMNS = 'id, conversation_id, project_id, owner_id, role, content, run_id, created_at';

/**
 * The project's one conversation with this agent, creating it if absent.
 *
 * Upsert rather than read-then-insert: `unique (project_id, agent_id)` makes
 * the race decidable in the database, and two tabs opening the resume view
 * together would otherwise create two conversations and show different
 * transcripts.
 */
export async function getOrCreateConversation(
  supabase: Client,
  params: { projectId: string; ownerId: string; agentId: string }
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { project_id: params.projectId, owner_id: params.ownerId, agent_id: params.agentId },
      { onConflict: 'project_id,agent_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** The transcript, oldest first — reading order, not the log's newest-first. */
export async function listMessages(supabase: Client, conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function appendMessage(
  supabase: Client,
  params: {
    conversationId: string;
    projectId: string;
    ownerId: string;
    role: 'user' | 'assistant';
    content: string;
    runId?: string | null;
  }
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      project_id: params.projectId,
      owner_id: params.ownerId,
      role: params.role,
      content: params.content,
      run_id: params.runId ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * The ids record_entry may cite.
 *
 * A set rather than a list: the only question asked of it is membership, and
 * the caller checks it once per cited id. Restricted to user turns here rather
 * than at the call site, so a caller cannot forget the half of the rule that
 * matters — an assistant turn is the agent's own words, and recording those as
 * the owner's is exactly what §6.1 forbids.
 */
export async function listUserMessageIds(
  supabase: Client,
  conversationId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('role', 'user');

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id));
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/lib/db/conversations.ts
git commit -m "feat(chat): conversation and message queries"
```

---

### Task 3: `ask_agent`, injected rather than imported

Delegation runs a second agent. The obvious implementation — importing `runTooled` into the handlers — closes a cycle: `handlers → tooled → executor → handlers`. So the executor is **injected into the run context** as `delegate`, which also makes this the first tool testable end to end without a model.

**Files:**
- Modify: `apps/app/lib/agents/tools/registry.ts`, `apps/app/lib/agents/tools/handlers/index.ts`, `apps/app/lib/agents/executor.ts`
- Test: `apps/app/tests/unit/agents-delegation.test.ts`

**Interfaces:**
- Consumes: `ToolContext` from `@/lib/agents/tools/handlers`.
- Produces:
  - `DelegateFn = (agentSlug: string, question: string) => Promise<{ ok: true; text: string } | { ok: false; message: string }>`
  - `ToolContext.delegate?: DelegateFn`
  - registry entry `ask_agent`
  - `DELEGATABLE` — the slugs `ask_agent` accepts

Slice 2d-3's chat route supplies `delegate` by closing over `runTooled`.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/agents-delegation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, REPO_READ } from '@/lib/agents/tools/registry';
import { SEEDED_TEMPLATES } from '@/lib/agents/templates';

const ctx = (delegate?: ToolContext['delegate']): ToolContext =>
  ({
    supabase: null as never,
    projectId: 'proj-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
    documentVersions: new Map<string, string>(),
    delegate,
  }) as ToolContext;

describe('ask_agent', () => {
  it('is a read in the registry sense: it proposes nothing itself', () => {
    // The sub-agent may well propose. ask_agent does not — it starts a run and
    // returns text. Filing it as a write would put it in WRITE_TOOLS and make
    // the Critic, which must write nothing, ineligible to ever hold it.
    expect(REGISTRY.ask_agent.writes).toBe(false);
    expect(REGISTRY.ask_agent.external).toBe(false);
  });

  it('is not part of repo-read', () => {
    // REPO_READ is granted to every seeded agent. Delegation is not a
    // capability everyone should have, and keeping it out of the group is what
    // makes nesting impossible.
    expect(REPO_READ).not.toContain('ask_agent');
  });

  it('refuses to call the Partner, closing the self-call', () => {
    // The allowlist alone permits it: the Partner holds ask_agent, so nothing
    // in the registry stops it naming itself and recursing.
    expect(REGISTRY.ask_agent.inputSchema.safeParse({
      agent_slug: 'partner',
      question: 'What should I do?',
    }).success).toBe(false);
  });

  it('accepts the three specialists', () => {
    for (const slug of ['critic', 'tutor', 'planner']) {
      const parsed = REGISTRY.ask_agent.inputSchema.safeParse({
        agent_slug: slug,
        question: 'x',
      });
      expect(parsed.success, slug).toBe(true);
    }
  });

  it('is held by the Partner and by nobody else', () => {
    // The property that makes nesting impossible: a delegated agent has no
    // ask_agent, so it cannot delegate onward.
    const holders = SEEDED_TEMPLATES.filter((t) => t.tools.includes('ask_agent')).map((t) => t.slug);
    expect(holders).toEqual(['partner']);
  });
});

describe('the ask_agent handler', () => {
  it('reports a refusal instead of throwing', async () => {
    // A delegated run refused for budget is not an error. The Partner is told
    // and says so; the conversation continues.
    const result = await HANDLERS.ask_agent(
      ctx(async () => ({ ok: false, message: 'Monthly cap of $10.00 reached.' })),
      { agent_slug: 'critic', question: 'Is this sound?' } as never
    );
    expect(String(JSON.stringify(result))).toContain('Monthly cap');
  });

  it('returns the sub-agent’s text on success', async () => {
    const result = await HANDLERS.ask_agent(
      ctx(async (slug, question) => ({ ok: true, text: `${slug} answered: ${question}` })),
      { agent_slug: 'planner', question: 'Break it down' } as never
    );
    expect(String(JSON.stringify(result))).toContain('planner answered: Break it down');
  });

  it('fails loudly when no delegate was supplied', async () => {
    // An agent holding ask_agent in a run that cannot delegate is a wiring
    // bug. Returning "sorry, cannot" would let it ship unnoticed.
    await expect(
      HANDLERS.ask_agent(ctx(undefined), { agent_slug: 'critic', question: 'x' } as never)
    ).rejects.toThrow(/delegate/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- tests/unit/agents-delegation.test.ts`
Expected: FAIL — `REGISTRY.ask_agent` is undefined.

- [ ] **Step 3: Add the registry entry**

In `apps/app/lib/agents/tools/registry.ts`, add `'ask_agent'` to the name list after `'read_entry'`, and the definition after `read_entry`:

```ts
  ask_agent: {
    name: 'ask_agent',
    description:
      'Ask one of this project’s specialist agents a question and return its answer. ' +
      'The agent runs under its own tools, not yours — if it proposes something, the proposal ' +
      'is its own and goes to the owner’s inbox. Say that you asked it, never that you did it.',
    inputSchema: z.object({
      agent_slug: z.enum(['critic', 'tutor', 'planner']),
      question: z.string().min(1).max(2_000),
    }),
    // The sub-agent may propose; this tool does not. Filing it as a write
    // would place it in WRITE_TOOLS and make the Critic — defined as writing
    // nothing — permanently ineligible to hold it.
    writes: false,
    external: false,
  },
```

`z.enum` is what makes the self-call test pass: `'partner'` is not a member, so a Partner naming itself fails validation before any handler runs. Do **not** widen this to `z.string()`.

Leave `REPO_READ` and `WRITE_TOOLS` unchanged — `ask_agent` belongs to neither group.

- [ ] **Step 4: Extend the context and add the handler**

In `apps/app/lib/agents/tools/handlers/index.ts`, add to the imports nothing new, and add to `ToolContext`:

```ts
export type DelegateFn = (
  agentSlug: string,
  question: string
) => Promise<{ ok: true; text: string } | { ok: false; message: string }>;
```

and inside `ToolContext`:

```ts
  /**
   * Runs another agent, under that agent's own allowlist.
   *
   * Injected rather than imported. `ask_agent` needs `runTooled`, and
   * importing it here would close the cycle handlers → tooled → executor →
   * handlers. Injection also makes delegation testable without a model, which
   * an import would not.
   *
   * Absent on runs that may not delegate. That is every run except the
   * Partner's, and a handler reached without it is a wiring bug rather than a
   * refusal — see the handler.
   */
  delegate?: DelegateFn;
```

Then the handler, beside the other reads:

```ts
  async ask_agent(ctx, args: { agent_slug: string; question: string }) {
    if (!ctx.delegate) {
      // Loud on purpose. An agent holding ask_agent in a run wired without a
      // delegate is a bug in the caller; answering "I cannot" would let it
      // ship looking like a model limitation.
      throw new Error(
        `ask_agent was called on run ${ctx.runId} with no delegate wired into the context.`
      );
    }

    const outcome = await ctx.delegate(args.agent_slug, args.question);

    // A refusal is data, not an exception. A delegated run stopped by the
    // monthly cap should leave the Partner able to say so and carry on.
    return outcome.ok
      ? { agent: args.agent_slug, answer: outcome.text }
      : { agent: args.agent_slug, refused: outcome.message };
  },
```

In `apps/app/lib/agents/executor.ts`, add `delegate` to `RunContext` so it reaches `buildToolSet`:

```ts
  /** See ToolContext.delegate. Present only on runs permitted to delegate. */
  delegate?: DelegateFn;
```

importing the type from the handlers module, which `executor.ts` already imports from.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- tests/unit/agents-delegation.test.ts`
Expected: the handler cases PASS; `is held by the Partner and by nobody else` still FAILS, because the Partner does not exist yet. That is Task 4.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/agents/tools/registry.ts \
        apps/app/lib/agents/tools/handlers/index.ts \
        apps/app/lib/agents/executor.ts \
        apps/app/tests/unit/agents-delegation.test.ts
git commit -m "feat(chat): ask_agent delegates through an injected executor"
```

---

### Task 4: The Partner template and its rates row

**Files:**
- Modify: `apps/app/lib/agents/templates.ts`, `apps/app/lib/agents/cost.ts`
- Test: `apps/app/tests/unit/agents-templates.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/app/tests/unit/agents-templates.test.ts`:

```ts
describe('the Partner', () => {
  it('reads the record, records what you said, and asks the specialists', () => {
    const partner = SEEDED_TEMPLATES.find((t) => t.slug === 'partner');
    expect(partner).toBeDefined();
    for (const name of REPO_READ) expect(partner!.tools).toContain(name);
    expect(partner!.tools).toContain('ask_agent');
  });

  it('holds no propose tool at all', () => {
    // The choice the roster rests on. A Partner that could draft entries, work
    // items and document edits would be a superset of the other three and make
    // their distinct allowlists distinguish nothing the owner can reach.
    const partner = SEEDED_TEMPLATES.find((t) => t.slug === 'partner')!;
    for (const name of partner.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes, name).toBe(false);
    }
  });

  it('runs on the cheap conversational model, and it is priced', () => {
    // Every turn of a conversation is a run, so this is the one template where
    // the model is a cost decision. An unpriced model reports every run as
    // free and silently disables the monthly cap.
    const partner = SEEDED_TEMPLATES.find((t) => t.slug === 'partner')!;
    expect(partner.model).toBe('zai/glm-5.3-flash');
    expect(Object.keys(RATES)).toContain(partner.model);
  });

  it('leaves the other templates on the default model', () => {
    for (const t of SEEDED_TEMPLATES.filter((t) => t.slug !== 'partner')) {
      expect(t.model, t.slug).toBe('openai/gpt-4o-mini');
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- -t "the Partner"`
Expected: FAIL — "expected undefined to be defined".

- [ ] **Step 3: Add the rates row**

In `apps/app/lib/agents/cost.ts`, inside `RATES`:

```ts
  // Read from the gateway, not a blog post: gateway.getAvailableModels()
  // reports pricing per model in dollars per token. The same call gives
  // openai/gpt-4o-mini as 0.15 / 0.60 / 0.075, matching the row above, which
  // is what confirms these units.
  'zai/glm-5.3-flash': { inputPerMTok: 0.15, outputPerMTok: 0.5, cachedInputPerMTok: 0.03 },
```

- [ ] **Step 4: Add the template**

Append to `SEEDED_TEMPLATES` in `apps/app/lib/agents/templates.ts`:

```ts
  {
    slug: 'partner',
    name: 'Partner',
    role_description:
      'Answers from the record, writes down what you tell it, and asks the other agents on your behalf.',
    system_prompt: [
      'You are the owner’s working partner on this one long project. You answer',
      'from its record and from nothing else. When you do not know, say what you',
      'would need to look at.',
      '',
      'You cannot create work items, documents, or drafts. When the owner wants',
      'one, ask the agent whose job it is — the Critic to argue with a decision,',
      'the Planner to break work down, the Tutor to draft — and report what came',
      'back. Say that you asked it, never that you did it. What that agent',
      'proposes is its own, and goes to the owner’s inbox for a decision.',
      '',
      'You can write down what the owner tells you, and only that. record_entry',
      'takes their own words; you choose the kind and the title, never the',
      'substance. Do not record your own summaries, inferences or conclusions —',
      'a record of what a model thought the owner meant is worse than no record,',
      'because in a month neither of you can tell which is which.',
      '',
      'Never ask who else is involved: this is one person’s own project. Do not',
      'welcome them, congratulate them, or remark that the project is',
      'interesting. Be plain, specific and unsentimental.',
    ].join('\n'),
    // record_entry arrives in slice 2d-2. Seeding it now would name a tool the
    // registry does not hold, which the "every tool exists" test refuses.
    tools: [...REPO_READ, 'ask_agent'],
    model: 'zai/glm-5.3-flash',
  },
```

- [ ] **Step 5: Run the whole suite**

Run: `pnpm test`
Expected: PASS. `agents-delegation.test.ts`'s "held by the Partner and by nobody else" now passes too.

Run: `pnpm typecheck` (from the repository root)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/agents/templates.ts apps/app/lib/agents/cost.ts \
        apps/app/tests/unit/agents-templates.test.ts
git commit -m "feat(chat): seed the Partner, which proposes nothing itself"
```

---

## Deferred to later slices

- **Live delegation, run end to end.** The structural claims are covered by
  Task 3 and Task 4; what is not covered is two real runs against a real
  gateway. There is no caller in this slice — no UI, and a bespoke smoke
  script would need an authenticated session it has no way to obtain, since
  `start_agent_run` is `security invoker` and reads `auth.uid()`. So this moves
  to 2d-3, where the chat route drives it. Named rather than dropped: the
  intake work found four defects live that no unit test reached, and the same
  will be true here.
- **`record_entry`** and its source validation — slice 2d-2. The Partner's prompt already describes it, and the tool is deliberately not in its allowlist until it exists.
- **The chat route, transcript and composer** — slice 2d-3, which opens with the Tailwind 3 spike (spec §15).
- **A conversation picker.** `unique (project_id, agent_id)` enforces one thread per agent per project; dropping that constraint is the first step when a picker is wanted.
- **In-conversation spend signal.** Spec §15 — a thread's cost is unbounded where the intake's was two runs.

## Done when

- `pnpm test`, `pnpm typecheck` and `pnpm test:rls` all pass.
- `ask_agent` is held by the Partner and no other template, and rejects `agent_slug: 'partner'` at the schema.
- Every tool in the Partner's allowlist has `writes: false`.
- A live delegation is **not** a criterion for this slice — see Deferred.

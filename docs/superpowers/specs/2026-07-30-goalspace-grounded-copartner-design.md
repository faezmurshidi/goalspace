# Goalspace Phase 2 — Grounded Co-partner

**Date:** 2026-07-30
**Status:** Approved design, ready for implementation planning
**Depends on:** `2026-07-30-goalspace-repository-core-design.md` (phase 1)
**Scope:** Phase 2 of 5. Private, single-user. Agents propose; the owner approves.

---

## 1. Premise

Phase 1 makes a long project's record accumulate. Phase 2 makes that record
*answerable*.

The differentiating question is not "write me a study plan" — any chat product
does that free. It is:

> **"Why did I abandon that approach in month two?"**

You cannot phrase that query well, because you have forgotten the answer. No
general tool can answer it, because none of them hold your record. Goalspace
can, because phase 1 built exactly that.

Two constraints shape everything below, both chosen deliberately during design:

**Agents propose; they never write.** A co-partner that writes directly can
quietly pollute the record phase 1 exists to protect — and in phase 5 it would
be doing so while spending strangers' money. Every mutation an agent wants
becomes a proposal the owner accepts or rejects.

**Agents are capability boundaries, not personas.** A Critic that emits a
`web_search` call cannot execute one, because the tool set handed to the model
is intersected server-side with the agent's allowlist. This is what keeps
"specialisation" from being cosmetic, and it is what will make phase-5 credit
spending auditable: *this credit funded a web-search run, not an idle chat.*

---

## 2. Scope and non-goals

### In scope

Retrieval over the project repository; agent definitions with enforced
toolsets; the proposal and approval layer; conversation and inline invocation
surfaces; run tracking, cost metering, and spend caps; seeded agent templates;
web search; audio generation.

### Non-goals

| Non-goal | Rationale |
|---|---|
| Scheduled or proactive runs | Agency was capped at approve-first during design. Proactivity needs background jobs, spend caps under autonomy, and a kill switch — a phase of its own if ever. |
| Unsolicited proposals | An agent that volunteers turns the inbox into noise, which is the failure mode that kills this design. Proposals only follow an explicit ask. |
| Agent-to-agent orchestration | Agents do not call each other. One run, one agent. |
| Memory outside the repo | The repository *is* the memory. No separate long-term store, no fine-tuning. |
| Anything public | Phases 3–5. |
| Credits or payments | Phase 5. Phase 2 ships the metering it will need. |
| Streaming multi-modal input | Text and file attachments only. |

---

## 3. Success criteria

1. Asking *"why did I abandon X?"* over a real project returns an answer citing
   the actual entries it drew on, and the citations resolve to real rows.
2. An agent whose allowlist omits a tool cannot invoke that tool, even when the
   model emits the call — proven by test, not by prompt instruction.
3. Every accepted proposal produces a real row with `agent_id` set; accepted
   document edits also produce a `document_revisions` row.
4. Every run produces a cost row; project-to-date spend is visible; exceeding
   the cap stops runs with a clear UI state rather than silently overspending.
5. Quick-capture latency is unchanged from phase 1 — embedding work never
   blocks a write.

---

## 4. Retrieval

### 4.1 Skeleton first, tools second

The reflex design is "embed everything, vector search, stuff the top *k* into
context." That is the wrong shape here, because **a single project is small** —
hundreds of entries, dozens of work items, a handful of documents.

Every run therefore opens with a **project skeleton**: the work-item tree with
statuses, all `decision` entry titles, and open questions. A few thousand
tokens that give the agent *orientation* rather than disconnected fragments.

Detail is then pulled through **tools**, iteratively, as the agent decides what
it needs. This beats one-shot retrieval precisely for the motivating question:
when you cannot phrase the query, a single similarity search over your bad
phrasing fails, whereas an agent that can read the decision list, spot the
candidate, and then pull that entry's neighbours succeeds.

Vector search survives as one tool among several, not as the pipeline.

### 4.2 Embeddings

```sql
create table embeddings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  source_type text not null check (source_type in ('entry','document','work_item')),
  source_id   uuid not null,
  chunk_index integer not null default 0,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);
create index on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

Model: `openai/text-embedding-3-small` via AI Gateway, 1536 dimensions.
Entries and work items embed whole — they are short. Documents chunk at ~800
tokens with ~100 token overlap. Phase-1 rows are backfilled on deploy, which is
why deferring embeddings out of phase 1 cost nothing.

### 4.3 Keeping embeddings fresh without slowing capture

Success criterion 5 forbids embedding inline on write — quick capture is the
highest-frequency interaction in the product and must not wait on an API call.

A Postgres trigger on insert/update of `entries`, `documents`, and `work_items`
writes to an `embedding_jobs` table (`source_type`, `source_id`, `enqueued_at`,
`attempts`, `last_error`). A Vercel cron drains the queue each minute in
batches. Jobs are idempotent — re-embedding overwrites by the unique key — so
at-least-once delivery is safe. Queue depth and oldest-job age are surfaced on
the project settings page, because silent embedding lag degrades answers in a
way that is otherwise invisible.

### 4.4 Search implementation

`search_repo` is hybrid: pgvector cosine similarity unioned with Postgres
full-text search over the same content, merged by reciprocal rank fusion.
Vector search alone misses exact identifiers (part numbers, HSK levels, library
names) that matter constantly in build and learning projects; full-text alone
misses the paraphrase case that motivates the whole feature.

---

## 5. Agents

### 5.1 Schema

```sql
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
  unique (project_id, slug)
);
```

The phase-2 migration also adds the deferred foreign keys from phase 1:
`entries.agent_id`, `work_items.agent_id`, and `documents.agent_id` each gain
`references agents(id) on delete set null`.

### 5.2 Tool registry

Tools live in a server-side registry (`lib/agents/tools/registry.ts`), each
entry declaring its schema, handler, and two flags: `writes` (emits a proposal
rather than mutating) and `external` (leaves the system boundary).

Tools fall into three named groups. **"Repo-read" never includes `web_search`** —
that distinction matters, because several agents are defined as repo-read-only
and must not reach outside the system.

| Tool | Group | Notes |
|---|---|---|
| `search_repo` | repo-read | hybrid vector + full-text, scoped to the project |
| `list_entries` | repo-read | filter by kind, work item, date range |
| `get_work_item` | repo-read | optionally with descendants |
| `list_work_items` | repo-read | filter by status, parent |
| `read_document` | repo-read | current body |
| `web_search` | external-read | see §5.4 |
| `propose_entry` | write | |
| `propose_work_item` | write | |
| `propose_document_edit` | write | |
| `generate_audio` | write, external | produces an attachment on a proposed entry |

### 5.3 Enforcement

At run start the executor computes `registry ∩ agent.tools` and passes only
that set to the model. A call to anything outside the set is rejected by the
executor and recorded as a failed tool call — it never reaches a handler. The
allowlist is never sent from or influenced by the client.

Read tools are scoped to `agent.project_id` inside the handler, not by prompt
instruction, so an agent cannot read another project even if asked to.

### 5.4 Web search, and what it costs in privacy

`web_search` is the only tool that leaves the system, and it sits in tension
with a product whose promise is privacy. An agent composing a query from your
private notes sends a fragment of those notes to a third party.

Mitigations, all required:

- Every `web_search` call's exact query string is stored in `agent_tool_calls`
  and rendered in the run trace, so what left is always inspectable.
- Only agents whose allowlist includes it can search — the seeded Tutor and
  Critic do not have it.
- The project settings page carries a plain-language statement that this tool
  sends queries to an external provider.

Implementation sits behind a `WebSearchProvider` interface with Exa as the
shipped implementation, so the provider is swappable without touching the
executor.

### 5.5 Seeded templates

Three templates are seeded per new project, all editable and deletable, and
users can author their own:

| Template | Tools | Purpose |
|---|---|---|
| **Tutor** | repo-read, `propose_entry`, `propose_document_edit`, `generate_audio` | Explains, drills, and turns your own notes into study material. The successor to generated module content. |
| **Researcher** | repo-read, `web_search`, `propose_entry`, `propose_work_item` | Investigates open questions, brings back cited findings. |
| **Critic** | repo-read only | Reviews decisions and plans, argues with you, writes nothing and reaches nowhere. |

Templates are worth shipping because they teach the model of the product: the
Critic having *no* write tools is the clearest possible demonstration that
tools are a real boundary.

---

## 6. Proposals and approval

### 6.1 Schema

```sql
create table proposals (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid not null references agents(id) on delete cascade,
  run_id      uuid not null references agent_runs(id) on delete cascade,
  kind        text not null check (kind in ('entry','work_item','document_edit')),
  target_id   uuid,
  payload     jsonb not null,
  rationale   text not null,
  citations   jsonb not null default '[]',
  status      text not null default 'pending'
              check (status in ('pending','accepted','rejected','superseded')),
  applied_id  uuid,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
```

`target_id` is the document being edited; `applied_id` is the row created or
updated on acceptance.

### 6.2 Apply semantics

Accepting validates `payload` against the same zod schema the human forms use —
there is exactly one validation path — then inserts or updates the real row with
`agent_id` set to the proposing agent. Accepting a `document_edit` writes a
`document_revisions` row first, so **the phase-1 revision system already gives
every agent edit an undo path**; this is the first phase-1 decision to pay for
itself unprompted.

The owner may edit a proposal before accepting; the edited payload is what
applies, and the proposal records that it was modified.

Proposals whose target changed since generation become `superseded` rather than
applying stale content over newer work.

### 6.3 Citations must resolve

`citations` holds the entry, work-item, and document ids the agent drew on.
**Before a proposal is stored, the server validates that every cited id exists
and belongs to the project**, rejecting the tool call otherwise. A model that
invents a citation gets an error and a retry, rather than producing a
plausible-looking proposal that cites nothing. Fabricated provenance would be
worse than no provenance, because it is trusted.

### 6.4 The inbox, and a payoff

Review lives at `/projects/[slug]/inbox`: pending proposals with rationale,
resolved citations, and accept / edit-and-accept / reject.

This is **the same inbox phase 4 needs** for outside contributions. Building it
here means phase 4 becomes "add a second source of proposals" rather than a new
subsystem — outside suggestions arrive as proposal rows with a contributor
instead of an agent as the author.

---

## 7. Runs, metering, and caps

```sql
create table agent_runs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  owner_id        uuid not null references users(id) on delete cascade,
  agent_id        uuid not null references agents(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  work_item_id    uuid references work_items(id) on delete set null,
  trigger         text not null check (trigger in ('conversation','work_item_action')),
  status          text not null check (status in ('running','succeeded','failed','cancelled','capped')),
  step_count      integer not null default 0,
  error           text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create table agent_tool_calls (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references agent_runs(id) on delete cascade,
  project_id     uuid not null references projects(id) on delete cascade,
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
  monthly_cap_usd   numeric(10,2),
  per_run_token_cap integer not null default 200000,
  updated_at        timestamptz not null default now()
);
```

`agent_runs.work_item_id` is set by the inline "ask about this item" path, and
**that field is precisely what phase 5 funds.** Recording it now is why phase 5
does not require re-plumbing attribution.

Caps are checked before a run starts and re-checked after each step; a run that
trips either cap terminates with status `capped`, keeps whatever proposals it
already produced, and surfaces a clear UI state. Runs also carry a hard step
limit, since an agentic retrieval loop with a stuck model is the realistic way
to burn a budget.

Model access is via AI SDK v6 through Vercel AI Gateway using
`"provider/model"` strings, defaulting to `anthropic/claude-sonnet-5`. Cost is
computed from gateway-reported token counts against a rate table keyed by model
string.

---

## 8. Surfaces

```
app/[locale]/(workspace)/projects/[slug]/ask/          conversations
app/[locale]/(workspace)/projects/[slug]/ask/[convId]/ one conversation
app/[locale]/(workspace)/projects/[slug]/inbox/        proposal review
app/[locale]/(workspace)/projects/[slug]/agents/       agent list and editor
app/[locale]/(workspace)/projects/[slug]/runs/[runId]/ run trace
```

Plus an inline "ask an agent about this" affordance on any work item, which
opens a conversation pre-scoped to that item and sets `work_item_id`.

Conversations persist:

```sql
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id   uuid not null references users(id) on delete cascade,
  agent_id   uuid not null references agents(id) on delete cascade,
  title      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  owner_id        uuid not null references users(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  run_id          uuid references agent_runs(id) on delete set null,
  created_at      timestamptz not null default now()
);
```

**Creation order**, since these tables reference each other: `agents` →
`conversations` → `agent_runs` → `messages` → `agent_tool_calls` → `proposals`.
`conversations.id` is referenced by `agent_runs`, so that one foreign key is
added by `alter table` after both exist. `proposals.applied_id` carries no
foreign key — its target varies by `kind`.

These are the better-shaped descendant of the old `chat_messages` table, which
hung off `spaces` and stored no run or cost linkage.

The run trace at `/runs/[runId]` renders steps, tool calls with arguments,
proposals produced, and cost — it is both the debugging surface and the privacy
surface (§5.4).

### 8.1 Audio

`generate_audio` is the podcast's successor: it composes a script from the
project's own entries and documents, synthesises via ElevenLabs
`eleven_multilingual_v2`, stores the file in the phase-1 `attachments` bucket,
and attaches it to a **proposed** entry. Approval-gated like every other write,
persisted rather than streamed to `/dev/null`, and multilingual — which fixes
the defect that made the old English-only implementation useless for the
Mandarin case that motivated keeping it.

---

## 9. Modules and boundaries

| Module | Responsibility | Depends on |
|---|---|---|
| `lib/agents/skeleton.ts` | project rows → skeleton context string | nothing (pure) |
| `lib/agents/tools/registry.ts` | tool definitions, schemas, flags | zod |
| `lib/agents/tools/handlers/*.ts` | one handler per tool, project-scoped | db |
| `lib/agents/executor.ts` | allowlist intersection, step loop, cap checks, run + tool-call recording | registry, db, gateway |
| `lib/agents/cost.ts` | tokens + model → `cost_usd` | rate table (pure) |
| `lib/proposals/apply.ts` | validate, apply, set provenance, write revision | phase-1 schemas, db |
| `lib/retrieval/search.ts` | hybrid search + reciprocal rank fusion | db |
| `lib/retrieval/chunk.ts` | document chunking | nothing (pure) |
| `lib/embeddings/queue.ts` | drain jobs, embed, upsert | db, gateway |

`skeleton.ts`, `cost.ts`, `chunk.ts`, and the rank fusion in `search.ts` are
pure functions over plain data, so the parts most likely to be subtly wrong are
unit-testable without a database or a model.

---

## 10. Error handling

- **Model or gateway failure** — run ends `failed` with the error recorded;
  partial proposals are kept, since a half-finished run may still have produced
  something useful.
- **Tool handler failure** — recorded as a failed tool call, returned to the
  model as an error result so it can adapt rather than aborting the run.
- **Disallowed tool call** — rejected by the executor, recorded, returned to
  the model as an error.
- **Invalid citation** — tool call rejected before the proposal is stored
  (§6.3).
- **Cap tripped** — run ends `capped`, proposals retained, UI states which cap.
- **Embedding job failure** — `attempts` incremented with `last_error`; retried
  with backoff; jobs exceeding attempts surface on project settings rather than
  failing silently.
- **Stale proposal** — marked `superseded` at apply time, never applied over
  newer content.

---

## 11. Testing

**Tool allowlist enforcement (highest value).** The security property of this
phase is that capabilities are enforced rather than requested. Tests drive the
executor with a stubbed model that emits calls to tools outside the allowlist —
including `web_search` from a Critic — and assert the handler is never reached
and the run records a rejection. Prompt-level instruction is not a control and
is not tested as one.

**Proposal application.** Accept, reject, edit-then-accept, and supersede paths;
provenance (`agent_id` set on the applied row); document edits creating a
`document_revisions` row; citation validation rejecting fabricated ids.

**RLS.** Same two-user isolation regime as phase 1, extended across `agents`,
`conversations`, `messages`, `agent_runs`, `agent_tool_calls`, `proposals`,
`embeddings`, `ai_usage`, and `project_budgets`.

**Retrieval evaluation.** A seeded project with a known corpus and ~15 golden
questions — including the motivating *"why did I abandon X"* shape — asserting
that expected source ids appear in the citations. Run against a real model, kept
small enough to be cheap, and treated as a regression gate on prompt and
skeleton changes rather than a leaderboard.

**Cost and caps.** Usage rows written per run; per-run token cap terminates a
run mid-flight; monthly cap blocks run start; `cost.ts` unit-tested against the
rate table.

**Capture latency.** Asserts that creating an entry performs no embedding work
inline, enforcing success criterion 5.

---

## 12. Risks

| Risk | Response |
|---|---|
| Agentic retrieval loop burns budget | Hard step limit, per-run token cap, monthly cap, all enforced in the executor |
| Fabricated citations make provenance untrustworthy | Server-side validation before a proposal is stored (§6.3) |
| Proposal fatigue turns the inbox into noise | No unsolicited proposals; agents act only when asked |
| `web_search` leaks private notes to a third party | Queries stored and rendered in the run trace; tool withheld from Tutor and Critic; disclosure in settings |
| Embedding lag silently degrades answers | Queue depth and oldest-job age surfaced in project settings |
| Skeleton grows past a usable size on very large projects | Skeleton is truncated by recency with a stated budget; the tools exist precisely so truncation is recoverable |
| Gateway model deprecation | Model stored per agent as a gateway string; rate table and defaults are configuration, not code changes |

---

## 13. Amendment to phase 1

Recorded here and applied to the phase-1 spec: `entries`, `work_items`, and
`documents` each gain a nullable `agent_id`, always null in phase 1, with the
foreign key to `agents` added by the phase-2 migration. Null means
human-authored.

---

## 14. Open decisions deferred to the plan

None. Implementation ordering, task decomposition, and estimates belong to the
implementation plan.

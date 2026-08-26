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
- Every result the provider returns is stored too — `url`, `title`, and
  `snippet` per hit, in a structured `results` column rather than the free-text
  `result_summary`. This serves two purposes at once. The trace shows both
  directions of the exchange, not only the outbound half, so "what did this
  agent actually see" is answerable. And it is the record that external
  citations are validated against (§6.3): without it, a cited URL could not be
  distinguished from an invented one.
- **Snippets are stored, truncated to 500 characters.** They are what the agent
  actually read — the title alone says which page was cited, not what was taken
  from it. This is what makes §6.3's stated limit survivable: the server cannot
  establish that a page supports a claim, but a person reviewing the proposal
  can, and the snippet is what they need to do it. It is also a point-in-time
  record, which matters because a URL cited a year ago may by then be dead or
  rewritten. The cap is specified rather than left to whatever the provider
  returns, so the size of a trace is bounded by this document.
- **Snippets render as plain text, never through the markdown renderer.** A page
  controls the text of its own snippet, so this is attacker-influenced content
  arriving in the owner's trace UI; passing it through a renderer would let a
  crafted result inject links or markup into a surface the owner is using to
  audit. The same property makes snippets worth storing for a second reason: a
  result can carry prompt-injection text aimed at the agent, and a stored
  snippet is what turns that from invisible into auditable after the fact.
- Note the direction of travel. The privacy risk this section is about is
  outbound — a fragment of private notes reaching a third party. Snippets move
  the other way: they are the provider's content arriving, not the owner's
  leaving, and they add nothing to that risk.
- Only agents whose allowlist includes it can search — the seeded Tutor and
  Critic do not have it.
- The project settings page carries a plain-language statement that this tool
  sends queries to an external provider, and that results are retained in the
  run trace.

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
  -- Internal ids and, once `web_search` ships, external URLs. Both validated
  -- before this row is written, by different means (§6.3).
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

`citations` holds what the agent drew on. **Before a proposal is stored, the
server validates every citation, rejecting the tool call otherwise.** A model
that invents a citation gets an error and a retry, rather than producing a
plausible-looking proposal that cites nothing. Fabricated provenance would be
worse than no provenance, because it is trusted.

There are two classes, and they are validated differently because they can be.

**Internal.** An entry, work-item, or document id. Validated by existence: the
row must exist and belong to this project. This is the whole check, and it is
airtight.

**External.** A URL, reachable only by an agent whose allowlist includes
`web_search`. It cannot be validated by existence — the server would have to
fetch and read the page, and even then could not confirm the page supports the
claim. It is validated against the system's own record instead: **the URL must
appear in a `web_search` result logged for the same run** (§5.4). The agent may
therefore only cite pages the provider actually returned to it. This trusts
neither the model nor the network, only the log.

```ts
type Citation =
  | { type: 'entry' | 'work_item' | 'document'; id: string }
  | {
      type: 'external';
      url: string;
      title: string;
      // The snippet as it was at retrieval, already truncated (§5.4). Carried
      // on the citation rather than joined from the tool call, for the same
      // reason as url and title: a citation must stay self-describing. The
      // inbox needs it to render, and a proposal reviewed long after its run —
      // or after traces have been pruned — must not degrade to a bare link.
      snippet: string;
      retrieved_at: string;
      // The `agent_tool_calls` row this URL came back in. Kept for audit, so
      // the citation can always be traced back to the search that produced it.
      tool_call_id: string;
    };
```

URLs are normalised before comparison — scheme and host lower-cased, fragment
and common tracking parameters stripped. Without this a model that echoes back
a `?utm_source=` variant of the URL it was given fails validation for no reason
a person would recognise as real.

Validation happens once, at propose time, while the run is still open and its
tool calls certainly exist. After that a stored citation is trusted, exactly as
an internal one is — the guarantee is "this resolved at least once", not "this
is re-checked on every read".

**What this proves, stated exactly.** That the URL was returned by a search this
system logged. It does **not** prove the page says what the agent claims about
it, and no server-side check can establish that. The distinction matters enough
to appear in the inbox's own wording: the paragraph above is the argument for
why overstated provenance is worse than none, and it applies to this feature as
readily as to a fabricated id.

The check the server cannot make, a person can. That is why the stored snippet
(§5.4) is part of this design rather than an optional extra: it is the evidence
the owner needs to judge whether a claim follows from its source, and it is
shown with the citation for exactly that reason. The system's job here is to
guarantee the source is real and put what it said in front of the reader — not
to pretend it has evaluated the argument.

### 6.4 The inbox, and a payoff

Review lives at `/projects/[slug]/inbox`: pending proposals with rationale,
resolved citations, and accept / edit-and-accept / reject.

Internal and external citations render as visibly separate groups. A page the
model picked out of search results and a note the owner wrote themselves carry
very different authority, and a card that renders them alike invites the reader
to extend the trust owed to the second to the first.

External rows show the **hostname explicitly**, alongside the title rather than
behind it, and link with `rel="noopener noreferrer nofollow"`. This is the only
place in the product where a link's destination was chosen by a model rather
than by the owner, so a misleading title must not be able to disguise where a
click goes.

Each external row also carries the stored snippet, rendered **as plain text**
(§5.4). Deciding whether to accept a proposal means deciding whether its sources
support it, and that judgement cannot be made from a URL alone. Putting the
snippet on the card is what makes accept-or-reject an informed act rather than a
vote of confidence in the agent.

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
  -- Structured results, for `web_search` only: `[{url, title, snippet}]`, the
  -- snippet truncated to 500 chars (§5.4). `result_summary` stays free text for
  -- every other tool; this column exists because external citations are
  -- validated against it (§6.3), which free text cannot support.
  results        jsonb,
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
| `lib/proposals/citations.ts` | resolve internal ids; match external URLs against the run's logged search results | db (`agent_tool_calls`) |
| `lib/proposals/normalise-url.ts` | canonical form for URL comparison | nothing (pure) |
| `lib/retrieval/search.ts` | hybrid search + reciprocal rank fusion | db |
| `lib/retrieval/chunk.ts` | document chunking | nothing (pure) |
| `lib/embeddings/queue.ts` | drain jobs, embed, upsert | db, gateway |

`skeleton.ts`, `cost.ts`, `chunk.ts`, `normalise-url.ts`, and the rank fusion in
`search.ts` are pure functions over plain data, so the parts most likely to be
subtly wrong are unit-testable without a database or a model. URL normalisation
is split out for exactly that reason: it decides whether a citation validates,
and its edge cases are cheap to enumerate as a table and expensive to discover
in a run.

Note the dependency `citations.ts` gains. Validating an external citation means
reading `agent_tool_calls`, so proposal validation now depends on the run
record. That is the intended direction — the run log is the evidence — but it
means a proposal cannot be validated outside the context of the run that
produced it.

---

## 10. Error handling

- **Model or gateway failure** — run ends `failed` with the error recorded;
  partial proposals are kept, since a half-finished run may still have produced
  something useful.
- **Tool handler failure** — recorded as a failed tool call, returned to the
  model as an error result so it can adapt rather than aborting the run.
- **Disallowed tool call** — rejected by the executor, recorded, returned to
  the model as an error.
- **Invalid citation** — tool call rejected before the proposal is stored. An
  internal id that does not resolve, or an external URL absent from this run's
  logged search results, are the same class of failure and get the same
  treatment: an error the model can act on, and a retry
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

**External citation validation.** The case that matters is the adversarial one:
a stubbed model that emits a well-formed, plausible URL which no logged
`web_search` result contains, asserted to be rejected — because a URL that
merely looks right is exactly what a model produces when it is guessing. Also
covered: a URL that differs from the logged one only by tracking parameters or
letter case is accepted, so normalisation is pinned by test rather than by
intention; and an agent without `web_search` on its allowlist cannot register an
external citation at all, since it can have no search results to cite.

**Snippet rendering.** A stored snippet containing markdown and HTML — a link, an
image tag, a script tag — is asserted to reach the trace and the inbox as
literal text. This is the one place the product renders content chosen by a
third party rather than by the owner, and the assertion is that it is never
treated as markup.

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
| Fabricated citations make provenance untrustworthy | Server-side validation before a proposal is stored: internal ids by existence, external URLs against the run's own logged search results (§6.3) |
| An external citation reads as stronger evidence than it is | The check proves the URL was returned by a logged search, not that the page supports the claim; the inbox groups external citations separately, says so, and shows the stored snippet so the owner can make the judgement the server cannot (§6.3, §6.4) |
| A crafted search result injects markup into the trace or inbox | Snippets are attacker-influenced text and render as plain text only, never through the markdown renderer (§5.4) |
| A search result carries prompt-injection text aimed at the agent | Not preventable at this layer, but storing snippets makes it auditable after the fact rather than invisible (§5.4) |
| A model-chosen link in the inbox misleads the reader | Hostname shown explicitly, `rel="noopener noreferrer nofollow"` (§6.4) |
| Proposal fatigue turns the inbox into noise | No unsolicited proposals; agents act only when asked |
| `web_search` leaks private notes to a third party | Queries **and results** stored and rendered in the run trace; tool withheld from Tutor and Critic; disclosure in settings (§5.4) |
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

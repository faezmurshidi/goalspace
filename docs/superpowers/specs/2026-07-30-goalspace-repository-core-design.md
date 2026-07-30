# Goalspace Phase 1 — Repository Core

**Date:** 2026-07-30
**Status:** Approved design, ready for implementation planning
**Scope:** Phase 1 of 5. Private single-user workspace. No AI.

---

## 1. Why revive, and what changes

Goalspace was built in early 2024 around a premise that no longer holds: *an AI
assistant analyses your goal, breaks it into learning spaces, assigns each a
mentor, and generates modules.* Every part of that is now available free in any
chat product. The generation itself is not a product.

The revived premise is different:

> **The enemy in a long hard project is re-entry cost.**

Step away for three weeks and you lose where you were, what you had decided,
what you were blocked on, and why you abandoned the approach that looked
promising in month two. Every general tool fails at exactly this point: Notion
rots into a graveyard, Linear only knows open tickets, chat threads have no
memory across sessions.

Goalspace's job is not to plan your goal. It is to **make coming back cheap.**

Four consequences follow, and they define the product:

1. The workspace is what you use daily; the durable record accrues as a
   by-product, because nobody maintains a journal deliberately for two years.
2. The AI's power comes from knowing *your* repository — recall and synthesis
   over your own decisions and dead ends, not generic generation. (Phase 2.)
3. A public project is worth reading because that record already exists.
   (Phase 3.)
4. Funding is denominated in **compute, not cash** — see §2.

### Target project types

Build, learn, and research projects. Explicitly *not* habit or life-campaign
goals (fitness streaks, debt payoff); those want adherence tracking, which is a
different product and would drag the model toward streaks and reminders.

---

## 2. Roadmap context

Phase 1 is the substrate. It is specified alone, but the sequence it serves
must be visible, because the dependency chain is strict: **nobody contributes
to a repository nobody reads, and nobody reads a repository that is not worth
reading.**

| Phase | Content |
|---|---|
| **1 (this spec)** | Repository core: projects, log, work items, docs, resume view. Private. |
| 2 | Grounded co-partner: retrieval over your own repo, per-project specialised agents, AI spend metering. |
| 3 | Public projects: visibility, public read view, discovery, graph view. Also the home for inbound connectors (§5.8) and markdown export. |
| 4 | Contribution inbox: outside suggestions and advice threads, owner triage. |
| 5 | Compute sponsorship: contributors fund AI credits scoped to a specific work item. |

Phase 5 is the reason several phase-1 decisions look over-built. Compute-
denominated sponsorship avoids the problems that make cash sponsorship
intractable — payouts, tax, refunds, and the unanswerable "did they really spend
it on the goal?" Credits can only be burned by an agent run inside the project,
so escrow enforces itself, and because funded work is necessarily public, the
funder receives the answer. It is crowdfunded research, not charity, and it lets
people with expertise but no budget run serious agent work.

**The only phase-1 obligations this creates:** work items must be first-class
objects, and every row must carry `project_id` so per-project and per-item cost
attribution is possible later. Metering itself ships in phase 2 alongside the
first agent — phase 1 has no AI, so an `ai_usage` table now would be pure
speculation.

---

## 3. Non-goals

Named explicitly so they do not creep back in during implementation.

| Non-goal | Rationale |
|---|---|
| Any AI feature | Phase 2. All AI dependencies are removed in phase 1. |
| Public visibility in the UI | Phase 3. The column and RLS ship now (§5.6); the toggle does not. |
| BOM / parts / cost tracking | The first thing a real build user will request. A markdown table in a document covers it. A parts system is a product of its own. |
| Cross-item dependency graph | `parent_id` is a tree; "frame blocked until battery dimensions fix" is a DAG edge. `blocked` status plus prose naming the dependency covers ~90%. Dependency graphs eat months. |
| Document diff UI | Revisions are *recorded* in phase 1 (§5.4) because unrecorded history is unrecoverable. Rendering diffs is not needed to record them. |
| Multi-user collaboration | Owner is sole author, by design. Outside input arrives as suggestions in phase 4, never as co-authorship. This removes all merge, diff, and conflict machinery. |
| Git-backed storage | Considered and rejected — see §5.8. |
| Per-entry visibility | Visibility is per-project. Considered for phase 1 and deferred — see §5.9. |
| Real-time / presence | Single-user product. |
| Mobile app | Responsive web only. |

---

## 4. Success criteria

Phase 1 is done when, on a real project of the author's:

1. Capturing a note, decision, source, or session takes one keystroke to reach
   and one to submit, from anywhere in the project.
2. Returning after ≥2 weeks, the project home answers *what is open, what I last
   did, what I already decided* without navigation.
3. A work item closed today shows the entry that closed it, permanently.
4. Progress on any subtree is derived from the tree, and never stale.
5. A second user cannot read or write any row of the first user's project —
   proven by tests, not inspection.

---

## 5. Data model

Nothing is in production — no users, no data, no deployment worth preserving.
All existing tables are dropped. No migration path is written.

### 5.1 Objects

Four objects carry the phase, plus two supporting tables.

```
projects          the repository
entries           the log — what happened. Append-oriented.
work_items        what is next. Mutable. Nested. The phase-5 funding target.
documents         living artifacts — the spec, the reading list, the plan
document_revisions   append-only snapshots of documents
attachments       files bound to an entry or a document
```

### 5.2 Schema

```sql
create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  slug        text not null,
  title       text not null,
  brief       text,
  kind        text not null check (kind in ('build','learn','research')),
  visibility  text not null default 'private'
              check (visibility in ('private','public')),
  status      text not null default 'active'
              check (status in ('active','paused','done','abandoned')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create table entries (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  work_item_id uuid references work_items(id) on delete set null,
  agent_id     uuid,
  kind         text not null check (kind in ('note','decision','source','session')),
  title        text,
  body         text not null default '',
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table work_items (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  owner_id            uuid not null references users(id) on delete cascade,
  agent_id            uuid,
  parent_id           uuid references work_items(id) on delete cascade,
  order_index         integer not null default 0,
  kind                text not null default 'task' check (kind in ('task','question')),
  status              text not null default 'open'
                      check (status in ('open','doing','blocked','done','dropped')),
  title               text not null,
  body                text not null default '',
  wake_at             timestamptz,
  closed_by_entry_id  uuid references entries(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  status_changed_at   timestamptz not null default now(),
  closed_at           timestamptz
);

create table documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid,
  title       text not null,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table document_revisions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents(id) on delete cascade,
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  title        text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  entry_id     uuid references entries(id) on delete cascade,
  document_id  uuid references documents(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  byte_size    bigint not null,
  created_at   timestamptz not null default now(),
  check (num_nonnulls(entry_id, document_id) = 1)
);
```

`entries` and `work_items` reference each other. Create `entries` first without
`work_item_id`, then `work_items`, then add the column via
`alter table entries add column work_item_id ...`.

Indexes: `(project_id, occurred_at desc)` on entries; `(project_id, parent_id,
order_index)` and `(project_id, status)` on work_items; `(project_id)` on
documents; `(document_id, created_at desc)` on document_revisions;
`(owner_id, updated_at desc)` on projects.

### 5.3 Design decisions

**Nesting replaces both `spaces` and `modules`.** `parent_id` + `order_index`
gives grouping, sequence, arbitrary depth, and progress roll-up with two columns
and no extra table. A learning track, a curriculum module, and a task are the
same object at different depths:

```
Learn Mandarin to HSK4        project (kind='learn')
├── Characters                work_item
│   ├── HSK1 set              work_item
│   │   └── Radicals 1–50     work_item
│   └── HSK2 set
└── Grammar
    └── 了 — two uses or one? work_item (kind='question')
```

For build projects the tracks run in parallel rather than in sequence, so
`order_index` degrades to display order. That is acceptable; the resume view
must therefore never present "next up" as a single linear item.

**Questions are work items, not entries.** A question is an open loop — it
belongs with what is next. Entries are strictly *what happened*. No overlap,
and blockers fold into `question` rather than earning their own kind.

**`closed_by_entry_id` is the engine of the product.** Closing a work item
prompts for the entry that closed it. That is how the record accrues as a
by-product: nobody writes documentation, they just finish things. `entries.
work_item_id` is a distinct and weaker relation — *this happened while working
on X* — and is what lets the timeline filter by area.

**`blocked` + `wake_at`.** "Motor ordered, six-week lead time" is neither open
(nothing to do) nor done. For hardware builds, waiting is half the project. The
pair pays the thesis back directly: return after a month and the resume view
says *the motor you ordered in March should have arrived.* `wake_at` may be set
on an item of any status, but only `blocked` items are surfaced by the resume
view when it passes.

**`status_changed_at` makes duration legible.** "Blocked" is a fact; "blocked
since March" is the version that makes you act, and it is what the resume view
renders. A full status-transition audit log would also answer *how many times*
an item bounced between `doing` and `blocked`, which nothing in the product
needs, so one column replaces a table. It is set by the update action whenever
`status` changes, not by a trigger, so the write path stays inspectable in
TypeScript.

**Cycles in `parent_id` are rejected at the action layer**, not by a database
constraint — Postgres cannot express "no cycles" declaratively, and a recursive
trigger would cost more than it saves for trees of this size. The reparent
action walks ancestors before writing; `tree.ts` treats an unexpected cycle as
corrupt data and surfaces it rather than recursing.

**Progress is computed, never stored.** The old schema stored `goals.progress`
and refreshed it with an `AFTER UPDATE` trigger averaging space progress, which
goes silently stale on insert, delete, and cascade. Progress is derived in TypeScript
from the fetched tree (§6.3).

**`agent_id` is a forward reference to phase 2.** `entries`, `work_items`, and
`documents` each carry a nullable `agent_id`, always null in phase 1 because no
agent exists yet. Null means human-authored. The foreign key to `agents` is
added by the phase-2 migration; the column ships now because provenance is part
of the record's shape, and the record is phase 1's product. See
`2026-07-30-goalspace-grounded-copartner-design.md`.

**Entries are editable but not versioned.** Typo correction is legitimate;
rewriting history is not the risk here, since there is exactly one author.
`occurred_at` is separate from `created_at` so work can be backdated.

### 5.4 Why revisions ship in phase 1

Build and research projects revise the same artifact repeatedly — "frame
geometry spec v3" — and *what changed since March?* is a core re-entry
question. Full versioning is expensive, but **recording** is not: one row
inserted on each save. History that was never recorded cannot be reconstructed
later, which puts revisions in the same category as RLS — cheap now,
impossible retroactively. Diff rendering is deferred (§3).

### 5.5 Ownership is denormalised deliberately

Every table carries `owner_id`, so mutation policies are flat
`owner_id = auth.uid()` with no joins. This is not premature. In the current
schema the `documents` policy performs a triple-nested `EXISTS` through
spaces → goals, and the `modules` policies filter on `spaces.user_id` — **a
column that does not exist on `spaces`** — so those policies are silently dead
today. Flat ownership makes that class of bug impossible.

### 5.6 RLS

Enabled on all six tables.

- `insert` / `update` / `delete`: `owner_id = auth.uid()`.
- `select` on `projects`: `owner_id = auth.uid() or visibility = 'public'`.
- `select` on child tables: `owner_id = auth.uid()` or one `exists` against
  `projects` for `visibility = 'public'`.

`visibility` ships now with only `private` reachable from the UI. Security
policy is the one thing that must not be retrofitted under deadline pressure;
phase 3 then becomes a UI change rather than a security rewrite. Everything
else phase 2+ needs — embeddings, metering — backfills trivially from existing
text and is therefore excluded.

### 5.7 Storage

Supabase Storage bucket `attachments`, private, path
`{owner_id}/{project_id}/{uuid}{ext}`. Access via signed URLs. Storage policies
mirror table RLS on the leading path segment. Images and PDFs, 25 MB per file.

Attachments were the clearest gap found when stress-testing the model against a
hardware build — welds, wiring, parts that arrived wrong — and they serve
learning projects equally (recordings of your own speech, handwriting).

### 5.8 Why storage is not git-backed

The word "repository" invites the analogy, so the rejection is recorded here to
stop it being relitigated.

**Git's value is merge, and this product has no merges.** Owner-as-sole-author
was chosen deliberately (§3), which is why "removes all merge, diff, and
conflict machinery" appears there as a benefit. Adopting git pays that entire
cost to obtain *history* — and history is the cheap problem, already solved by
`document_revisions` for the only object that gets revised, by append-orientation
for entries, and by `status_changed_at` for work items.

The costs would be concrete. Nested work items with statuses, `wake_at`, and
"open items whose wake date has passed" are relational queries; git stores
files, so Postgres would remain as a derived index and every subsequent feature
would begin with "which one is the truth?" A commit round-trip per capture
violates success criteria 1 and 5. Images want LFS. Multi-device editing
reintroduces the conflicts the design removed.

The disqualifier is audience: goalspace is for anyone with a hard goal, not
only developers. Requiring a GitHub account to study for HSK4 is absurd.

**What is kept from the idea.** Goalspace borrows GitHub's *social* model —
private versus public, outside contribution, sponsorship — and not its storage
model. Two derivatives survive into phase 3:

- **Inbound connectors.** Commits are work already recorded elsewhere; importing
  them as `session` entries makes the record accrue at zero effort, which is the
  product thesis at its purest. Read-only, no conflicts, and one connector among
  several — a fitness or reading connector serves other project kinds
  identically.
- **Markdown export.** One-way export of a project to a repository gives the
  portability and ownership story — *your record is yours* — with none of the
  coupling.

### 5.9 Visibility is per-project, and stays that way

`projects.visibility` is the only visibility control. Entries, work items, and
documents inherit it. This was evaluated against per-entry visibility and the
per-project model won on three grounds.

**Partial visibility leaks through relations.** Hiding an entry means hiding
every path to it: a public entry citing a private one, a graph edge to a private
node, an agent answer quoting a private decision, a work item whose closing
entry is hidden. Every subsequent feature becomes a new leak surface and the
failures are silent. The worst property of such a system is not that it leaks
but that it grants a false sense of control — the owner believes the sensitive
items are marked, and is wrong once.

**It fights quick capture.** A visibility decision on every entry adds a choice
to the one interaction that must stay frictionless (§4, criterion 1).

**The precedent is strong.** GitHub is per-repository, not per-file, after
seventeen years of resources and incentive to do otherwise.

**The counter-argument, and the phase-3 answer.** All-or-nothing visibility has
a real failure mode: if a log contains supplier pricing, an interpersonal
falling-out, or anything medical, the rational choice is to keep the project
private forever, and phases 3–5 never activate. The answer is not per-entry
visibility but an **exception flag** — `entries.is_private boolean not null
default false`, inheriting the project by default, locked individually only when
the owner knows something is sensitive. Opt-out from a sane default, with no
decision at capture time.

That flag ships in phase 3, not here. Its default is correct for every
pre-existing row, so it requires no backfill and loses no data — placing it in a
different class from `document_revisions` (history that cannot be
reconstructed) and RLS (security that should not be bolted on later). The rule
this spec follows is to defer anything that backfills trivially; cheapness alone
is not the test, unrecoverability is.

---

## 6. Application structure

### 6.1 Routing

Current routing is inconsistent: `app/[locale]/` holds marketing, blog, and
login, while `app/(dashboard)/` holds authenticated routes with no locale
segment. i18n machinery is retained, so the new workspace unifies under the
locale segment and `app/(dashboard)/` is deleted entirely.

```
app/[locale]/(workspace)/projects/                  list
app/[locale]/(workspace)/projects/new/              create
app/[locale]/(workspace)/projects/[slug]/           resume view  ← the screen that matters
app/[locale]/(workspace)/projects/[slug]/log/       filterable timeline
app/[locale]/(workspace)/projects/[slug]/work/      work tree
app/[locale]/(workspace)/projects/[slug]/work/[id]/ single item
app/[locale]/(workspace)/projects/[slug]/docs/      document list
app/[locale]/(workspace)/projects/[slug]/docs/[id]/ document editor
```

Middleware locale and auth handling is kept; its route matchers are updated for
the new paths.

### 6.2 The resume view

`/projects/[slug]` is the product. Four regions:

1. **Where you left off** — the most recent sessions and entries, with elapsed
   time made loud: *"You were away 23 days."*
2. **What's open** — open and `doing` work items, questions first; plus any
   `blocked` item whose `wake_at` has passed, surfaced prominently.
3. **What you decided** — recent `decision` entries, collapsed.
4. **Quick capture** — always mounted, one textarea, kind selector, ⌘↵ to save.

Capture friction is the whole bet. If capture is more than one keystroke away
the record never accumulates, and phases 2–5 have nothing to stand on.

### 6.3 Modules and boundaries

Pure logic is separated from data access so the interesting parts are testable
without a database.

| Module | Responsibility | Depends on |
|---|---|---|
| `lib/work-items/tree.ts` | flat rows → nested tree; ordering | nothing (pure) |
| `lib/work-items/progress.ts` | subtree → `{done, total, ratio}` per id | nothing (pure) |
| `lib/work-items/reentry.ts` | which items are due/overdue given `wake_at` and now | nothing (pure) |
| `lib/schemas/*.ts` | zod schemas per object, shared by forms and actions | zod |
| `lib/db/*.ts` | typed Supabase queries, one file per object | supabase client, schemas |
| `app/**/actions.ts` | server actions: validate → mutate → revalidate | db, schemas |
| `components/capture/` | quick capture, kind selector | schemas |
| `components/work/` | tree rendering, status control, close-with-entry flow | tree, progress |
| `components/log/` | entry list, kind filters | nothing |
| `components/docs/` | markdown editor + preview, revision list | schemas |

Progress is defined as: a leaf contributes `1/1` when `done`, `0/1` otherwise;
`dropped` items are excluded from both numerator and denominator; a parent's
ratio is the sum over its leaf descendants. Isolating this as a pure function
over a flat array makes every edge case (empty parents, all-dropped subtrees,
deep nesting) a unit test rather than a database fixture.

### 6.4 Data flow

Server Components read through `lib/db`. Writes go through Server Actions that
validate with zod, mutate, and `revalidatePath`. Quick capture applies an
optimistic entry and rolls back on failure — it is the highest-frequency
interaction and must never feel like a round trip. No client-side global store;
the Zustand store is deleted with the model it served.

### 6.5 Error handling

- **Validation** — zod at the action boundary; field errors returned to forms.
- **Optimistic capture** — rollback plus a retry affordance that preserves the
  typed text. Losing captured text is the worst failure this product has.
- **Uploads** — the file goes to storage first, then the parent row and its
  `attachments` rows are inserted in a single action, since `attachments`
  requires an existing `entry_id` or `document_id`. A failed insert after a
  successful upload leaves an orphaned storage object; sweeping those is
  deferred and recorded as a known gap.
- **Missing/forbidden rows** — RLS returns empty rather than erroring, so `db`
  functions distinguish "absent" from "forbidden" and route to 404.
- **Revision writes** — a failed revision insert fails the document save, so
  history is never silently skipped.

---

## 7. Deletions and stack

### 7.1 Deleted

All 18 API routes, including the 13 `generate-*` endpoints, `chat-with-mentor`,
`chat-with-faez`, `make-podcast`, `generate-mindmap`, and `embeddings`. The
`goals`, `spaces`, `modules`, `tasks`, `chat_messages`, and
`document_embeddings` tables. The old `documents` table is dropped and recreated
with the shape in §5.2 — the name is reused, none of the columns or policies
are. `app/(dashboard)/`. The Zustand store. All AI
dependencies (`ai`, `@ai-sdk/*`, `@anthropic-ai/sdk`), `three` and
`@react-three/fiber`, `node-fetch`, and TipTap with its ~10 satellite packages
— documents use a markdown textarea with preview.

### 7.2 Relocated, not lost

Only the 3D decoration is a true deletion. Everything else has a destination:

| Today | Destination |
|---|---|
| `spaces` | top-level nested work items — phase 1 |
| `modules` | nested work items + `order_index` — phase 1 |
| `tasks` | leaf work items — phase 1 |
| stored progress | computed from the tree — phase 1 |
| knowledge base | `documents` — phase 1 |
| `mentor_type` per space | specialised agents per project — phase 2 |
| generated module content | tutor agent writing into documents — phase 2 |
| `document_embeddings`, `match_documents` | grounded retrieval — phase 2 |
| podcast | agent output persisted to storage — phase 2 |
| mindmap | graph view over real edges — phase 3 |

On the podcast specifically: the existing route does not persist audio (it
returns the buffer to the client), is pinned to `claude-3-haiku-20240307`, uses
`eleven_monolingual_v1` with an English voice — so it cannot produce Mandarin,
the case that motivated keeping it — and consumes a `spaceDetails` shape being
deleted. Roughly 25 of its 105 lines are conceptually reusable, and those get
rewritten against AI SDK v6 and Blob storage regardless. The concept is kept;
the code is not ported.

The mindmap improves by relocation: the old route asked an LLM to invent a tree
from a prompt. The new graph is derived from real edges — `parent_id`,
`entries.work_item_id`, `closed_by_entry_id` — so it draws the project's actual
shape rather than a generated picture.

### 7.3 Retained

Supabase auth with email verification, the i18n machinery for `en`/`ms`/`zh`
(strings are rewritten; the plumbing is not), middleware, shadcn/ui primitives,
theme provider, and the site-info consent flow.

### 7.4 Upgrades

Next 14 → 16, React 18 → 19, `@supabase/*` to current. Radix packages bump as
required by React 19. No AI SDK in phase 1; v6 behind AI Gateway arrives clean
in phase 2 rather than being upgraded through v4 → v6 for code being deleted.

---

## 8. Testing

The project has **zero tests today**. Phase 1 establishes the harness, weighted
toward the risks that actually matter.

**RLS isolation (highest value).** For a product whose core promise is "private
unless I say otherwise", a leak is fatal and invisible. Integration tests run
against a local Supabase instance with two seeded users and assert that user B
can neither read nor write any row of user A's project across all six tables,
including via `parent_id` traversal and attachment paths. These tests would
have caught the dead `modules` policy in the current schema.

**Unit (Vitest).** `tree.ts`, `progress.ts`, `reentry.ts`, and the zod schemas.
Edge cases: empty parents, all-dropped subtrees, deep nesting, cyclic
`parent_id` rejection, `wake_at` boundaries across timezones.

**End-to-end (Playwright), one path.** Create project → capture entry → create
nested work items → close an item with an entry → confirm the resume view shows
the closing entry and the recomputed progress. This is the product's core loop;
if it passes, phase 1 works.

Not covered in phase 1: component snapshots, visual regression, load testing.

---

## 9. Risks

| Risk | Response |
|---|---|
| Build state is unverified — no `node_modules`, never built in this session | First task of the plan is install, build, and record what breaks, before any feature work |
| Next 14 → 16 is two majors; `params`/`searchParams` became async in 15 | Upgrade lands as its own step with the build green before schema work starts |
| React 19 breaks older Radix versions | Bump Radix in the same step; shadcn components may need regeneration |
| Local Supabase needed for RLS tests | Treated as infrastructure work in the plan, not assumed present |
| Locale strings are stale against the new product vocabulary | `en` rewritten during phase 1; `ms`/`zh` regenerated afterwards |
| Capture friction creeping upward as fields are added | Success criterion 1 is a test, not an aspiration |

---

## 10. Open decisions deferred to the plan

None. All design questions raised during brainstorming are resolved above.
Implementation ordering, task decomposition, and estimates belong to the
implementation plan.

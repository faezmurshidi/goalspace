# Roadmap

The product ships in five phases. Each one is specified in full before it is
built; the specs in `docs/superpowers/specs/` are approved designs, not sketches,
and this file is only the index to them.

## Phase 1 — Repository core

**Design:** [2026-07-30-goalspace-repository-core-design.md](superpowers/specs/2026-07-30-goalspace-repository-core-design.md)
**Status:** built. Private, single-user, no AI.

The substrate: projects, the entry log, nested work items with blocked and wake
dates, documents with recorded revisions, attachments, and the resume view.
Auth is one surface at `/login`. RLS isolation is enforced by policy and covered
by tests.

Three forward references ship deliberately unused: nullable `agent_id` on
`entries`, `work_items`, and `documents` (phase 2 provenance); the
`projects.visibility` column and its public-read policies (phase 3); and
document revisions, which give phase 2's agent edits an undo path for free.

## Phase 2 — Grounded co-partner

**Design:** [2026-07-30-goalspace-grounded-copartner-design.md](superpowers/specs/2026-07-30-goalspace-grounded-copartner-design.md)
**Status:** designed, not started. This is next.

Makes the phase-1 record answerable. The differentiating question is not "write
me a plan" — it is *"why did I abandon that approach in month two?"*, which no
general tool can answer because none of them hold your record.

Scope: retrieval over the project repository; agents whose tool allowlists are
enforced server-side; proposals and an approval inbox; conversation and inline
invocation surfaces; run tracking, cost metering, and spend caps; seeded Tutor /
Researcher / Critic templates; web search; audio generation.

Two constraints are load-bearing and not negotiable inside the phase: **agents
propose, they never write**, and **agents are capability boundaries, not
personas**.

### Open decisions to settle before implementation

Raised in review against the approved design; each needs a call, and the spec
should be amended with whatever is decided.

- **RLS for the new tables.** Phase 1's regime includes a public-read branch on
  `projects.visibility`. Copying it to `messages`, `agent_runs`,
  `agent_tool_calls`, `embeddings`, and `ai_usage` would publish transcripts,
  run traces (including outbound web-search queries), and spend the moment a
  project is made public. These tables likely need owner-only policies.
- **Whether embeddings ship in this phase at all.** The design argues a single
  project is small enough that the skeleton plus iterative tools beat similarity
  search, then builds a trigger, a job queue, a cron, a backfill, and a lag
  monitor for it. Full-text-only `search_repo` may satisfy the phase.
- **The vector index, if embeddings do ship.** `ivfflat` with `lists = 100` is
  wrong at this corpus size and is trained on an empty table at migration time.
  HNSW, or no index at all.
- **Where the agent step loop runs.** An agentic retrieval loop with a hard step
  limit can outlive a normal serverless function invocation. Streaming, or a
  durable workflow.
- **How web findings are cited.** `proposals.citations` validates that every
  cited id belongs to the project, which leaves the Researcher — defined as
  bringing back *cited* findings — with nowhere to put a URL.
- **Default spend posture.** `monthly_cap_usd` is nullable, so the default is
  uncapped; and the cap check races across concurrent runs. Cheap to fix now,
  expensive once phase 5 makes it strangers' money.

## Phase 3 — Public projects

**Status:** not designed.

Surfaces the visibility toggle. The column, the RLS policies, and the
world-readable path already ship in phase 1, so this is a UI change rather than
a security rewrite.

## Phase 4 — Outside contributions

**Status:** not designed.

Suggestions from other people arrive as rows in the same proposal inbox phase 2
builds, authored by a contributor instead of an agent. The owner remains the
sole author; there is no co-authorship, and therefore no merge or conflict
machinery.

## Phase 5 — Credits

**Status:** not designed.

Funding agent runs. Phase 2 ships the metering it needs —
`agent_runs.work_item_id` is what phase 5 attributes spend to, which is why it
is recorded from the start.

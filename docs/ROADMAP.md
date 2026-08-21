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
**Plan (2a):** [2026-08-18-phase2a-agent-core.md](superpowers/plans/2026-08-18-phase2a-agent-core.md)
**Status:** phase 2a is built. The rest of phase 2 is designed, not started.

Phase 2a shipped the security spine: full-text retrieval over the project, the
project skeleton, five repo-read tools, a registry intersected with each
agent's allowlist server-side, run and tool-call recording, cost metering with
monthly and per-run caps, a streaming ask route, and a seeded Critic. That
covers success criteria 2 and 4.

Criteria 1, 3, and 5 are not met. All three wait on the proposal layer, which
is where the phase's first constraint — agents propose, they never write —
stops being a property of the Critic having no write tools and becomes
something the product enforces. **Phase 2b is the proposals layer** and is the
next thing to plan.

Still unbuilt, in dependency order: proposals and the approval inbox; the
`propose_entry` / `propose_work_item` / `propose_document_edit` tools with
server-side citation validation; `conversations` and `messages` with message
persistence; the ask, inbox, agents, and run-trace surfaces; `web_search`;
`generate_audio`; the Tutor and Researcher templates.

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

### Open decisions

Raised in review against the approved design. Five were settled while building
phase 2a; one is still open and blocks `web_search`.

**Settled:**

- **RLS for the new tables** — owner-only, with no public-read branch anywhere.
  Copying phase 1's `projects.visibility` branch would have published system
  prompts, transcripts, run traces, and spend the moment a project was made
  public. Asserted by `tests/rls/agents-isolation.test.ts` against a project
  marked public.
- **Whether embeddings ship** — they do not. Full-text only. The design argues
  one project is small enough that the skeleton plus iterative tools beat
  similarity search, and dropping the vector half removed the largest subsystem
  in the phase. `search_repo`'s signature is shaped so the vector half can be
  unioned in later without changing a caller.
- **The vector index** — moot; no embeddings shipped.
- **Where the agent step loop runs** — inside a streaming route handler.
  Flushing tokens keeps the connection alive through a multi-step loop that
  could otherwise outlive a serverless invocation.
- **Default spend posture** — `monthly_cap_usd` is not-null with a $10 default,
  because a nullable cap makes the default posture unlimited. The concurrency
  race is closed too: `start_agent_run` reserves each run's worst-case cost and
  performs the check and the insert together under a per-project advisory lock,
  so runs starting simultaneously can no longer all read the same headroom.

**Still open:**

- **How web findings are cited.** `proposals.citations` validates that every
  cited id belongs to the project, which leaves the Researcher — defined as
  bringing back *cited* findings — with nowhere to put a URL. This needs a call
  before `web_search` can be specified.

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

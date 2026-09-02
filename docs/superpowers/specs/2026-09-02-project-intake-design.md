# Project Intake Design

**Status:** designed, not started. Phase 2c.
**Related:** [PRODUCT.md](../../../PRODUCT.md) · [grounded co-partner design](2026-07-30-goalspace-grounded-copartner-design.md) · [repository core design](2026-07-30-goalspace-repository-core-design.md) · [ROADMAP](../../ROADMAP.md)

---

## 1. Premise

Creating a project today lands the owner on an empty resume view. The record is
blank, the work tree is blank, and the only thing the product knows about the
project is a title, a kind, and an optional brief. The first session therefore
asks the owner to do the hardest part — decompose two years of intent into
work items — with no help at all, at the moment they have the least patience
for the interface.

This adds an intake: immediately after creation, one agent asks between five
and ten questions about the project, and a second agent reads the answers and
proposes a work breakdown the owner accepts or rejects as a set.

**This is a deliberate exception to a stated boundary, and it should be read
as one.** PRODUCT.md defines the job as *"make coming back cheap. Not
planning, not motivation, not task management. Re-entry."* A flow that
interviews the owner and proposes a work breakdown is planning and task
management — both named in that sentence as what this product is not. The
landing-page principles say it again from the other side: onboarding, setup,
and goal creation are the least interesting things here.

The argument for building it anyway is narrow, and it must be held to its
narrowness: re-entry is only worth serving if there is a record to re-enter,
and an empty project has none. The intake exists to make the record non-empty
at the one moment the owner has the most context loaded, and then to get out
of the way permanently. It is a door, not a room. If it ever acquires a second
session, a progress notion, or any reason to come back to it, that is the
boundary reasserting itself, and the correct response is to cut it back rather
than to extend it.

The constraint it must not soften: **agents propose, they never write.**

### 1.1 What this is not

Until commit `8b7245a` this repository held an AI goal-setting product whose
central flow was superficially the same shape: a goal form, an endpoint that
generated three to five clarifying questions, and a second pass that expanded
the answers into "spaces" with named AI mentors, objectives, and time
estimates. That flow wrote directly to the database, invented personas, and
sold the moment of setup as the product.

This is not a restoration of it. The differences are the whole design:

| Deleted flow | This |
|---|---|
| Wrote spaces and modules directly | Proposes work items; nothing lands unaccepted |
| Mentors with names, personalities, teaching styles | Two agents distinguished only by tool allowlist |
| Unmetered model calls | Two metered runs against the project's monthly cap |
| Setup was the product | Setup is a door the owner walks through once |

`docs/usage-tracking.md` still documents the deleted flow's analytics events
(`goal_form_submitted`, `questions_generated`, `goal_analysis_with_answers`,
`spaces_generated`). None of them fire anywhere. Correcting that file is in
scope here (§9.5) because leaving it would make this design look like a
revival of the thing CLAUDE.md tells us to treat as stale.

## 2. Scope

**In scope:** the intake route and its three steps; two new seeded agent
templates; a structured-output execution path alongside the existing streaming
one; the server actions that record answers and apply the accepted breakdown;
locale strings for `en`, `ms`, `zh`; unit and RLS tests.

**Out of scope:** `conversations` and `messages`; multi-turn or follow-up
questioning; a general ask surface; editing a proposed item's wording before
accepting it (the inbox has that; the intake review step will not); nested
breakdowns (§5.3); intake for projects that already exist (§4.4).

**One migration, and only one.** Every table this needs — `agents`,
`agent_runs`, `proposals`, `entries`, `work_items` — was built in phases 1, 2a
and 2b, and the two new agents are rows inserted by application code at
project creation rather than schema. The exception is `agent_runs.trigger`,
which is check-constrained to `('conversation','work_item_action')`. An intake
run is neither, so the constraint gains `'intake'` (§9.1).

## 3. Success criteria

1. A project created through the intake has a non-empty record before the
   owner reaches the resume view for the first time: at minimum one entry, and
   whatever work items they accepted.
2. Nothing the Planner proposes exists as a work item until the owner accepts
   it. Provable by test, not by prompt wording.
3. The Interviewer's tool allowlist is empty, and the executor refuses any
   tool call it makes. Provable by test.
4. Both runs appear in the run trace with recorded token counts and cost,
   carry `trigger = 'intake'`, and reserve against the project's monthly cap
   like any other run.
5. Skipping the intake at any step leaves a project indistinguishable from one
   created before this shipped.
6. The intake never appears again on its own for a project that has seen it.

## 4. The flow

### 4.1 Entry

`createProjectAction` is unchanged. `CreateProjectForm` pushes
`/projects/${slug}/intake` instead of `/projects/${slug}`.

That push is the only thing that routes anyone to the intake. There is no
persistent gate, no `intake_completed` column, and no redirect from the resume
view. Navigating to `/projects/[slug]` always shows the resume view, including
for a project whose intake was abandoned halfway.

This is what "blocking" means here: it blocks one navigation, not a state the
project is stuck in. A gate that outlives the moment would be the setup
ceremony PRODUCT.md rules out, and would punish the owner for closing a tab.

### 4.2 The three steps

One route, `app/(workspace)/projects/[slug]/intake/page.tsx`, holding three
states in a client component:

1. **Questions** — the Interviewer run is dispatched on mount. While it runs,
   a shaped skeleton holds the plate's footprint, matching the pattern in
   `app/login/page.tsx`. On success, five to ten questions render as a form.
2. **Answers** — every field is optional and free text. The owner submits once.
3. **Review** — the Planner's proposed items render with a checkbox each, and
   the unanswered questions render below them as a second, separate checklist
   (§8.2). Accept applies the checked set; the rest are rejected.

Skip is present on all three steps as a plain text link reading "Skip and go
to the project" — not a greyed-out tertiary button, and never phrased as a
loss. It navigates to `/projects/[slug]`.

### 4.3 Cost

The intake is exactly two runs. Both go through `startAgentRun`, which
reserves `worstCaseUsd(model, per_run_token_cap)` against the monthly cap
atomically before either begins.

If either reservation is refused, the step renders the cap message from
`checkCaps` and offers skip. It does not retry, and it does not silently fall
back to an unmetered call.

### 4.4 Existing projects

Projects created before this ships have no Interviewer and no Planner, and
they do not get one. `seedAgents` runs at creation only, and there is no
backfill: adding agents to a live project on the owner's behalf is a write
they did not ask for, and the intake is designed for a record that is empty,
which theirs is not.

## 5. Agents

### 5.1 Two new templates

Added to `SEEDED_TEMPLATES` in `apps/app/lib/agents/templates.ts`, alongside
the Critic and the Tutor. Both seed `is_active: true` with `DEFAULT_MODEL`,
and both are editable and deletable exactly like the existing pair.

| Slug | Tools | Role |
|---|---|---|
| `interviewer` | `[]` | Asks what the record does not yet say. Reads nothing, writes nothing. |
| `planner` | `REPO_READ` + `propose_work_item` | Reads the intake note, proposes top-level work items. Cannot touch entries or documents. |

**The Interviewer's allowlist is empty, and that is the point.** A project
seconds old has no record to retrieve, so an agent that claimed retrieval
would be claiming a capability it cannot exercise. An empty array is the
enforceable form of that statement: `resolveTools([])` returns nothing, and
`isAllowed` refuses every name. It is the clearest case in the product of the
principle that agents are capability boundaries rather than personas — the
Interviewer and the Planner share no tool at all.

The Planner's allowlist is `REPO_READ` plus one write tool. It reaches
`propose_work_item` and neither `propose_entry` nor `propose_document_edit`,
so a Planner that decides mid-run to rewrite the brief cannot.

### 5.2 System prompts

Written to the register PRODUCT.md sets: plain, specific, unsentimental. The
substance each must carry:

**Interviewer.** Ask what a person picking this project up in a month would
need to know and cannot infer from the title. Cover the shape of the thing,
its constraints, what is already decided, and what is unresolved. Every
question must be answerable in a sentence or two by someone who has not
thought about it before. You have no tools; do not offer to look anything up.

Two exclusions, and they are not the same kind of thing. **Never ask who else
is involved or how the work is divided** — this is one person's own project,
there is no team, and asking reveals that the agent does not know what it is
looking at. That is not a matter of taste the owner can skip past; it costs
trust on the first screen they ever see. **Do not ask what motivates them**,
and do not welcome or congratulate them: wrong register, per PRODUCT.md's
anti-references.

**A date is explicitly in scope**, and asking for one is encouraged. An
earlier version of this section forbade it. That was wrong and is corrected
here: nothing in PRODUCT.md excludes dates, and the data model is built around
them — `work_items.wake_at`, blocked-since, and a resume view whose entire
emotional register is elapsed time. What PRODUCT.md excludes is motivation,
streaks and adherence, not a target. The framing that survives the objection
is *what are you aiming for*, not *when will you be finished*: the first is an
intention the owner can state on day one, the second is a number they would
have to invent.

The general rule this correction illustrates: an optional question costs the
owner one skip. That is a low bar, and a prohibition needs a better reason
than the author's taste to clear it.

**Planner.** You read the owner's own answers and propose the work that
follows from them. Propose work the answers support and nothing more;
inventing a plausible-sounding phase the owner never mentioned is worse than
proposing fewer items. Write titles the owner would recognise as their own
words. You cannot create anything: every item is a suggestion they accept or
reject.

Cite an id you were given or have seen in a tool result — those are the two
honest sources, and an invented one is rejected. **Do not send it looking for
material it already has.** An earlier version named the intake note's id and
said "read that entry", which pointed at a `read_entry` tool that does not
exist: `REPO_READ` fetches a work item or a document by id and nothing else.
The Planner spent all twelve steps hunting for it and proposed nothing. The
answers now travel inline in the prompt. See §15.

### 5.3 Flat breakdown, one level

`propose_work_item.payload.parent_id` is a `uuid`. At intake nothing exists to
point at, so a nested tree cannot be proposed in one pass without changing the
tool's payload shape — and changing a phase-2b tool to serve a phase-2c
surface would put a temp-id resolution step inside the one code path whose
simplicity is load-bearing.

**v1 proposes top-level items only**, capped at twelve. This is what the
resume view's `Open` region renders anyway, and nesting remains something the
owner does by dragging, or a separately designed `propose_work_item_tree`
later. The cap is enforced server-side on apply, not asked for in the prompt.

## 6. Execution

### 6.1 A second entry point, not a second executor

The Interviewer needs structured output and has no tools. The existing route,
`app/api/agents/[agentId]/ask/route.ts`, is `streamText` plus a tool loop —
the wrong shape for a call that returns a JSON list and makes no tool calls.

New: `apps/app/lib/agents/structured.ts`, exporting `runStructured()`. It uses
`generateObject` against a caller-supplied zod schema and shares everything
that matters with the streaming path:

- `getBudget` and `startAgentRun` for the atomic reservation
- `checkCaps` for the refusal wording
- `costUsd` / `gatewayCostFrom` for what the run actually cost
- the same run and tool-call recording, so the trace shows both runs

What it does not share is the tool loop, because it has none: `runStructured`
takes no allowlist and builds no tool set. An agent with a non-empty allowlist
passed to it is a programming error and throws, rather than quietly running
with its capabilities dropped.

The Planner uses the **existing** executor unchanged. Its proposals are
created by the real `propose_work_item` handler, with the real server-side
citation validation. Nothing about the proposal path is special-cased for
intake, which is what makes success criterion 2 a test rather than a promise.

### 6.2 Why not a dedicated route with hardcoded prompts

Because it could not work. `proposals.agent_id` and `proposals.run_id` are
`not null`, and both carry **composite** foreign keys on `(id, project_id)` —
the phase-2b design's guard against attributing a proposal in one project to
an agent in another. A proposal cannot exist without a real agent row and a
real run row behind it. The seeded-template design is not the tidier of two
options; it is the only one the schema permits.

## 7. Surfaces

### 7.1 Questions and answers

The two steps share one form. Questions render as a numbered list, each with
its label and a textarea sized to two rows. No question is required, and none
is marked optional either — marking them all optional invites skipping all of
them, and marking none says the same thing more quietly.

The Interviewer returns a `purpose` for each question. It is not rendered. A
question that needs justifying is a badly written question, and the field
exists only so the model has somewhere to put the reasoning instead of
smuggling it into the question text.

### 7.2 Review

Two checklists, visually separated by a rule:

- **Proposed work.** One row per proposed item: title, kind, and the Planner's
  `rationale` in `text-ink-soft`. Checkbox per row, **checked by default** —
  the owner asked for a breakdown and these are it; requiring twelve clicks to
  accept the thing they requested is friction for its own sake.
- **Questions you left open.** One row per unanswered question, **unchecked by
  default** (§8.2).

A single submit applies both. The button label states the count of what will
be created, so the act is legible before it happens.

### 7.3 Voice

No progress bar, no step counter framed as achievement, no "You're all set!".
The steps are named for what they are. On completion the owner arrives at the
resume view with a populated record — which is the confirmation. Nothing
celebrates it.

## 8. What lands in the record

### 8.1 The answers

One `entry` of kind `note`, `agent_id: null`, created by `createEntry`
directly. Body is the answered Q&A pairs; unanswered questions are omitted
from it. Title is the project title.

`agent_id: null` is correct and is not a loophole: the owner typed these
words. The Interviewer's contribution was the prompt, not the content, and it
holds no write tool with which to record anything.

### 8.2 The unanswered questions

Each unanswered question the owner **ticks** on the review step becomes a
`work_item` of kind `question`, status `open`, `agent_id: <interviewer>`.

The repository core design is explicit that a question is an open loop and
therefore a work item, not an entry. An intake question the owner could not
answer is exactly that, and recording it is more honest than discarding it —
it is the kind of thing the resume view exists to surface a month later.

`agent_id` is the Interviewer's, because the words are the Interviewer's.

**This is the one place the design brushes against "agents propose, they never
write", and it is deliberate.** The reading it relies on: the constraint bars
an agent from mutating the record *of its own motion*. These rows exist only
because the owner read them and ticked a box, which is the same act as
accepting a proposal, performed inline instead of in the inbox. The
safeguards that make that reading honest rather than convenient:

- Checkboxes default **unchecked**. Walking away, closing the tab, or
  submitting without reading creates nothing.
- The rows are visible in full before the act, not summarised.
- Provenance is recorded truthfully rather than laundered to `null`.

The stricter alternative — giving the Interviewer `propose_work_item` so these
route through `proposals` — was rejected because it costs the empty-allowlist
property in §5.1, which is the more valuable of the two guarantees. If a later
reviewer disagrees, the change is one line in the template plus deleting the
direct write; note it as a decision, not a bug.

### 8.3 The breakdown

Checked proposals apply through `applyProposal` in a loop, one call per item,
in list order. Each is claimed conditionally from `pending`, so a second tab
racing the same accept yields one row rather than two. Unchecked proposals are
settled as `rejected`.

Partial failure is reported, not swallowed: if item seven of nine fails
validation, the six that applied stay applied, the failure is named, and the
remaining two are left `pending` so they appear in the inbox rather than
vanishing.

### 8.4 The resume view needs no change

`hasRecord` already counts entries, open items, waiting items, and undecided
proposals. After an intake it is true, so `FirstRun` stops rendering on its
own. After a skipped intake it is false, and `FirstRun` renders exactly as it
does today.

## 9. Data work required

### 9.1 One migration — `agent_runs.trigger` accepts `'intake'`

`agent_runs.trigger` is `text not null check (trigger in
('conversation','work_item_action'))`. Both intake runs are neither: nobody
asked a question and no work item was acted on.

The constraint gains a third value. The alternative — filing intake runs as
`'conversation'` — would make the cost of an intake unrecoverable from the
trace the moment the Planner becomes reachable from a general ask surface,
because the agent id would no longer discriminate. `start_agent_run` passes
`p_trigger` straight through and needs no change; `RunTrigger` in
`lib/db/agents.ts` gains the member.

Nothing else in the schema changes. Stated explicitly because the instinct on
reading this spec is to reach for a table.

### 9.2 Schemas — `lib/schemas/intake.ts`

- `intakeQuestionSchema` — `{ id, question (1..300), purpose }`
- `intakeQuestionsSchema` — `z.array(...).min(5).max(10)`, the object handed
  to `generateObject`. The bounds are the contract, enforced by the schema
  rather than requested in the prompt.
- `intakeAnswersSchema` — `z.record(questionId, z.string().max(2_000))`
- `applyIntakeSchema` — the accepted proposal ids and the ticked question ids

### 9.3 Actions — `app/(workspace)/projects/[slug]/intake/actions.ts`

Not added to the already-large `app/(workspace)/actions.ts`. That file is at
the size where one more feature's worth of actions makes it harder to read,
and these three are cohesive enough to stand alone. They use the same
`resolveProject` pattern — slug in, project resolved under the caller's own
session — and return the same `ActionResult` type.

| Action | Does |
|---|---|
| `startIntakeAction(slug)` | Resolves the Interviewer, calls `runStructured`, returns questions or a cap refusal |
| `submitIntakeAction(slug, answers)` | Writes the note entry (§8.1), then runs the Planner with the note id, returns the pending proposals |
| `applyIntakeAction(slug, input)` | Applies checked proposals, rejects the rest, creates ticked question items, returns counts |

### 9.4 Templates

Two entries appended to `SEEDED_TEMPLATES`. `agentRowsFor` needs no change —
it maps over whatever the array holds.

### 9.5 Documentation

- `docs/usage-tracking.md` — delete the "Goal Setting Events" block. Those
  events fire nowhere and describe the deleted product (§1.1).
- `docs/ROADMAP.md` — add phase 2c and link this spec.
- `CLAUDE.md` — note the intake in the code-layout table once built.

### 9.6 Locales

New keys under `app.intake.*` in `en`, `ms`, `zh`. The review step's two
checklists and the button's count label are the layouts to check against
strings roughly 40% longer than English.

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Interviewer deleted by the owner | Step 1 states the agent is missing and offers skip. Not an error page. |
| Planner deleted | The note entry is still written. Review step states it, offers skip. |
| Monthly cap reached | `checkCaps` wording, plus skip. No retry, no unmetered fallback. |
| Model returns fewer than five questions | `generateObject` rejects against the schema; treated as a failed run and offered as skip. |
| Planner proposes nothing | Review step shows only the unanswered-questions checklist. Not an error. |
| Owner closes the tab mid-intake | Project exists, whatever was written stays, no gate on return. |
| Partial apply failure | §8.3 — applied stay applied, remainder left `pending` for the inbox. |

Every one of these ends at a usable project. Nothing in the intake can leave a
project the owner cannot open.

## 11. Accessibility

WCAG 2.1 AA, as everywhere.

- Each question's textarea is labelled by its question text via `htmlFor`, not
  by placeholder.
- Checkbox groups are `fieldset`/`legend`, so the two lists on the review step
  are distinguishable to a screen reader without relying on the rule between
  them.
- The pending state of each run is announced with `aria-live="polite"`, since
  the wait is measured in seconds and a silent skeleton is a dead page to a
  non-visual reader.
- Nothing is encoded by colour alone; the proposed items carry their kind as a
  word.

## 12. Testing

**Unit — `apps/app/tests/unit`**

- `intakeQuestionsSchema` rejects four questions and eleven questions.
- `agentRowsFor` returns four templates; the Interviewer's `tools` is empty;
  the Interviewer's and the Planner's tool sets are disjoint.
- `isAllowed([], 'search_repo')` is false — the empty allowlist refuses, which
  is criterion 3 at the unit level.
- Unanswered-question → work-item mapping: only ticked ids map, kind is
  `question`, status is `open`.
- `runStructured` throws when handed an agent with a non-empty allowlist.

**RLS — `apps/app/tests/rls`**

- A second user cannot read the intake note or the Planner's proposals.
- A Planner proposal cannot be filed against a project the caller does not
  own, even with a valid agent id from their own project — the composite
  foreign key is what refuses, and the test should name it.

Domain logic in this repository is written test-first. The mapping and schema
work above is pure and belongs under `lib/`, so it is written that way.

## 13. Delivery

Three slices, each shippable.

**2c-1 — Agents and execution.** The two templates, `runStructured`, and the
unit tests. No UI. At the end of this slice a new project seeds four agents
and the Interviewer provably cannot call a tool.

**2c-2 — The wizard.** The route, the three steps, the three actions, locale
strings. This is the slice that changes where `CreateProjectForm` pushes.

**2c-3 — Record and cleanup.** Question work items, partial-failure handling,
RLS tests, and the documentation corrections in §9.5.

## 14. Decisions taken during design

1. **A blocking wizard rather than an offer on the resume view.** Chosen
   knowing it sits against the boundary in §1. Mitigated by §4.1: it gates one
   navigation, never returns, and skip is a first-class exit on every step.
2. **One-shot form rather than multi-turn chat.** Multi-turn needs
   `conversations` and `messages`, both unbuilt, and makes the cost per
   project unbounded. Two runs, two known costs.
3. **Set review on the intake screen rather than the inbox.** Dropping nine
   cards into a surface the owner has never seen is a poor first act, and a
   half-accepted tree is harder to reason about than a checklist.
4. **Two agents rather than one.** One agent holding a write tool through a
   questioning phase it must not write in is a boundary enforced by prompt
   wording. Two agents make it enforced by the registry.
5. **Flat breakdown.** §5.3.
6. **Unanswered questions written directly, with agent provenance.** §8.2 —
   including what would have to change if this is judged wrongly.

## 15. Corrections after building

Recorded because a spec that quietly absorbs its own mistakes teaches nobody.

1. **§2 and §9.1 claimed no migration was needed.** Wrong: `agent_runs.trigger`
   is check-constrained and both intake runs are neither of its two values.
   Found while writing the slice 2c-1 plan, before any code.
2. **§5.2 forbade asking for a date.** Wrong, and it was the author's rule
   rather than the product's — see §5.2. Found by the owner reading the
   finished flow.
3. **The note entry was specified as markdown.** Entry bodies render as plain
   text with `whitespace-pre-line`; only documents pass through the `Markdown`
   component. Emphasis reached the record as literal asterisks. Found by
   looking at the resume view, not by any test.
4. **The Planner was told to read the intake note by id.** There is no
   `read_entry` tool — a real gap in the phase-2a surface that the Tutor and
   Critic share, and worth its own work. Found in the run trace.
5. **The Planner proposed the same item twice.** Deduped in code rather than by
   asking it not to, because prompt instruction is not a control.

Items 3, 4 and 5 were found by driving the flow against a live project. None
was reachable by unit test, which is the argument for keeping a live pass in
every slice that touches a model.

## 16. Open questions

None outstanding. The two judgment calls are recorded in §5.3 and §8.2 with
their reasoning and reversal paths.

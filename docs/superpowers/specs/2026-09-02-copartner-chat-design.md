# Co-partner Chat Design

**Status:** designed, not started. Phase 2d.
**Related:** [PRODUCT.md](../../../PRODUCT.md) · [grounded co-partner design](2026-07-30-goalspace-grounded-copartner-design.md) (§5, §6, §8) · [project intake design](2026-09-02-project-intake-design.md) · [ROADMAP](../../ROADMAP.md)

---

## 1. Premise

The resume view answers *what is open, what did I last do, what did I already
decide*. It cannot answer *why did I abandon that approach in month two* —
which phase 2's design names as the differentiating question, and which no
general tool can answer because none of them holds the record.

This adds the surface that asks it: a conversation with a **Partner** agent,
on the resume view, about this project. The Partner reads the record, writes
down what the owner says, and hands specialist work to the agents whose job it
is.

Two things make this more than a chat box bolted onto a workspace.

**The record grows by talking.** CLAUDE.md's thesis is that the record accrues
as a by-product of daily use, "because nobody maintains a journal deliberately
for two years". A capture bar is still a deliberate act. A conversation that
records what you said as you say it is closer to the claim the product makes
about itself than the capture bar ever was.

**Delegation is a capability boundary, not a shortcut around one.** The Partner
can invoke other agents. It gains nothing by doing so — see §3. Designed the
other way, this feature would quietly void the phase-2 constraint that the
whole agent layer rests on.

## 2. Scope

**In scope:** the `conversations` and `messages` tables phase 2 §8 already
specced; a Partner template; `ask_agent` and `record_entry` tools; the
composer that replaces the capture bar on the resume view; streaming and
message persistence; locale strings for `en`, `ms`, `zh`; unit and RLS tests.

**Out of scope:** multiple conversations per project and a conversation picker
(the schema supports both; v1 shows one rolling thread); the standalone
`/ask` and `/ask/[convId]` routes phase 2 §8 lists; the inline "ask about this
work item" affordance; `web_search`; audio; nested delegation.

**One migration**, creating both tables plus their RLS policies and the
`agent_runs.conversation_id` foreign key phase 2 §8 describes.

## 3. Success criteria

1. The owner can ask a question on the resume view and get an answer grounded
   in their own record, with the run and its cost visible in the trace.
2. `ask_agent` starts a **separate** run under the named agent's own
   allowlist. The Partner never executes a tool it does not itself hold —
   provable by test, not by prompt.
3. A proposal raised through delegation carries the **sub-agent's**
   `agent_id` and `run_id`, and appears in the inbox as that agent's work.
4. `record_entry` cannot record text the owner did not write. Enforced
   server-side against the conversation's own user messages.
5. Capture still works with no model in the loop, and keeps working when the
   monthly cap is reached or the gateway is down.
6. Delegation does not nest.

## 4. The Partner

A fifth entry in `SEEDED_TEMPLATES`, slug `partner`.

| Tools | Count |
|---|---|
| `REPO_READ` | 6 |
| `record_entry` | 1 |
| `ask_agent` | 1 |

Its model is **`zai/glm-5.3-flash`**, not `DEFAULT_MODEL`. A conversation is
the highest-volume agent surface in the product — every turn is a run — so the
Partner is the one template where the model choice is a cost decision rather
than a capability one. The seeded four keep `DEFAULT_MODEL`; `DEFAULT_MODEL`
itself does not change.

**It holds no `propose_*` tool.** This is the design's central choice about the
roster. A Partner that could draft entries, work items and document edits
itself would be a superset of the Critic, Tutor and Planner, and would make
them decorative — three agents whose distinct allowlists no longer distinguish
anything the owner can reach. Instead the Partner delegates: asked to break the
project down it calls the Planner; asked to argue with a decision it calls the
Critic; asked to draft a summary it calls the Tutor.

That keeps its own allowlist honestly describable in one line, which is the
test this codebase applies to every agent: *reads the record, writes down what
you said, asks the specialists.*

The cost is one round trip on cases like "add a task to order bearings", which
becomes a delegation rather than a direct `propose_work_item`. Accepted
deliberately; the alternative is recorded in §14 with its reversal.

### 4.1 Pricing the model

`zai/glm-5.3-flash` must be added to `RATES` in `lib/agents/cost.ts` in the
same change that seeds the Partner. This is not bookkeeping. An unpriced model
fails *silently* in two places, both of which disable a control:

- `costUsd` returns 0, recording every run as free, which stops the monthly cap
  from ever being reached for that model. The gateway's own reported cost
  covers the usual path, so this bites only when the gateway omits one.
- `worstCaseUsd` returns 0, so `start_agent_run` reserves nothing and the
  concurrency protection that makes the cap check sound lapses entirely.

`agents-templates.test.ts` already asserts that every seeded model appears in
`RATES`, so a Partner seeded without this fails the suite rather than shipping
a free-looking agent.

The rates below were read from the gateway, not looked up in a blog post:
`gateway.getAvailableModels()` returns a `pricing` object per model in dollars
per token. The same call reports `openai/gpt-4o-mini` at 0.15 / 0.60 / 0.075,
matching the existing row exactly, which is what confirms the units.

```ts
'zai/glm-5.3-flash': { inputPerMTok: 0.15, outputPerMTok: 0.5, cachedInputPerMTok: 0.03 },
```

**That the gateway serves pricing programmatically also settles a question
left open elsewhere.** Per-agent model choice is planned, and the local table
becomes a liability the moment an owner can pick a model nobody has priced.
The answer is now known to exist: rates can be fetched rather than mirrored.
Out of scope here — this spec adds one row — but it is no longer an open
question, only unbuilt work.

The slug was verified against the live gateway before being written here
(`GATEWAY_MODEL=zai/glm-5.3-flash pnpm verify:gateway`), which is how the
`anthropic/*` 403s that forced `DEFAULT_MODEL` to `gpt-4o-mini` were found.

### 4.2 System prompt substance

Plain, specific, unsentimental, per PRODUCT.md. It must carry:

You answer from this project's record and nothing else. When you do not know,
say what you would need to look at. You cannot create work items, documents,
or drafts — when the owner wants one, ask the agent whose job it is and report
what came back. Say that you have asked it, not that you have done it.

You can write down what the owner tells you, and only that. `record_entry`
transcribes their own words; you may choose the kind and the title, never the
substance. Do not record your own summaries, inferences or conclusions — a
record of what a model thought the owner meant is worse than no record,
because in a month neither of you can tell which is which.

Never ask who else is involved: this is one person's own project. Do not
welcome them or remark that the project sounds interesting.

## 5. Delegation

```
ask_agent({ agent_slug: 'critic' | 'tutor' | 'planner', question: string })
```

The handler resolves the named agent **within the caller's project**, then runs
it through the existing `runTooled` under **that agent's** stored allowlist.
The Partner receives the sub-agent's final text and nothing else.

What follows from that shape, all of it for free:

- The Partner never gains a capability. `buildToolSet` is called with the
  sub-agent's allowlist, in a fresh `RunContext` carrying the sub-agent's id.
- A proposal raised during delegation carries the sub-agent's `agent_id` and
  `run_id`, satisfying the composite provenance key, and reads in the inbox as
  that agent's work — which it is.
- Two runs, two sets of `ai_usage` rows, both reserved against the monthly cap
  and both in the trace. Delegation is auditable rather than hidden inside one
  run's step list.

**Delegation does not nest.** `ask_agent` is granted to the Partner and to
nobody else, so a delegated agent has no way to delegate onward. The handler
additionally refuses `agent_slug: 'partner'`, closing the self-call that the
allowlist alone would permit. Both are tested.

**A delegated run that is refused for budget is not an error.** The Partner is
told the cap was reached and says so; the conversation continues.

### 5.1 The proposal count is data, not narration

Found by running it. Asked to delegate, the Partner reported that four
proposals were *"waiting in your inbox"* after a delegated run that had never
called `propose_work_item` at all. The tool boundary held perfectly — nothing
was written — but the only account the owner could see was a sentence, and the
sentence was false.

The three approval surfaces that exist are all server-rendered on page load:
the sidebar `INBOX` badge, the resume view's undecided-proposals row, and the
inbox itself. None of them moves during a conversation, so nothing was there to
contradict the claim.

So `ask_agent` returns the number of proposals the delegated run actually
produced, counted from `proposals` by `run_id` after the run ends. That value
reaches the client as the tool's `tool-ask_agent` part, and the composer renders
an inbox link from it. Zero renders nothing — which is the property that
matters: when the agent claims a proposal and none exists, its claim stands
alone and unaccompanied rather than being confirmed by the interface.

The general rule, and the third time this spec has had to state it: **a control
the owner relies on cannot be a sentence the model wrote.** It applies to
proposal counts exactly as it applies to citations.

## 6. `record_entry`, and the amendment it makes

```
record_entry({
  payload: { kind, title, body },
  source_message_ids: uuid[]
})
```

Every id in `source_message_ids` must resolve to a row in `messages` with the
current `conversation_id` and `role = 'user'`. Validated server-side before
anything is written, in the same shape as `resolveCitations` — an invented id,
an id from another conversation, or an assistant-role id fails the call and
nothing is recorded.

The entry is stamped `agent_id = <partner>`. The words are the owner's; the
decision to write them down, and the choice of kind and title, are the
Partner's. Stamping records that honestly rather than laundering it to null.

### 6.1 It asks first, so the constraint stands unamended

**Superseded.** This section previously argued that `record_entry` writing
directly was a narrow, deliberate amendment to *"agents propose, they never
write"* — on the reading that the constraint governs authorship, not
transcription. That amendment is withdrawn. It is not needed.

`record_entry` is configured for approval: `toolApproval: { record_entry:
'user-approval' }` on the chat route. The call reaches the client as
`state: 'approval-requested'` carrying the exact payload, the composer renders
it with Accept and Reject, and the tool executes only after
`addToolApprovalResponse`. Nothing reaches the log unapproved, so the
constraint holds as written.

**This is also a stronger guarantee than the one it replaces**, and that is the
better reason for the change. The citation requirement was presented as
ensuring the body was the owner's own words. It never did: `source_message_ids`
constrains which message is *named*, not what goes in `body`. An agent could
cite a real message and write anything. A person reading the body before it
lands is the assurance the citation was standing in for.

`source_message_ids` is kept, demoted to what it always honestly was — a
provenance record of which turn the entry came from, checked against this
conversation's user messages so it cannot point at an assistant turn or another
conversation. It is no longer load-bearing.

**The cost, stated plainly.** One click per capture where there were none, and
an unanswered approval expires with the run rather than persisting the way a
`proposals` row does. That is the right trade here because the owner is present
— they just said the thing — but it is the reason approval is used for
`record_entry` and **not** for the `propose_*` tools, whose whole value is that
a decision can wait a week.

### 6.2 The tool taxonomy needs a third category

Found while planning 2d-2, not during design. `toolGroups()` derives the agents
page from the registry's `writes` boolean, and the writing group renders with
the note *"you approve each"*. `record_entry` fits neither existing value:

- `writes: true` puts it under **"Proposes changes — you approve each"**, which
  is a false statement about the one tool in the system that does not work that
  way.
- `writes: false` puts it under **"Reads the record"**, hiding a write behind a
  read label.

The registry's own comment says the quiet part: *"a 'write' tool in this system
writes to `proposals` and nowhere else."* `record_entry` is the first tool that
is not true of, so the field stops being a boolean:

```ts
writes: false | 'proposes' | 'records'
```

`toolGroups()` gains a fourth group for `'records'`, with its own label and its
own note — the log, directly, no approval step. The agents page is the
capability model's only user-facing surface, and it must not tell the owner
they approve something they do not.

A union rather than a second `records: true` flag, because two booleans can
disagree: `writes: true, records: true` would have no defined meaning and
nothing would stop it being written. The union makes that state
unrepresentable, and forces every existing consumer to re-state what it meant
rather than defaulting silently — which is the point, since one of them
(`agents-registry.test.ts`) currently asserts that anything writing is named
`propose_*`.

## 7. The composer

### 7.1 Where it lives, and a constraint discovered while specifying

`CaptureBar` is mounted in `app/(workspace)/projects/[slug]/layout.tsx`, so it
renders on every project tab: resume, work, log, inbox, documents, agents,
settings. "Replace the capture bar" therefore cannot mean everywhere — a chat
composer on the log page, with the transcript on a different tab, would send
messages into a conversation the owner cannot see.

The resolution: **the composer is chat-capable only where the transcript is.**
On the resume view it is the Partner composer. On every other tab it stays
exactly the capture bar it is today. One component, one prop.

### 7.2 Behaviour

Chat-first, as the owner asked:

| Action | Effect |
|---|---|
| `⌘↵` | Send to the Partner |
| `⌘⇧↵` | Record directly via `captureEntryAction` — no run, no cost, no gateway |

The direct path is also the **automatic fallback**. When `startAgentRun`
refuses for budget, or the gateway errors, the composer switches to
record-only and says which happened. "Out of budget" degrades to a working
notebook rather than a dead input, which criterion 5 exists to guarantee.

The existing capture affordances — the entry-kind select and the work-item
target picker — remain on the direct path. They are what make a capture a
*filed* capture, and losing them would be a regression dressed as a feature.

### 7.3 Voice

No avatars, no bubbles with tails, no typing-indicator ellipsis animation, no
sparkle iconography. The transcript is set in the same paper/ink/rule system as
the log: the owner's turns and the Partner's are distinguished by a label and
alignment, not by chat-app chrome. PRODUCT.md names the AI-startup register as
the primary anti-reference, and a chat surface is where a product most easily
drifts into it.

## 8. Data

`conversations` and `messages` exactly as phase 2 §8 defines them — not
redesigned here. The creation order that section names is respected:
`agents` → `conversations` → `agent_runs` → `messages`, with
`agent_runs.conversation_id` added by `alter table` after both exist.

RLS follows the existing pattern longhand, per CLAUDE.md: flat ownership for
select and delete; insert and update additionally requiring the row's
`project_id` to belong to the caller.

**One rolling conversation per project in v1.** Resolved by
`getOrCreateConversation(projectId)`. The schema supports many and the picker
is a later addition; a thread per project is what "chat about the project"
means.

`agent_runs.trigger` already permits `'conversation'` — no change needed there.

## 9. Execution

The chat route streams, reusing the shape of
`app/api/agents/[agentId]/ask/route.ts`: `streamText`, `buildToolSet`, the
per-run token cap in `stopWhen`, and the shared metering in
`lib/agents/usage.ts`.

What is new is persistence. The user message is written **before** the run
starts, because `record_entry` validates against it — an unwritten message is
not a citable source. The assistant message is written on completion with its
`run_id`.

A run that fails after the user message is written leaves that message in
place. Losing what the owner typed is the worst failure this product has, and
a failed model call is not a reason to incur it.

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Monthly cap reached | Composer falls back to record-only, names the cap |
| Gateway error mid-stream | Run marked `failed`, user message kept, error shown, record-only offered |
| Partner deleted by the owner | Composer is the capture bar; the resume view says the Partner is missing |
| Delegated agent deleted | `ask_agent` returns a refusal the Partner relays; the conversation continues |
| Delegated run hits the cap | Same — reported, not thrown |
| `record_entry` cites an unknown message | Call fails, nothing written, the Partner is told why |
| Conversation row missing | Created on demand; a chat cannot 404 |

Every row ends with the owner still able to record.

## 11. Accessibility

- The transcript is a labelled `log` region with `aria-live="polite"`, so
  streamed turns are announced without stealing focus from the composer.
- Both send paths are reachable from the keyboard and both are described in
  visible helper text, not only in a tooltip.
- Streaming status is text, never a spinner alone.
- `prefers-reduced-motion` disables any token-reveal animation; the transcript
  must be fully legible with all motion removed.

## 12. Testing

**Unit**
- `ask_agent` refuses `agent_slug: 'partner'` (no self-call).
- `ask_agent` is absent from every seeded template except `partner` — the
  property that makes nesting impossible.
- The Partner's allowlist contains no `propose_*` tool.
- `record_entry`'s source validation: unknown id, assistant-role id, and an id
  from another conversation each reject; a valid user message passes.
- Composer mode selection: cap-refused and gateway-error states both resolve
  to record-only.

**RLS**
- A second user can read neither conversation nor messages.
- A message cannot be inserted into another owner's conversation.
- A delegated proposal carries the sub-agent's ids and satisfies the composite
  provenance key.

## 13. Delivery

**2d-1 — Data and delegation.** The migration, `conversations`/`messages`
queries, `ask_agent`, the Partner template, its `RATES` row (§4.1), unit and
RLS tests. No UI. At the end of this slice delegation is provable without a
chat surface existing.

**2d-2 — `record_entry`.** The tool, its server-side source validation, and
its tests. Still no UI.

**2d-3 — The surface.** The transcript, the composer and its two send paths,
streaming, persistence, locale strings, and the fallback behaviour. Ends with
a live pass, which the intake work showed is where model-facing defects are
actually found.

## 14. Decisions taken during design

1. **Delegation as a tool, sub-agent under its own allowlist** — rather than
   giving the Partner the union of everyone's tools, which would make every
   allowlist routable-around and void the phase-2 constraint.
2. **The Partner holds no `propose_*`.** Reversal: grant it
   `propose_work_item` if the delegation round-trip on "add a task" proves
   annoying in use. Nothing else changes.
3. **One composer, chat-first, replacing the capture bar on the resume view
   only.** §7.1.
4. **Direct capture survives** as a modifier send and as the automatic
   fallback. Without it, capture inherits every failure mode of the model
   layer, and PRODUCT.md's claim that capture must be one keystroke away stops
   being true exactly when the budget runs out.
5. **`record_entry` asks before it writes**, via AI SDK tool approval — §6.1.
   Reversed from the original design, which wrote directly and amended the
   phase-2 constraint to justify it. The amendment turned out to be
   unnecessary, and the guarantee it rested on was weaker than it claimed.
6. **One conversation per project** in v1.
7. **The Partner runs on `zai/glm-5.3-flash`**, verified against the live
   gateway and priced from the gateway's own figures. Every other seeded agent
   keeps `DEFAULT_MODEL`.
8. **`writes` becomes a union rather than a boolean** — §6.2. Found while
   planning 2d-2; recorded here because it changes a user-facing label on the
   agents page, not only a type.

## 15. Risks

**AI SDK Elements against Tailwind 3.** The repository is on `3.4.19`;
current shadcn registries target v4 and the Elements documentation states no
floor. Slice 2d-3 opens with a throwaway install to find out. If it requires
v4, the fallback is `useChat` from `@ai-sdk/react` with the existing
`packages/ui` primitives — which given §7.3 may produce a better result
anyway, since Elements components arrive in precisely the register PRODUCT.md
excludes and would need stripping back regardless.

**Cost per conversation is unbounded**, unlike the intake's fixed two runs. A
long thread with delegation can spend real money. The monthly cap is the
backstop and it already works; what does not exist is any in-conversation
signal of spend. Out of scope here, worth a decision before this is used in
earnest.

## 16. Open questions

None. Every judgment call is recorded in §14 with its reasoning and its
reversal path.

# Workspace Dashboard Design

**Status:** approved design, not built.
**Supersedes:** the top-bar shell in `apps/app/components/shell/workspace-chrome.tsx`.
**Related:** [PRODUCT.md](../../../PRODUCT.md) · [grounded co-partner design](2026-07-30-goalspace-grounded-copartner-design.md) · [ROADMAP](../../ROADMAP.md)

---

## 1. Premise

The workspace outgrew its shell. It shipped with four sections in a single
top bar, and phase 2 has since added agents, runs, proposals, and spend, with
documents still unreachable. A horizontal bar cannot hold nine destinations
without wrapping, and the sections it does hold are already competing with a
project switcher and an account menu on one line.

This replaces it with a persistent sidebar scoped to one project, and builds
the four surfaces the sidebar would otherwise advertise and not have:
documents, agents, run traces, and settings.

**It is a shell and surface change. No agent, proposal, or capture behaviour
changes.**

## 2. Scope

**In scope:** the sidebar shell and header rail; documents list and editor;
agents list and editor; the run trace; project settings; account settings.

**Non-goals**

| Non-goal | Rationale |
|---|---|
| Redesigning Resume, Work, or Log | They are reflowed into the new shell. Resume gains exactly one line — see §6.5 — and is otherwise untouched. Their content is not the problem. |
| Changing quick capture | The highest-frequency interaction in the product. It stays mounted in the project layout, at the bottom of the content area, unchanged. |
| A conversations or ask surface | Phase 2c. The sidebar leaves room for it; this spec does not build it. |
| Multi-project navigation | One project is in focus. The switcher changes which. See §5. |
| shadcn's default visual language | Structure is borrowed, skin is not. See §4. |
| Mobile-first redesign | Responsive, yes — the sidebar collapses to a sheet. But the daily surface is a desktop one and the layout is designed there first. |

## 3. Success criteria

1. Every destination in the sidebar resolves to a working page. Nothing is
   advertised that does not exist.
2. A person can read a document, edit it, and see the previous version — the
   revision system phase 1 built and nothing has ever surfaced.
3. A person can see what an agent may do, change it, and have the change take
   effect on the next run, with each tool labelled by what it permits.
4. A run's trace shows every tool call with its arguments, its outcome, the
   proposals it produced, and what it cost.
5. Month-to-date spend and both caps are visible and editable. Today the caps
   silently govern whether runs are refused and nothing shows them.
6. The keyboard path is unbroken: skip link, focus order, `aria-current`, and
   a labelled landmark for each of sidebar, main, and capture.
7. Layouts survive `ms` and `zh` strings roughly 40% longer than English.

## 4. Visual language

The shell borrows shadcn's **sidebar structure** — the collapsible primitive,
the rail, the mobile sheet, the group/item/badge composition — and none of its
skin. The Workshop Manual system stands: warm paper in OKLCH, Archivo and
Azeret Mono, hairline rules, `oxide` for the active state.

Concretely, when the shadcn block and the system disagree, the system wins:

| shadcn default | Here |
|---|---|
| Cards with shadow and radius | Hairline rules. No elevation, no rounded containers. |
| Cool neutral grays | `paper` / `paper-shade` / `ink` / `ink-soft` / `rule` / `rule-strong` |
| Filled active pill | `border-oxide` left edge and `text-ink`, matching the existing bottom-border idiom rotated 90° |
| Lucide icons throughout | Text labels. Icons only where a label cannot fit — the collapsed rail. |
| Badge component for counts | A right-aligned numeral in `ink-soft`. A count of zero renders nothing. |

`packages/ui` already carries every primitive shadcn's sidebar depends on:
sheet, tooltip, separator, skeleton, input, button, slot. Only the `useIsMobile`
hook is missing and is added with it.

**Anti-references still apply.** No progress celebration, no streaks, no
badges in the achievement sense. A count next to Inbox is a quantity, not a
score.

## 5. Shell architecture

```
┌──────────────┬────────────────────────────────────────┐
│ EV bike    ▾ │  Log                          [account]│  ← header rail
├──────────────┼────────────────────────────────────────┤
│ Resume       │                                        │
│ Work         │  content                               │
│ Log          │                                        │
│ Inbox      3 │                                        │
│ Documents    │                                        │
│ Agents       │                                        │
│              │                                        │
│ ──────────── │                                        │
│ Settings     │                                        │
├──────────────┼────────────────────────────────────────┤
│              │  [capture…                            ]│  ← unchanged
└──────────────┴────────────────────────────────────────┘
```

**The sidebar is always project-scoped.** It never represents two kinds of
thing at once, which is what keeps it readable. The project switcher sits at
its head; account settings live behind the account control in the header rail
and route to `/settings`.

This is approach A of three considered. The alternatives were a separate
account route group with its own shell — a lot of scaffolding for three
fields — and a single settings route mixing both scopes, which puts "delete
this project" and "change your theme" in one tab strip.

**Run traces are not in the sidebar.** A run is reached from the agent that
produced it or the proposal it created, never browsed as a top-level list.

**Preserved from the current shell**, because each exists for a reason
recorded in its own comment:

- The skip link, positioned by `transform` rather than `sr-only
  focus:not-sr-only` — that pairing's behaviour depends on Tailwind utility
  ordering and can reflow the page.
- Section nav derived from the URL, not from props, so nav and page cannot
  disagree during a client transition.
- `/projects/new` resolving as a static route rather than a slug, which
  previously produced nav pointing at `/projects/new/work`.
- Sign-out navigating regardless of whether `signOut` rejects.

**Collapse behaviour.** The sidebar collapses to an icon rail on desktop and to
a sheet below `md`. Collapsed state persists per user in a cookie, read on the
server so the first paint is not wrong.

## 6. Surfaces

### 6.1 Documents — `/projects/[slug]/documents`, `/documents/[docId]`

The list is title, when it last changed, and whether an agent authored the
current body. The editor is a title field and a body field, saving through
`updateDocument`, which already writes a revision before every update.

Each document shows its revision history: when, and who — an `agent_id` or the
owner.

**Restoring goes through the revision, not around it.** A revision opens
read-only, in full, with the restore action on that view. There is no
confirmation dialog: a dialog asking whether you are sure about a body you
cannot see is worse than simply showing you the body. Restoring is an ordinary
update whose body is the old body, so the current body becomes a revision in
turn and nothing is lost — the operation is reversible by repeating it.

This closes the oddity that an agent can propose edits to documents a person
cannot author. `lib/db/documents.ts` already exists from phase 2b.

### 6.2 Agents — `/projects/[slug]/agents`, `/agents/[agentId]`

The list is name, role description, model, whether active, and its tool count.

The editor covers name, role description, system prompt, model, active, and
the tool set. **Tools are grouped by what they permit, not alphabetically:**

```
READS THE RECORD          search_repo, list_entries,
                          list_work_items, get_work_item,
                          read_document
PROPOSES CHANGES          propose_entry, propose_work_item,
— you approve each        propose_document_edit
LEAVES THE SYSTEM         (none yet — web_search, generate_audio)
```

The grouping comes from `REGISTRY[name].writes` and `.external`, so a tool
added later files itself. The owner may grant or revoke anything registered,
including on the seeded Critic and Tutor; the capability boundary exists to
stop a *model* exceeding what the owner granted, not to stop the owner.

**Deleting an agent is refused while it has runs**, because `agent_runs.agent_id`
cascades and would take the trace and its proposals with it. Deactivating is
offered instead.

### 6.3 Run trace — `/projects/[slug]/runs/[runId]`

Status, step count, duration, and cost, then every tool call in order with its
arguments, whether it succeeded, its duration, and its result summary; then
every proposal the run produced and what became of each.

The spec calls this both the debugging surface and the privacy surface: it is
where an owner sees what left the system. Nothing here is aggregated away —
arguments are shown verbatim.

### 6.4 Project settings — `/projects/[slug]/settings`

- **Title, brief, status** (`active` / `paused` / `done` / `abandoned`).
- **Agent spend:** month-to-date from `ai_usage`, against `monthly_cap_usd`.
  Both caps editable. The page states the worst-case reservation at the
  project's current models, because that figure — not the average — is what
  decides whether a run is refused.
- **Danger zone:** delete the project. Cascades to every entry, work item,
  document, attachment, agent, run, proposal, and usage row. Requires typing
  the project's slug to confirm.

### 6.5 Resume — one addition

Resume exists to surface open loops on return. Phase 2b created a new kind of
open loop and left it invisible: a proposal you never decided sits in the inbox
and is nowhere on the surface designed to answer *what is outstanding*.

Resume gains one line — undecided proposals, in the existing idiom alongside
open questions and blocked items. Nothing else about it changes.

This is safe from becoming noise because agents never run proactively (a stated
non-goal of the phase-2 design): the only proposals that can exist are ones a
run you started produced, and the only ones counted are ones you left undecided.

### 6.6 Account settings — `/settings`

Theme, language, time zone, email notifications.

Theme and notifications map to existing `user_settings` columns. **Language
and time zone do not exist and need a migration** (§7). Time zone closes
open issue #14.

## 7. Data work required

The shell is the smaller half. These are missing today:

| Need | State |
|---|---|
| `user_settings.locale`, `user_settings.time_zone` | **Migration.** Locale is cookie-only; time zone is issue #14. |
| `updateProject`, `deleteProject` | **New.** `lib/db/projects.ts` has create and read only — a project is currently fixed forever once made. |
| `listAgents`, `getAgent`, `updateAgent` | **New.** `lib/db/agents.ts` holds only `startAgentRun`. |
| `getRun`, `listToolCalls`, `listRunProposals` | **New.** No read path for traces exists. |
| `getBudget`, `updateBudget`, `monthToDateSpend` | **Partly.** The route handler has private copies; they move to `lib/db/`. |
| Document queries | **Exists** from phase 2b. |
| Agent schemas (`lib/schemas/agent.ts`) | **New.** Named in the phase 2a file structure, never written. |

`updateAgent` validates `tools` against `REGISTRY_NAMES` server-side. An
unknown tool name is rejected rather than stored — `resolveTools` drops unknown
names silently at run time, which would make a typo look like a working grant.

## 8. Accessibility

WCAG 2.1 AA, per PRODUCT.md.

- Landmarks: `<nav aria-label>` for the sidebar, `<main id="workspace-main">`,
  and a labelled region for capture.
- `aria-current="page"` on the active item. The `oxide` edge is never the only
  signal.
- Work-item and run statuses carry a label or shape, never colour alone.
- The collapsed rail exposes each item's name via tooltip **and** accessible
  name; an icon alone is not a label.
- `prefers-reduced-motion` honoured for the collapse transition.
- Body measure capped at 65–75 characters in documents and run traces.
- Every string in `en`, `ms`, `zh`. Sidebar labels are the tightest constraint —
  the collapsed rail must not be sized to English.

## 9. Delivery

One design, several plans. Each slice ships working software and is reviewable
alone.

| Slice | Contents | Depends on |
|---|---|---|
| **A. Shell** | Sidebar primitive in `packages/ui`, the new shell, the four existing routes reflowed, and Resume's undecided-proposals line (§6.5). Placeholder-free: only working destinations appear. | — |
| **B. Documents** | List, editor, revision history. | A |
| **C. Agents + runs** | Agent schemas, db module, list, editor with grouped tools, run trace. | A |
| **D. Settings** | Migration for locale and time zone; project settings incl. spend, caps, delete; account settings. | A |

B, C, and D are independent of each other. A is the only ordering constraint.

## 10. Decisions taken during review

- **Restoring a revision needs no dialog.** It needs the revision on screen.
  Resolved in §6.1: view read-only, restore from there.
- **Resume gains one line, not a redesign.** Resolved in §6.5. The wider
  question — whether the re-entry surface wants rethinking once agents are
  conversational — is deliberately left to phase 2c, so it is answered once
  rather than twice.

No open questions remain.

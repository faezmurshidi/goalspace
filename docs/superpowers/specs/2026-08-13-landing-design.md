# Goalspace Landing Page

**Date:** 2026-08-13
**Status:** Approved design brief, ready for implementation planning
**Surface:** `apps/web`, the public marketing site
**Register:** brand

Prerequisites: `2026-08-13-monorepo-split-design.md` (creates `apps/web`),
`PRODUCT.md` (strategy), `DESIGN.md` (visual system tokens).

---

## 1. Why the page is being replaced, not refreshed

The current landing sells a product that no longer exists. Its sections argue
that an AI assistant analyses your goal, breaks it into learning spaces, assigns
each a mentor, and generates modules. Phase 1 deleted that product: the
`generate-*` endpoints, the mentor chat, the spaces and modules tables, and the
premise underneath them, on the grounds that goal generation is now free in any
chat product and is not itself a product.

So `components/sections/*` is not stale styling. It is accurate marketing for
software that was intentionally removed. Every section is replaced.

---

## 2. Brief

**Summary.** A single production landing page aimed at a builder eighteen months
into an unpaid project, arguing that the cost of returning is the real enemy and
that Goalspace is a repository built for the return. It converts to signup at
`${NEXT_PUBLIC_APP_URL}/login` under explicit early-access framing.

**Primary user action.** Recognise their own situation in a rendered record,
then start one. Everything else is subordinate to that recognition.

**Audience.** Builders first: the multi-month physical or software build. The
learn and research cases are served by the same page but are never the example.

**Scope.** Production quality, full page, plus the header and footer system the
blog inherits. Shipped, not explored.

**Anti-goals.** Anything in the PRODUCT.md anti-reference list, and in
particular the AI startup gradient. No streaks, badges, confetti, or celebration
of starting. No feature-card grid.

---

## 3. Positioning and the AI question

The page **leads with AI**, and the honesty problem this creates is solved by
framing rather than by hedging.

A visitor who signs up today gets the record: projects, log, work items,
documents, the resume view. There is no agent yet. Claiming otherwise would burn
the first user, and burying the claim would waste the positioning.

The resolution is **early access with a dated promise**. The page states that
the agent reads your repository, states plainly that it is not shipped, and
turns the gap into the reason to start now: the agent is only as good as the
record it reads, so the record has to exist first. The visitor who starts today
is building the thing that makes the later feature work.

This is load-bearing. Principle 4 in PRODUCT.md ("every promise carries a date")
exists to keep it honest, and the copy review before launch checks every AI
sentence for correct tense.

---

## 4. Visual direction

Full token definitions live in `DESIGN.md`. The rationale is recorded here.

**Aesthetic lane: the shop manual.** Exploded views, numbered callouts on leader
lines, dimension ticks, plate borders, sheet metadata in the margin. Chosen
because it is the visual world the builder audience already lives in, because it
renders the product's actual content (a project with parts, dates, and open
questions) rather than decorating around it, and because it is nobody's first or
second reflex for an AI product. The three saturated lanes (editorial-serif,
terminal-dark developer tool, AI-gradient SaaS) were rejected explicitly.

**Colour: Committed, with a drenched hero.** Ground is warm manual paper, not
white. Ink is graphite, not black. The committed colour is red-oxide primer,
the colour of a welded frame that is not finished yet, which is a physically
true reference for the audience rather than a decorative choice. One secondary
signal only, a flat waiting-blue for blocked and wake states.

**Theme: light, deliberately.** The scene sentence is a builder opening a laptop
at 9pm on a cluttered garage bench under one task lamp, returning to something
last touched in March. The room is dark; the manual page under the lamp is not.
A dark page here would land directly in the developer-tool reflex the lane
exists to avoid. The page has no dark mode and no theme toggle. Theming belongs
to the workspace application.

**Type: Archivo plus Azeret Mono.** Archivo is a variable family with a width
axis, used expanded and heavy for display in the register of a stamped manual
cover, and at normal width for body. Azeret Mono is reserved for technical
annotation: plate numbers, dates, part references, dimension labels. Monospace
is legitimate here because the annotated content genuinely is technical, not
because the product is software. The reflex candidates (Inter, IBM Plex,
Space Grotesk) were rejected as training-data defaults.

**Imagery: drawing only, no photographs.** Every figure is hand-authored SVG.
This themes, animates, localises, and stays sharp at any size, and it avoids
stock photography of a tidy maker space that is visibly not the author's
project. It is the most work per section and the highest ceiling.

---

## 5. Page structure

Six plates. One dominant idea per fold, ruled borders, sheet metadata in the
margin, strict visible grid as the voice rather than an asymmetric composition.

### Plate 00: Hero

Drenched oxide ground, paper-coloured type. The headline is about coming back,
not about goals. Beneath it, an exploded view of a project's state, which is
also the page's first proof: the callouts point at real things (an open
question, an item blocked since a real date, the last session).

Primary call to action: start the record. Secondary: a text link to what exists
today, anchored at Plate 04.

### Plate 01: The return

The money shot. The resume view rendered as an annotated figure with numbered
leader lines: "away 23 days" as the largest element, then what is open, what is
blocked and since when, and the last decision recorded. This is the product's
actual screen drawn in manual style, not a floating screenshot.

### Plate 02: How the record accrues

A mechanism diagram, not feature cards. Closing a work item captures the entry
that closed it, permanently attached. The argument is that nobody writes
documentation, they just finish things, so the record is a by-product of use
rather than a second job.

### Plate 03: What this is not

Stated flatly, as a manual states a limit: not a task manager, not a wiki, no
streaks, no reminders, no habit tracking. Cheap to build, highly memorable, and
it does real filtering work at the top of the funnel. The voice carries this
section entirely.

### Plate 04: The agent, with a date on it

The early-access framing from §3. Two columns under one rule: what exists today,
what comes next. No blurring.

### Plate 05: Start

Signup, with the phase stated honestly in one line. Single call to action to
`${NEXT_PUBLIC_APP_URL}/login`.

### Footer

A manual colophon: revision, date, locale switch, blog link. Not a sitemap with
four columns of links the site does not have.

---

## 6. Content dependency

Principle 1 in PRODUCT.md requires a real record on the page, and the author is
supplying one from a real project of theirs.

Required: roughly fifteen log rows (month, what happened, kind: note, decision,
source, or session), two or three real blockers with what was being waited on
and for how long, and two or three decisions worth having written down.

Until it arrives, sections are built against the structure with placeholder
content drawn from the Phase 1 spec's examples. **Placeholder content does not
ship.** The page does not go to production carrying a fictional log, because a
constructed record undermines the one claim the page is making.

---

## 7. States and constraints

| Concern | Requirement |
|---|---|
| Responsive | Down to 360px. Leader lines reflow to stacked numbered callouts rather than shrinking illegibly. |
| Reduced motion | `prefers-reduced-motion` renders every drawing in its final state. The page is fully legible with all motion removed. |
| No JavaScript | Full content renders. Motion and the locale switcher are the only losses. |
| Locale | `en`, `ms`, `zh`. Layouts survive strings roughly 40% longer than English. Annotation labels are translated, not left in English as decoration. |
| Accessibility | WCAG 2.1 AA. Status is never colour alone. Callouts and leader lines carry their meaning in text for screen readers, not in decorative SVG. Body measure 65 to 75 characters. |
| Performance | Statically rendered, no session read, no client-side data fetch. Fonts self-hosted and subset. SVG figures inline rather than fetched. |

---

## 8. Motion

One orchestrated page load in the hero: the drawing assembles and the callouts
number in sequence, ease-out-expo, under 900ms total. On scroll, dimension lines
extend as each plate enters the viewport.

Animation is applied to stroke geometry and opacity, never to layout properties.
No bounce, no elastic, no parallax. Hover never carries meaning; the two calls
to action are the only interactive elements on the page.

The motion is on brief rather than decorative: a manual figure assembling itself
is the same gesture as a project being understood.

---

## 9. Open questions

Resolved during implementation, none blocking.

1. Whether the blog is replated into the same system now or kept as-is until the
   landing ships. Recommendation: keep it, replate immediately after.
2. Whether `en` copy is written first with `ms` and `zh` regenerated afterwards.
   The Phase 1 spec assumed this order, and this page should follow it.
3. Whether Plate 03's list is set as running prose or as a ruled table. Decide
   with the real copy in place, not before.

---

## 10. Non-goals

| Non-goal | Rationale |
|---|---|
| Dark mode on the landing | The page commits to paper. Theming belongs to the workspace. |
| Pricing page | Nothing is priced. Phase 5 changes this. |
| Testimonials, logos, social proof | There are no users to quote. Fabricating them contradicts the entire premise. |
| Waitlist form | The decision is to convert to signup, not to collect emails. |
| Photography | Deferred until the author has real workbench photographs worth shipping. |
| Reusing any existing section component | Every one describes the deleted product. |

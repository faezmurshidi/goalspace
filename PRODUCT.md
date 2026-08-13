# Product

## Register

brand

Applies to the marketing surface (`apps/web`). The workspace application
(`apps/app`) is a **product** register surface; tasks that name it, or that touch
its files, override the default above.

## Users

People running long, hard, self-directed projects: builds, learning campaigns,
and independent research. The landing page is designed first for **builders**,
the person eighteen months into a physical or software build that nobody is
paying them to finish.

Their context is not the enthusiastic start. It is the return. They open the
project after three weeks (or three months) away and have lost where they were,
what they had already decided, what they were waiting on, and why they abandoned
the approach that looked promising in month two. The parts on the bench no longer
explain themselves.

The job to be done: **make coming back cheap.** Not planning, not motivation, not
task management. Re-entry.

Their tools have all failed at exactly this point, which is why they are reading
the page at all: Notion rotted into a graveyard, the issue tracker only knows
what is open, and the chat threads where they actually reasoned through decisions
have no memory across sessions.

## Product Purpose

Goalspace is a repository for one long project. A log of what happened
(notes, decisions, sources, sessions), work items for what is next (nested,
with real statuses including blocked and a wake date), and documents as living
artifacts. The record accrues as a by-product of daily use, because nobody
maintains a journal deliberately for two years.

The workspace is the daily surface. The resume view is the product: open it
after a month away and it answers what is open, what you last did, and what you
already decided, without navigation.

What ships today is the record. The agent that reads your repository back to you
is next, and the page says so in those terms: **you start the record now so the
agent has something worth knowing later.** Success is a visitor who signs up
understanding exactly what exists today and why starting early is the point.

## Brand Personality

Workmanlike, exacting, unsentimental.

The voice of a good service manual: it tells you the torque figure and does not
congratulate you for asking. It respects that the reader has done hard things
before. No encouragement, no streaks, no celebration of starting. The product is
for the unglamorous middle of a project, and the writing sounds like it.

Concrete over abstract, always. "The motor you ordered in March should have
arrived" is the register. "Achieve your goals" is not.

Emotionally, the page should land as recognition: someone has clearly been in
the same hole. Relief, not excitement.

## Anti-references

**AI startup gradient (primary).** Purple-to-blue washes, glowing orbs, sparkle
icons, "supercharge your workflow". This is the costume of the exact category
Goalspace is entering, and wearing it forfeits the only advantage a small
product has, which is looking like it was made by someone specific.

Secondary, by consequence of the chosen visual direction: the anonymous dark
dev-tool clone (monochrome black, grid glow, floating screenshot hero), the
friendly-productivity illustration style (pastel blocks, rounded cartoon people,
cheerful onboarding voice, wrong register for a two-year build), and the
magazine-editorial default (display serif italic, drop caps, ruled columns, no
imagery).

Also banned: streaks, badges, confetti, progress celebration of any kind. The
product explicitly excludes habit and adherence tracking, and the marketing must
not imply otherwise.

## Design Principles

1. **Show the record, do not describe it.** Put a real log, a real blocked item
   with a real date on the page. Feature cards describing capabilities are the
   weakest available argument for a product whose whole claim is that the
   artifact is worth having.
2. **Elapsed time is the emotional payload.** "Away 23 days", "blocked since
   March", "six-week lead time". Durations do the persuading. Any beat of the
   page that could carry a duration should carry one.
3. **Specific beats representative.** One named project with a real part number
   convinces where three generic personas do not.
4. **Every promise carries a date.** What exists now and what comes next are
   never blurred. The early-access framing is an asset only while it stays
   scrupulously honest.
5. **Designed for the return, not the start.** Onboarding, setup, and goal
   creation are the least interesting things here. The page should sell the
   twentieth session, not the first.

## Accessibility & Inclusion

WCAG 2.1 AA minimum.

- Status is never encoded by color alone. Open, doing, blocked, done, and
  dropped need a label or a shape as well as a hue, both on the marketing page
  and in the product.
- `prefers-reduced-motion` is honored for every entrance, reveal, and
  scroll-driven effect. The page must be fully legible with all motion removed.
- Body measure capped at 65 to 75 characters.
- Technical-drawing devices (leader lines, callout numbers, annotations) must
  carry their meaning in text for screen readers, not in decorative SVG alone.
- Interface serves `en`, `ms`, and `zh`. Layouts must survive strings roughly
  40% longer than the English original without breaking.

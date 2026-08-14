---
name: Goalspace
description: A repository for one long project, drawn like a workshop manual.
colors:
  paper: "oklch(0.96 0.008 85)"
  paper-shade: "oklch(0.93 0.010 85)"
  ink: "oklch(0.22 0.012 60)"
  ink-soft: "oklch(0.45 0.010 60)"
  rule: "oklch(0.78 0.010 70)"
  oxide: "oklch(0.55 0.15 35)"
  oxide-deep: "oklch(0.44 0.14 33)"
  waiting: "oklch(0.55 0.09 240)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, Helvetica Neue, sans-serif"
    fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo Variable, Archivo, Helvetica Neue, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo Variable, Archivo, Helvetica Neue, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo Variable, Archivo, Helvetica Neue, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  callout: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"
  2xl: "112px"
components:
  button-primary:
    backgroundColor: "{colors.oxide-deep}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "32px"
  plate-drenched:
    backgroundColor: "{colors.oxide-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "32px"
  callout-number:
    backgroundColor: "{colors.oxide}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.callout}"
    size: "22px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
---

# Design System: Goalspace

## 1. Overview

**Creative North Star: "The Workshop Manual"**

Goalspace is documentation for a project that is not finished. The system takes
its form from the printed workshop manual: a plate number in the margin, an
exploded view with numbered callouts on leader lines, dimension ticks, a ruled
border, and text that tells you the torque figure without congratulating you for
asking. Nothing here is atmospheric. Every mark either labels something or
measures something.

The density is high and the ornament is zero. Surfaces are flat paper with
hairline rules. Depth comes from layering plates and from the weight of the
ink, never from a shadow. The one saturated colour is red-oxide primer, the
coat on a welded frame that has not been finished yet, and it is used where the
record is live: dates, callout numbers, the drenched hero. The page reads as an
object that was printed rather than a screen that was designed.

What this system rejects, in the strongest terms: the AI startup gradient, which
is the costume of the entire category and the fastest way to look like every
other product; the anonymous dark developer tool; friendly-productivity
illustration; and the magazine-editorial default of a display serif italic over
ruled columns. It also rejects every form of encouragement. There are no
streaks, no badges, no celebration of starting, because the product deliberately
excludes habit tracking and the interface must not imply otherwise.

**Key Characteristics:**

- Printed, not rendered. Plate borders, sheet metadata, annotation in the margin.
- Flat by construction. Hairline rules and paper tones do all the structural work.
- Light ground on purpose. The room is dark; the manual under the lamp is not.
- One committed colour, used where work is live.
- Square corners everywhere except the circled callout number.
- Every duration visible. Elapsed time is content, not decoration.

## 2. Colors

A printed palette: warm paper, graphite ink, and the primer colour of unfinished
steel.

### Primary

- **Oxide Primer** `oklch(0.55 0.15 35)`: the committed colour. Callout numbers,
  dates, section rules, large display accents, and any mark that says this part
  of the record is live. Never used for body text; its contrast against paper is
  sufficient for large type and marks only.
- **Oxide Deep** `oklch(0.44 0.14 33)`: the drenched ground for the hero plate
  and the fill for the primary button. Carries paper-coloured type at roughly
  7:1, which is what makes the drench safe for real content rather than
  decoration.

### Secondary

- **Waiting Blue** `oklch(0.55 0.09 240)`: the only other signal colour. Marks
  blocked items and wake dates, the states where the project is waiting on the
  world rather than on the author. Deliberately desaturated so it never competes
  with the primer.

### Neutral

- **Manual Paper** `oklch(0.96 0.008 85)`: the page ground. Warm, tinted toward
  the primer hue, never `#fff`.
- **Paper Shade** `oklch(0.93 0.010 85)`: alternating plates, figure grounds,
  and table banding. The only tonal step available for layering.
- **Graphite Ink** `oklch(0.22 0.012 60)`: all body and display text, and all
  drawn line work. Never `#000`.
- **Soft Ink** `oklch(0.45 0.010 60)`: annotation text, captions, and the sheet
  metadata in the margin.
- **Rule** `oklch(0.78 0.010 70)`: hairline borders, dimension ticks, leader
  lines, table rules. One weight, 1px, everywhere.

### Named Rules

**The Primer Rule.** Oxide is the colour of work in progress. It marks what is
live in the record: a date, a callout, an open item. It is never applied for
emphasis alone, and never to a decorative element.

**The Two Signals Rule.** Exactly two colours carry state: oxide for live,
waiting-blue for blocked. A third signal colour is forbidden. Additional states
are expressed through label and shape.

**The No Pure Neutral Rule.** No `#000`, no `#fff`, no untinted grey. Every
neutral carries a trace of the primer hue.

## 3. Typography

**Display Font:** Archivo Variable (with Helvetica Neue, sans-serif)
**Body Font:** Archivo Variable (same family, normal width)
**Label/Mono Font:** Azeret Mono (with ui-monospace, monospace)

**Character:** One utilitarian grotesk doing two jobs through its width axis:
expanded and heavy it reads as a stamped manual cover, at normal width it reads
as plain technical prose. Against it, a squared monospace that appears only
where a manual would set annotation. The pairing is hard-wearing rather than
refined, and it is deliberately not the reflex choice for a software product.

### Hierarchy

- **Display** (800, `clamp(2.75rem, 6.5vw, 5.5rem)`, 0.95, `wdth 125`): plate
  headlines and the one number per section that carries the argument, such as an
  elapsed duration.
- **Headline** (700, `clamp(1.75rem, 3vw, 2.5rem)`, 1.05, `wdth 112`): plate
  titles and section openers.
- **Title** (600, 1.25rem, 1.2): figure titles, table headers, work item names.
- **Body** (400, 1.0625rem, 1.6): running prose, capped at 65 to 75 characters.
- **Label** (Azeret Mono 500, 0.75rem, `0.08em`, uppercase): plate numbers,
  dates, part references, dimension labels, button text, status chips.

### Named Rules

**The Annotation Rule.** Azeret Mono is permitted only where a printed manual
would set annotation: numbers, dates, references, dimensions, and short status
labels. Never for body copy, never for headlines, never as shorthand for
"technical". Mono used decoratively is costume.

**The Width Axis Rule.** Weight and width move together and in one direction:
the larger the type, the wider and heavier. Never set body copy at an expanded
width, and never set display type at normal width.

**The Duration Rule.** Any figure expressing elapsed time is set at display
scale, in ink, with its unit in the label style beside it. Durations are the
argument; they are never reduced to caption size.

## 4. Elevation

The system has **no shadows at all**. Not subtle ones, not ambient ones. A
printed page does not cast a shadow onto itself, and the moment one appears the
whole conceit collapses into a generic card interface.

Depth is carried by three devices instead: hairline rules at a single 1px
weight, one tonal step between Manual Paper and Paper Shade, and the drenched
oxide plate, which separates by colour rather than by height. Where a
conventional design would raise a surface, this system draws a border around it
and prints a plate number in the corner.

### Named Rules

**The No Shadow Rule.** `box-shadow` is prohibited except for the focus ring
required by accessibility. If an element needs to feel separate, give it a rule
and a plate number.

**The One Weight Rule.** Every border, leader line, dimension tick, and table
rule is 1px in the Rule colour. Heavier strokes are reserved for drawn figure
outlines, which are ink, not borders.

## 5. Components

### Buttons

- **Shape:** Square corners, no radius (0px). Non-negotiable across the system.
- **Primary:** Oxide Deep fill with Manual Paper text, label typography,
  uppercase, `16px 32px` padding. Reads as a stamped instruction.
- **Hover / Focus:** Background shifts to Graphite Ink over 150ms ease-out. No
  transform, no lift, no scale. Focus-visible draws a 2px Oxide outline offset
  by 2px, the single sanctioned exception to the shadow prohibition.
- **Ghost:** Paper background, 1px Rule border, ink text. Used for the secondary
  action only, never twice on one plate.

### Cards / Containers

The system does not use cards. It uses **plates**, and the distinction is
enforced.

- **Corner Style:** Square (0px).
- **Background:** Manual Paper, or Paper Shade when a plate must separate from
  its neighbour, or Oxide Deep when the plate is drenched.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px Rule on all four sides. Never a thick coloured edge on one
  side.
- **Internal Padding:** 32px, rising to 64px on plates that carry a figure.
- **Required marks:** a plate number set in label typography in the top left of
  the margin, and sheet metadata (revision, date) in the bottom right. A plate
  without its number is just a box.

Nested plates are forbidden. A figure inside a plate is a figure, drawn with ink
outlines, not a second bordered container.

### Inputs / Fields

- **Style:** Paper background, 1px Rule border, square corners, `12px 16px`
  padding, body typography.
- **Focus:** Border shifts to Oxide and the ring described under Buttons
  appears. No glow.
- **Error:** Border shifts to Oxide with an error message in label typography
  directly beneath. Colour never carries the error alone.

### Navigation

Label typography, uppercase, ink, separated by a 1px vertical rule rather than
by spacing alone. Active state is an oxide underline at 2px, offset 6px. No
pill, no background fill, no hover reveal. On mobile the rules become horizontal
and the navigation stacks; it does not collapse into a hamburger drawer, because
there are at most four destinations.

### The Annotated Figure (signature component)

The system's defining element. A drawn SVG figure with numbered callouts on
leader lines pointing at its parts.

- Figure outlines in Graphite Ink at 1.5px, internal detail at 1px in Rule.
- Leader lines 1px Rule, always straight, always terminating in a dot at the
  subject and a circled number at the label.
- Callout numbers use the callout token: an Oxide circle, 22px, paper-coloured
  label type. This circle is the only rounded shape in the entire system.
- Every callout must exist as real text in the DOM, associated with the figure,
  so the meaning survives without the drawing.
- On viewports under 640px the leader lines are dropped and the callouts become
  a numbered list beneath the figure. The numbers stay identical.

## 6. Do's and Don'ts

### Do:

- **Do** tint every neutral toward the primer hue. Manual Paper is
  `oklch(0.96 0.008 85)`, not white.
- **Do** print a plate number and sheet metadata on every plate. It is what
  makes the system a manual rather than a layout.
- **Do** set elapsed durations at display scale. "23 days" is the argument on a
  page about coming back.
- **Do** give every state a label as well as a colour: open, doing, blocked,
  done, dropped.
- **Do** keep every border, leader line, and rule at 1px in the Rule colour.
- **Do** render every callout as real text associated with its figure.
- **Do** hold body measure between 65 and 75 characters.
- **Do** honour `prefers-reduced-motion` by drawing every figure in its final
  state.

### Don't:

- **Don't** use the AI startup gradient in any form: purple-to-blue washes,
  glowing orbs, sparkle icons, "supercharge your workflow". This is the primary
  anti-reference and it is disqualifying.
- **Don't** drift into the anonymous dark developer tool: monochrome black
  ground, grid glow, floating screenshot hero. The light ground is a decision,
  not an oversight.
- **Don't** use friendly-productivity illustration: pastel blocks, rounded
  cartoon people, cheerful onboarding voice. Wrong register for a two-year
  build.
- **Don't** fall back on magazine editorial: display serif italic, drop caps,
  ruled three-column metadata, no imagery.
- **Don't** ship streaks, badges, confetti, or any celebration of progress. The
  product excludes habit tracking and the interface must not imply otherwise.
- **Don't** apply `box-shadow` anywhere except the focus ring.
- **Don't** use a coloured `border-left` or `border-right` heavier than 1px as
  an accent stripe. Use a full rule and a plate number.
- **Don't** use `background-clip: text` with a gradient. Emphasis comes from
  weight, width, and scale.
- **Don't** build a grid of identically sized cards with an icon above a heading
  above three lines of text. If a section reduces to that, the argument has not
  been made.
- **Don't** round a corner. The circled callout number is the only exception in
  the system.
- **Don't** set oxide as body text on paper. It is a mark and a display colour.
- **Don't** write em dashes in interface copy. Use commas, colons, semicolons,
  periods, or parentheses.
- **Don't** animate layout properties. Stroke geometry and opacity only, ease-out
  curves, no bounce.

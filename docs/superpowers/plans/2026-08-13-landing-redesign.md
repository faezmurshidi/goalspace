# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing surface in `apps/web` with a workshop-manual landing page arguing that re-entry cost is the enemy, converting to signup at the workspace application under early-access framing.

**Architecture:** Six numbered plates in a strict ruled grid on a warm paper ground. Two reusable primitives carry the system: `Plate` (a bordered section with margin metadata) and `AnnotatedFigure` (a drawn SVG with numbered callouts on leader lines). All figures are hand-authored inline SVG, no photography. The page is statically rendered, reads no session, and fetches nothing.

**Tech Stack:** Next 16 App Router, React 19, Tailwind 3.4 with a landing-specific token layer, `next/font/google` for Archivo and Azeret Mono, CSS transitions and the Web Animations API for motion. No animation library.

**Specs:** `docs/superpowers/specs/2026-08-13-landing-design.md`, `DESIGN.md`, `PRODUCT.md`

**Prerequisite:** `docs/superpowers/plans/2026-08-13-monorepo-split.md` must be complete. Every path below is inside `apps/web`.

## Global Constraints

- **No em dashes in any copy.** Use commas, colons, semicolons, periods, or parentheses. This applies to page copy, alt text, and locale JSON.
- Colours are OKLCH only. Never `#000`, never `#fff`. Exact token values are normative in `DESIGN.md` and must not be re-derived.
- Square corners everywhere. The circled callout number is the only rounded shape in the system.
- `box-shadow` is prohibited except the focus ring: `outline: 2px solid var(--color-oxide); outline-offset: 2px`.
- Every border, leader line, dimension tick, and rule is 1px in `--color-rule`. Figure outlines are 1.5px in `--color-ink`.
- No dark mode on this surface. `apps/web` does not mount `ThemeProvider` and does not depend on `next-themes`.
- Status is never colour alone. Every state carries a text label.
- Every animation targets stroke geometry, opacity, or colour. Never layout properties. Curve is `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion: reduce` renders every figure in its final state, with no entrance animation of any kind.
- Body measure stays between 65 and 75 characters.
- Banned outright, from `PRODUCT.md`: gradients of any kind, glowing orbs, sparkle icons, streaks, badges, confetti, progress celebration, floating screenshot heroes, identical card grids, `background-clip: text`, coloured side-stripe borders.
- All user-visible strings go through `useAppTranslations()` and land in `packages/i18n/src/locales/en.json`. `ms` and `zh` are regenerated after `en` is final.

---

### Task 1: Token layer and fonts

Replace the inherited token system on the landing with the workshop-manual palette and type scale. Nothing renders differently yet because no component consumes the new tokens; this task exists so every later task has them.

**Files:**
- Create: `apps/web/lib/fonts.ts`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: the monorepo split.
- Produces: CSS custom properties `--color-paper`, `--color-paper-shade`, `--color-ink`, `--color-ink-soft`, `--color-rule`, `--color-oxide`, `--color-oxide-deep`, `--color-waiting`; Tailwind utilities `bg-paper`, `text-ink`, `border-rule`, `text-oxide`, `bg-oxide-deep`, `text-waiting`; font variables `--font-archivo` and `--font-azeret`; and the `display`, `headline`, `title`, `body`, `label` type utilities.

- [ ] **Step 1: Load the fonts**

Create `apps/web/lib/fonts.ts`. Archivo is loaded with its width axis so display type can be set expanded:

```ts
import { Archivo, Azeret_Mono } from 'next/font/google';

export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

export const azeret = Azeret_Mono({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-azeret',
});
```

- [ ] **Step 2: Write the token layer**

Replace the `:root` block in `apps/web/app/globals.css`. Keep the Tailwind directives at the top of the file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-paper: oklch(0.96 0.008 85);
    --color-paper-shade: oklch(0.93 0.010 85);
    --color-ink: oklch(0.22 0.012 60);
    --color-ink-soft: oklch(0.45 0.010 60);
    --color-rule: oklch(0.78 0.010 70);
    --color-oxide: oklch(0.55 0.15 35);
    --color-oxide-deep: oklch(0.44 0.14 33);
    --color-waiting: oklch(0.55 0.09 240);

    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  }

  html {
    background-color: var(--color-paper);
  }

  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-archivo), 'Helvetica Neue', sans-serif;
  }

  *:focus-visible {
    outline: 2px solid var(--color-oxide);
    outline-offset: 2px;
  }
}
```

Delete every pre-existing custom property in this file. They belong to the shadcn dark/light token system, which this surface no longer uses.

- [ ] **Step 3: Extend the Tailwind config**

`apps/web/tailwind.config.ts` currently consumes `@goalspace/config/tailwind/preset`. Keep the preset for the shared primitives and add the landing layer on top:

```ts
import type { Config } from 'tailwindcss';
import preset from '@goalspace/config/tailwind/preset';

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/i18n/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-shade': 'var(--color-paper-shade)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        rule: 'var(--color-rule)',
        oxide: 'var(--color-oxide)',
        'oxide-deep': 'var(--color-oxide-deep)',
        waiting: 'var(--color-waiting)',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'sans-serif'],
        mono: ['var(--font-azeret)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 6.5vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '800' }],
        headline: ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.01em', fontWeight: '700' }],
        title: ['1.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        label: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      borderRadius: {
        none: '0px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 4: Add utility classes for the width axis**

Tailwind has no `font-variation-settings` utility. Add them in `globals.css` under `@layer utilities`:

```css
@layer utilities {
  .wdth-expanded {
    font-variation-settings: 'wdth' 125;
  }
  .wdth-wide {
    font-variation-settings: 'wdth' 112;
  }
  .label {
    font-family: var(--font-azeret), ui-monospace, monospace;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}
```

- [ ] **Step 5: Mount the fonts and drop the theme provider**

Rewrite `apps/web/app/[locale]/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { I18nProvider } from '@goalspace/i18n';
import AnalyticsProvider from '@/app/providers/analytics-provider';
import { archivo, azeret } from '@/lib/fonts';

import '../globals.css';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ms' }, { locale: 'zh' }];
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} className={`${archivo.variable} ${azeret.variable}`}>
      <body>
        <I18nProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```

`ThemeProvider`, `Toaster`, `suppressHydrationWarning`, and the `Inter` font are all removed. The landing commits to one light treatment, so there is no theme to hydrate and nothing to suppress.

- [ ] **Step 6: Verify**

```bash
cd apps/web && pnpm typecheck && pnpm build 2>&1 | tail -15; cd ../..
```

Expected: build succeeds. The existing page will look wrong, because its components still reference the deleted shadcn tokens. That is expected and is fixed as each plate is rebuilt.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/fonts.ts apps/web/app/globals.css apps/web/tailwind.config.ts "apps/web/app/[locale]/layout.tsx"
git commit -m "feat(web): workshop manual token layer, Archivo and Azeret Mono"
```

---

### Task 2: The Plate primitive

The system's container. Replaces cards entirely.

**Files:**
- Create: `apps/web/components/manual/plate.tsx`
- Create: `apps/web/tests/unit/plate.test.tsx`
- Modify: `apps/web/vitest.config.ts` (add the jsdom environment)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `<Plate number={string} title?={string} meta?={string} drenched?={boolean} className?={string}>` rendering a `<section>` with a plate number, optional headline, optional sheet metadata, and a 1px rule border. Drenched plates use `--color-oxide-deep` with paper type and no border.

- [ ] **Step 1: Add a component test environment**

`apps/web/vitest.config.ts` from the split runs in the `node` environment. Component tests need jsdom:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
});
```

Create `apps/web/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Install the test dependencies:

```bash
cd apps/web && pnpm add -D @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom; cd ../..
```

The boundary test from the split's Task 6 runs in this environment too; confirm it still passes at the end of this task.

- [ ] **Step 2: Write the failing test**

Create `apps/web/tests/unit/plate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Plate } from '@/components/manual/plate';

describe('Plate', () => {
  it('renders its number, title, and metadata', () => {
    render(
      <Plate number="01" title="The return" meta="REV C / 2026-08-13">
        <p>Body</p>
      </Plate>
    );

    expect(screen.getByText('PLATE 01')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The return' })).toBeInTheDocument();
    expect(screen.getByText('REV C / 2026-08-13')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('labels the section by its title for assistive technology', () => {
    render(<Plate number="02" title="How the record accrues">body</Plate>);
    expect(screen.getByRole('region', { name: 'How the record accrues' })).toBeInTheDocument();
  });

  it('omits the heading when no title is given', () => {
    render(<Plate number="00">body</Plate>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd apps/web && pnpm vitest run tests/unit/plate.test.tsx; cd ../..
```

Expected: FAIL, cannot resolve `@/components/manual/plate`.

- [ ] **Step 4: Implement Plate**

Create `apps/web/components/manual/plate.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@goalspace/ui';

interface PlateProps {
  number: string;
  title?: string;
  meta?: string;
  drenched?: boolean;
  className?: string;
  children: ReactNode;
}

export function Plate({ number, title, meta, drenched = false, className, children }: PlateProps) {
  const headingId = title ? `plate-${number}-heading` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      aria-label={title ? undefined : `Plate ${number}`}
      className={cn(
        'relative px-6 py-10 md:px-16 md:py-16',
        drenched ? 'bg-oxide-deep text-paper' : 'border border-rule bg-paper text-ink',
        className
      )}
    >
      <span className={cn('label mb-6 block', drenched ? 'text-paper/75' : 'text-oxide')}>
        Plate {number}
      </span>

      {title ? (
        <h2
          id={headingId}
          className={cn('mb-4 wdth-wide', drenched ? 'text-display' : 'text-headline')}
        >
          {title}
        </h2>
      ) : null}

      {children}

      {meta ? (
        <span
          className={cn(
            'label mt-10 block text-right',
            drenched ? 'text-paper/75' : 'text-ink-soft'
          )}
        >
          {meta}
        </span>
      ) : null}
    </section>
  );
}
```

The `label` utility uppercases via CSS, so `Plate {number}` in the source renders as `PLATE 01` and remains readable as mixed case to a screen reader.

- [ ] **Step 5: Run the test**

```bash
cd apps/web && pnpm vitest run tests/unit/plate.test.tsx; cd ../..
```

Expected: PASS, three tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/manual/plate.tsx apps/web/tests apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add the Plate primitive with its test harness"
```

---

### Task 3: The AnnotatedFigure primitive

The signature component: a drawn figure with numbered callouts on leader lines, degrading to a numbered list on narrow viewports.

**Files:**
- Create: `apps/web/components/manual/annotated-figure.tsx`
- Create: `apps/web/tests/unit/annotated-figure.test.tsx`

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 conventions.
- Produces:
  ```ts
  interface Callout { n: number; label: string; x: number; y: number; }
  interface AnnotatedFigureProps {
    caption: string;
    callouts: Callout[];
    children: ReactNode;  // the inline SVG drawing, in a 0 0 100 100 viewBox
    className?: string;
  }
  ```
  `x` and `y` are percentages of the figure box, 0 to 100, marking the point the leader line touches.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/annotated-figure.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';

const callouts = [
  { n: 1, label: 'You were away 23 days', x: 20, y: 30 },
  { n: 2, label: 'Blocked since 14 March', x: 70, y: 55 },
];

describe('AnnotatedFigure', () => {
  it('renders every callout label as text', () => {
    render(
      <AnnotatedFigure caption="Project state on return" callouts={callouts}>
        <rect x="10" y="10" width="80" height="80" />
      </AnnotatedFigure>
    );

    expect(screen.getByText('You were away 23 days')).toBeInTheDocument();
    expect(screen.getByText('Blocked since 14 March')).toBeInTheDocument();
  });

  it('exposes the figure with its caption', () => {
    render(
      <AnnotatedFigure caption="Project state on return" callouts={callouts}>
        <rect x="10" y="10" width="80" height="80" />
      </AnnotatedFigure>
    );

    expect(screen.getByRole('figure', { name: 'Project state on return' })).toBeInTheDocument();
  });

  it('numbers the callouts in the order given', () => {
    render(
      <AnnotatedFigure caption="c" callouts={callouts}>
        <rect x="0" y="0" width="1" height="1" />
      </AnnotatedFigure>
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1');
    expect(items[1]).toHaveTextContent('2');
  });

  it('marks the decorative drawing as hidden from assistive technology', () => {
    const { container } = render(
      <AnnotatedFigure caption="c" callouts={callouts}>
        <rect x="0" y="0" width="1" height="1" />
      </AnnotatedFigure>
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/web && pnpm vitest run tests/unit/annotated-figure.test.tsx; cd ../..
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement AnnotatedFigure**

Create `apps/web/components/manual/annotated-figure.tsx`. The callout list is the accessible representation and is always in the DOM; the leader lines are decoration layered on top and are hidden below the `md` breakpoint by CSS:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@goalspace/ui';

export interface Callout {
  n: number;
  label: string;
  x: number;
  y: number;
}

interface AnnotatedFigureProps {
  caption: string;
  callouts: Callout[];
  children: ReactNode;
  className?: string;
}

export function AnnotatedFigure({ caption, callouts, children, className }: AnnotatedFigureProps) {
  return (
    <figure aria-label={caption} className={cn('m-0', className)}>
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="w-full [&_*]:fill-none [&_*]:stroke-ink [&_*]:[stroke-width:1.5] [&_*]:[vector-effect:non-scaling-stroke]"
        >
          {children}

          <g className="hidden md:block">
            {callouts.map((c) => (
              <g key={c.n}>
                <line
                  x1={c.x}
                  y1={c.y}
                  x2={c.x < 50 ? 4 : 96}
                  y2={c.y}
                  className="stroke-rule [stroke-width:1]"
                />
                <circle cx={c.x} cy={c.y} r="0.8" className="fill-ink stroke-ink" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      <ol className="mt-8 grid gap-3 md:grid-cols-2">
        {callouts.map((c) => (
          <li key={c.n} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="label mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-oxide text-paper"
            >
              {c.n}
            </span>
            <span className="sr-only">Callout {c.n}.</span>
            <span className="text-body">{c.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="label mt-6 text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
```

The circled number is the only `rounded-full` in the codebase. Adding a second one is a design system violation.

- [ ] **Step 4: Run the test**

```bash
cd apps/web && pnpm vitest run tests/unit/annotated-figure.test.tsx; cd ../..
```

Expected: PASS, four tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/manual apps/web/tests/unit/annotated-figure.test.tsx
git commit -m "feat(web): add the AnnotatedFigure primitive"
```

---

### Task 4: The record module

The page's content dependency, expressed as typed data plus the pure functions that turn it into the durations the page argues with.

**Files:**
- Create: `apps/web/content/record.ts`
- Create: `apps/web/lib/duration.ts`
- Create: `apps/web/tests/unit/duration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type EntryKind = 'note' | 'decision' | 'source' | 'session'`
  - `interface RecordEntry { at: string; kind: EntryKind; text: string }` where `at` is ISO `YYYY-MM-DD`
  - `interface RecordBlocker { since: string; title: string; waitingOn: string }`
  - `interface ProjectRecord { title: string; kind: 'build' | 'learn' | 'research'; startedAt: string; lastTouchedAt: string; entries: RecordEntry[]; blockers: RecordBlocker[]; decisions: RecordEntry[] }`
  - `daysBetween(from: string, to: string): number`
  - `formatElapsed(days: number): { value: string; unit: string }`

- [ ] **Step 1: Write the failing duration test**

Create `apps/web/tests/unit/duration.test.ts`. These functions produce the page's largest type, so their edge cases matter:

```ts
import { describe, expect, it } from 'vitest';
import { daysBetween, formatElapsed } from '@/lib/duration';

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-03-14', '2026-04-06')).toBe(23);
  });

  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-03-14', '2026-03-14')).toBe(0);
  });

  it('never returns a negative number', () => {
    expect(daysBetween('2026-04-06', '2026-03-14')).toBe(0);
  });

  it('is unaffected by timezone, counting calendar days in UTC', () => {
    expect(daysBetween('2026-03-14', '2026-03-15')).toBe(1);
  });

  it('crosses a leap day correctly', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('formatElapsed', () => {
  it('reports days below 60', () => {
    expect(formatElapsed(23)).toEqual({ value: '23', unit: 'days' });
  });

  it('uses the singular unit for one day', () => {
    expect(formatElapsed(1)).toEqual({ value: '1', unit: 'day' });
  });

  it('reports months from 60 days', () => {
    expect(formatElapsed(90)).toEqual({ value: '3', unit: 'months' });
  });

  it('reports years from 730 days', () => {
    expect(formatElapsed(800)).toEqual({ value: '2', unit: 'years' });
  });

  it('handles zero without a unit mismatch', () => {
    expect(formatElapsed(0)).toEqual({ value: '0', unit: 'days' });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/web && pnpm vitest run tests/unit/duration.test.ts; cd ../..
```

Expected: FAIL, cannot resolve `@/lib/duration`.

- [ ] **Step 3: Implement the duration helpers**

Create `apps/web/lib/duration.ts`. Dates are parsed as UTC midnight so a reader in Kuala Lumpur and a reader in New York see the same number:

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  const diff = (utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY;
  return diff > 0 ? Math.round(diff) : 0;
}

export function formatElapsed(days: number): { value: string; unit: string } {
  if (days >= 730) {
    const years = Math.floor(days / 365);
    return { value: String(years), unit: years === 1 ? 'year' : 'years' };
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return { value: String(months), unit: months === 1 ? 'month' : 'months' };
  }
  return { value: String(days), unit: days === 1 ? 'day' : 'days' };
}
```

- [ ] **Step 4: Run the test**

```bash
cd apps/web && pnpm vitest run tests/unit/duration.test.ts; cd ../..
```

Expected: PASS, ten tests.

- [ ] **Step 5: Define the record module**

Create `apps/web/content/record.ts` with the types and the real data.

```ts
export type EntryKind = 'note' | 'decision' | 'source' | 'session';

export interface RecordEntry {
  /** ISO date, YYYY-MM-DD. */
  at: string;
  kind: EntryKind;
  text: string;
}

export interface RecordBlocker {
  /** ISO date the item became blocked. */
  since: string;
  title: string;
  /** What is being waited on, in the author's own words. */
  waitingOn: string;
}

export interface ProjectRecord {
  title: string;
  kind: 'build' | 'learn' | 'research';
  startedAt: string;
  lastTouchedAt: string;
  entries: RecordEntry[];
  blockers: RecordBlocker[];
  decisions: RecordEntry[];
}

export const record: ProjectRecord = {
  title: '...',
  kind: 'build',
  startedAt: '...',
  lastTouchedAt: '...',
  entries: [/* real entries */],
  blockers: [/* real blockers */],
  decisions: [/* real decisions */],
};
```

**This is a content gate, not a coding step.** The data comes from a real project of the author's. The spec is explicit that placeholder content does not ship, because a constructed record undermines the only claim the page makes.

Minimums the later tasks depend on, because they index into these arrays directly:

| Field | Minimum | Used by |
|---|---|---|
| `entries` | 15, at least one with `kind: 'session'` | Hero callout 2, Plate 02 step three |
| `blockers` | 2 | Hero callout 1, Plate 01 blocker list |
| `decisions` | 2 | Hero callout 3, Plate 01 decision list |
| `lastTouchedAt` | required | the hero's elapsed figure |

Do not commit this file with the ellipses above still in it: `typecheck` fails on the empty arrays' element types being inferred as `never`, which is deliberate. The file compiles only once it holds real data.

If the data has not arrived, stop here and ask for it. Tasks 5, 6, and 7 consume `record`; Tasks 8 through 10 do not and can proceed in the meantime.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/duration.ts apps/web/content/record.ts apps/web/tests/unit/duration.test.ts
git commit -m "feat(web): record types and elapsed-time helpers"
```

---

### Task 5: Plate 00, the hero

**Files:**
- Create: `apps/web/components/plates/hero.tsx`
- Create: `apps/web/components/manual/figures/exploded-project.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`
- Modify: `packages/i18n/src/locales/en.json`

**Interfaces:**
- Consumes: `Plate`, `AnnotatedFigure`, `record`, `daysBetween`, `formatElapsed`.
- Produces: `<Hero />`, rendered first on the landing route.

- [ ] **Step 1: Draw the exploded figure**

Create `apps/web/components/manual/figures/exploded-project.tsx`, an inline SVG in a `0 0 100 100` viewBox showing a project separating into its parts: a body, two or three components offset along a diagonal, and thin dashed assembly axes connecting them. Stroke only, no fills, no gradients.

```tsx
export function ExplodedProject() {
  return (
    <>
      {/* assembly axis */}
      <line x1="18" y1="82" x2="82" y2="18" className="stroke-rule [stroke-width:1] [stroke-dasharray:2_2]" />

      {/* body */}
      <rect x="14" y="58" width="30" height="24" />

      {/* first component */}
      <rect x="42" y="40" width="20" height="16" />

      {/* second component */}
      <circle cx="72" cy="28" r="9" />

      {/* dimension tick */}
      <line x1="14" y1="88" x2="44" y2="88" className="stroke-rule [stroke-width:1]" />
      <line x1="14" y1="86" x2="14" y2="90" className="stroke-rule [stroke-width:1]" />
      <line x1="44" y1="86" x2="44" y2="90" className="stroke-rule [stroke-width:1]" />
    </>
  );
}
```

Refine the geometry to suit the real project from Task 4. The shapes should evoke that specific build, not a generic machine.

- [ ] **Step 2: Write the copy**

Add to `packages/i18n/src/locales/en.json` under a `landing` key. Copy is final English, no em dashes:

```json
{
  "landing": {
    "hero": {
      "plate": "00",
      "title": "Coming back is the hard part",
      "lede": "You know how to build the thing. What you lose is the thread: what you decided, what you were waiting on, and why you dropped the approach that looked right in month two.",
      "away": "away",
      "cta": "Start the record",
      "ctaSecondary": "What exists today",
      "caption": "Fig. 00. A project, as it looks after three weeks away."
    }
  }
}
```

- [ ] **Step 3: Build the hero**

Create `apps/web/components/plates/hero.tsx`. The elapsed figure is the largest element on the page, per the Duration Rule:

```tsx
'use client';

import { useAppTranslations } from '@goalspace/i18n';
import { Plate } from '@/components/manual/plate';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';
import { ExplodedProject } from '@/components/manual/figures/exploded-project';
import { record } from '@/content/record';
import { daysBetween, formatElapsed } from '@/lib/duration';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export function Hero() {
  const { t } = useAppTranslations();
  const today = new Date().toISOString().slice(0, 10);
  const away = formatElapsed(daysBetween(record.lastTouchedAt, today));

  return (
    <Plate number={t('landing.hero.plate')} drenched>
      <h1 className="text-display wdth-expanded max-w-[14ch]">{t('landing.hero.title')}</h1>

      <p className="mt-8 max-w-[68ch] text-body">{t('landing.hero.lede')}</p>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <a href={`${APP_URL}/login`} className="label bg-paper px-8 py-4 text-ink transition-colors duration-150 ease-out-expo hover:bg-ink hover:text-paper">
          {t('landing.hero.cta')}
        </a>
        <a href="#plate-04" className="label border border-paper/40 px-8 py-4 text-paper transition-colors duration-150 ease-out-expo hover:border-paper">
          {t('landing.hero.ctaSecondary')}
        </a>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-[1fr_1fr] md:items-center">
        <p className="flex items-baseline gap-3">
          <span className="text-display wdth-expanded">{away.value}</span>
          <span className="label">{`${away.unit} ${t('landing.hero.away')}`}</span>
        </p>

        <AnnotatedFigure
          caption={t('landing.hero.caption')}
          callouts={[
            { n: 1, label: record.blockers[0].title, x: 28, y: 70 },
            { n: 2, label: record.entries[0].text, x: 52, y: 48 },
            { n: 3, label: record.decisions[0].text, x: 72, y: 28 },
          ]}
        >
          <ExplodedProject />
        </AnnotatedFigure>
      </div>
    </Plate>
  );
}
```

The drenched plate inverts the figure's stroke colours; add `[&_*]:stroke-paper` to the `AnnotatedFigure` `className` so the drawing reads on oxide.

- [ ] **Step 4: Mount it**

Replace the contents of `apps/web/app/[locale]/page.tsx` with a single `<main>` containing `<Hero />`. Delete the imports of the old section components; they are removed wholesale in Task 10.

- [ ] **Step 5: Verify visually**

```bash
cd apps/web && pnpm dev
```

Check at `http://localhost:3000/en`:

1. The hero fills the fold in oxide with paper type.
2. The elapsed figure is the largest thing on screen.
3. The callout numbers are circled and oxide, the leader lines are visible at desktop width.
4. At 375px width the leader lines are gone and the callouts read as a numbered list.
5. The primary call to action navigates to the app's login page.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/plates/hero.tsx apps/web/components/manual/figures "apps/web/app/[locale]/page.tsx" packages/i18n/src/locales/en.json
git commit -m "feat(web): plate 00, the hero"
```

---

### Task 6: Plate 01, the return

The page's central proof: the resume view drawn as an annotated figure.

**Files:**
- Create: `apps/web/components/plates/the-return.tsx`
- Create: `apps/web/components/manual/figures/resume-view.tsx`
- Create: `apps/web/components/manual/status-chip.tsx`
- Create: `apps/web/tests/unit/status-chip.test.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`, `packages/i18n/src/locales/en.json`

**Interfaces:**
- Consumes: Task 2 through 5.
- Produces: `<TheReturn />` and `<StatusChip status={'open'|'doing'|'blocked'|'done'|'dropped'} label={string} />`.

- [ ] **Step 1: Write the failing status chip test**

The Two Signals Rule and the accessibility requirement both live in this component, so both get a test. Create `apps/web/tests/unit/status-chip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip } from '@/components/manual/status-chip';

describe('StatusChip', () => {
  it('always renders a text label alongside the colour', () => {
    render(<StatusChip status="blocked" label="Blocked since 14 March" />);
    expect(screen.getByText('Blocked since 14 March')).toBeInTheDocument();
  });

  it('renders a distinct shape marker for each status', () => {
    const { container: blocked } = render(<StatusChip status="blocked" label="b" />);
    const { container: done } = render(<StatusChip status="done" label="d" />);
    expect(blocked.querySelector('svg')?.innerHTML).not.toBe(done.querySelector('svg')?.innerHTML);
  });

  it('hides the shape marker from assistive technology', () => {
    const { container } = render(<StatusChip status="open" label="o" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/web && pnpm vitest run tests/unit/status-chip.test.tsx; cd ../..
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement StatusChip**

Create `apps/web/components/manual/status-chip.tsx`. Each status gets a distinct glyph so the state survives greyscale and colour blindness:

```tsx
import type { ReactElement } from 'react';
import { cn } from '@goalspace/ui';

type Status = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

const MARKS: Record<Status, { path: ReactElement; tone: string }> = {
  open: { path: <rect x="1" y="1" width="6" height="6" fill="none" stroke="currentColor" />, tone: 'text-ink' },
  doing: { path: <path d="M1 4 L4 1 L7 4 L4 7 Z" fill="currentColor" />, tone: 'text-oxide' },
  blocked: { path: <rect x="0" y="0" width="8" height="8" fill="currentColor" />, tone: 'text-waiting' },
  done: { path: <path d="M0 4 L3 7 L8 1" fill="none" stroke="currentColor" strokeWidth="2" />, tone: 'text-ink-soft' },
  dropped: { path: <path d="M0 0 L8 8 M8 0 L0 8" fill="none" stroke="currentColor" />, tone: 'text-ink-soft' },
};

export function StatusChip({ status, label }: { status: Status; label: string }) {
  const mark = MARKS[status];

  return (
    <span className={cn('label inline-flex items-center gap-2 border border-rule px-2 py-1', mark.tone)}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        {mark.path}
      </svg>
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run the test**

```bash
cd apps/web && pnpm vitest run tests/unit/status-chip.test.tsx; cd ../..
```

Expected: PASS, three tests.

- [ ] **Step 5: Draw the resume view figure**

Create `apps/web/components/manual/figures/resume-view.tsx`: a schematic of the resume screen as a manual would draw a panel. Ruled regions for "where you left off", "what's open", and "what you decided", drawn as nested rectangles with hairline internal rules. Stroke only.

- [ ] **Step 6: Write the copy and build the plate**

Add to `en.json`:

```json
"return": {
  "plate": "01",
  "title": "The screen that answers where you were",
  "lede": "Open a project after a month away. Before you navigate anywhere, it tells you what is open, what you last did, and what you already decided.",
  "openLabel": "Open",
  "blockedLabel": "Blocked since",
  "waitingLabel": "Waiting on",
  "decidedLabel": "Decided",
  "caption": "Fig. 01. The resume view, annotated."
}
```

Create `apps/web/components/plates/the-return.tsx` rendering a `Plate` numbered 01 containing the lede, the `AnnotatedFigure` wrapping `ResumeView`, and beneath it a ruled list built from `record.blockers` and `record.decisions`, each blocker rendered with a `StatusChip status="blocked"` whose label is `${t('landing.return.blockedLabel')} ${formatted date}`.

Compute each blocker's duration with `daysBetween(blocker.since, today)` and `formatElapsed`, so the page reads "blocked 87 days" rather than only naming a date.

- [ ] **Step 7: Verify and commit**

Check the plate at desktop and 375px, then:

```bash
cd apps/web && pnpm test && pnpm build 2>&1 | tail -10; cd ../..
git add apps/web/components packages/i18n/src/locales/en.json "apps/web/app/[locale]/page.tsx" apps/web/tests
git commit -m "feat(web): plate 01, the return, with the status chip primitive"
```

---

### Task 7: Plate 02, how the record accrues

**Files:**
- Create: `apps/web/components/plates/accrual.tsx`
- Create: `apps/web/components/manual/figures/accrual-mechanism.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`, `packages/i18n/src/locales/en.json`

**Interfaces:**
- Consumes: Task 2 through 6.
- Produces: `<Accrual />`.

- [ ] **Step 1: Draw the mechanism**

Create `apps/web/components/manual/figures/accrual-mechanism.tsx`: three linked stages drawn as a mechanism, not a flowchart. A work item, the entry that closes it, and the permanent record it joins, connected by drawn linkages with an arrowhead at each junction. Stroke only, `0 0 100 100`.

- [ ] **Step 2: Write the copy**

```json
"accrual": {
  "plate": "02",
  "title": "The record writes itself",
  "lede": "Nobody keeps a project journal for two years. So the log is not a second job: closing a piece of work asks what closed it, and that answer is the record.",
  "steps": {
    "one": "Finish something.",
    "two": "Say what finished it, in one line.",
    "three": "That line is attached to the work permanently, and it is what you read when you come back."
  },
  "closing": "Two years of this is a document nobody sat down to write.",
  "caption": "Fig. 02. Closing a work item captures the entry that closed it."
}
```

- [ ] **Step 3: Build the plate**

Create `apps/web/components/plates/accrual.tsx` with a `Plate` numbered 02 on `bg-paper-shade` for tonal separation from its neighbours. Render the three steps as a numbered sequence using the same circled-number treatment as `AnnotatedFigure`, extracted into a shared `CalloutNumber` component if the duplication bothers you at this point. Pull one real closing entry from `record.entries` where `kind === 'session'` to illustrate the third step.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && pnpm build 2>&1 | tail -10; cd ../..
git add apps/web/components packages/i18n/src/locales/en.json "apps/web/app/[locale]/page.tsx"
git commit -m "feat(web): plate 02, how the record accrues"
```

---

### Task 8: Plates 03 through 05

Three plates that need no project data: the limits, the dated promise, and the call to action. Grouped because each is small and they share one review.

**Files:**
- Create: `apps/web/components/plates/not-this.tsx`, `apps/web/components/plates/the-agent.tsx`, `apps/web/components/plates/start.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`, `packages/i18n/src/locales/en.json`

**Interfaces:**
- Consumes: `Plate`.
- Produces: `<NotThis />`, `<TheAgent />`, `<Start />`.

- [ ] **Step 1: Write the copy for all three**

Final English. The tense in `agent.now` and `agent.next` is the honesty mechanism from the spec and must not be softened:

```json
"notThis": {
  "plate": "03",
  "title": "What this is not",
  "items": {
    "tasks": "Not a task manager. Open items matter, but a list of them is not a record.",
    "wiki": "Not a wiki. Documents live here, but the log is what you actually come back for.",
    "streaks": "No streaks, no badges, no celebration of starting. Nothing here rewards you for showing up.",
    "reminders": "No reminders. It waits. When you come back, it tells you what changed while you were gone.",
    "habits": "Not for habits or fitness. Those want adherence tracking, which is a different product."
  }
},
"agent": {
  "plate": "04",
  "title": "The part that reads it back to you",
  "nowLabel": "Shipping today",
  "now": "Projects, the log, nested work items with real states including blocked and a wake date, documents, and the resume view. Private to you.",
  "nextLabel": "Next",
  "next": "An agent grounded in your own repository: recall and synthesis over your decisions and dead ends, not generic advice. It is not built yet.",
  "why": "Which is the reason to start now. The agent is only worth having if there is a record for it to read, and that record takes months to accumulate. Starting today is what makes it useful later."
},
"start": {
  "plate": "05",
  "title": "Start the record",
  "lede": "One project, private, free while it is early. If you are in the middle of something long, the useful moment to begin was a year ago. Second best is today.",
  "cta": "Create your project",
  "honesty": "Early access. What exists today is described in plate 04, exactly."
}
```

- [ ] **Step 2: Build Plate 03**

Create `apps/web/components/plates/not-this.tsx`. Set the five items as a ruled table: each row is a 1px `border-t border-rule`, the claim in `text-title`, the qualifier in `text-body text-ink-soft`. No icons, no cards. The flatness is the voice.

- [ ] **Step 3: Build Plate 04**

Create `apps/web/components/plates/the-agent.tsx` with `id="plate-04"` so the hero's secondary link anchors here. Two columns separated by a single vertical rule at `md` and above, stacked with a horizontal rule below it. Label each column with `nowLabel` and `nextLabel` in `label` type. The `why` paragraph sits below the rule, full width, in `text-title`.

Never render the two columns with different visual weight. The point is that both are stated plainly.

- [ ] **Step 4: Build Plate 05**

Create `apps/web/components/plates/start.tsx`: drenched oxide, matching the hero so the page closes where it opened. One primary call to action to `${APP_URL}/login`, the `honesty` line beneath it in `label` type. No email field; the decision is to convert to signup, not to collect addresses.

- [ ] **Step 5: Mount all three and verify**

```bash
cd apps/web && pnpm build 2>&1 | tail -10; cd ../..
```

Read the whole page top to bottom at desktop width. Check the tense in plate 04: nothing may imply the agent exists.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/plates packages/i18n/src/locales/en.json "apps/web/app/[locale]/page.tsx"
git commit -m "feat(web): plates 03 to 05, the limits, the dated promise, and the CTA"
```

---

### Task 9: Header, colophon footer, and the blog

Replace the site chrome so the blog inherits the same system.

**Files:**
- Modify: `apps/web/components/site-header.tsx`, `apps/web/components/main-nav.tsx`
- Create: `apps/web/components/manual/colophon.tsx`
- Modify: `apps/web/app/[locale]/blog/page.tsx`, `apps/web/app/[locale]/blog/[slug]/page.tsx`
- Delete: `apps/web/components/landing-blog-section.tsx` if unused after Task 10

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `<Colophon />`.

- [ ] **Step 1: Restyle the header**

Rewrite `site-header.tsx` and `main-nav.tsx` in the label vocabulary: uppercase mono links separated by 1px vertical rules, no pill backgrounds, no hover reveal, active state as a 2px oxide underline offset 6px. The nav does not collapse into a hamburger; at narrow widths the rules turn horizontal and the links stack.

`main-nav.tsx` already links to `${APP_URL}/login` from the monorepo split. Keep that link and restyle only.

- [ ] **Step 2: Build the colophon**

Create `apps/web/components/manual/colophon.tsx`: a footer set as a manual colophon. A top rule, then three groups in label type: the revision and build date, the locale switcher (`LanguageSelector` from `@goalspace/i18n`), and links to the blog and the app. Not a four-column sitemap.

- [ ] **Step 3: Apply the system to the blog**

Wrap the blog index and post routes in `Plate`, set post bodies in `text-body` with a 68ch measure, and set post metadata (date, reading time) in label type. Do not restructure the blog's data or routing.

- [ ] **Step 4: Verify and commit**

Check the header, footer, and a blog post at desktop and 375px.

```bash
cd apps/web && pnpm build 2>&1 | tail -10; cd ../..
git add apps/web/components "apps/web/app/[locale]/blog"
git commit -m "feat(web): manual-system header, colophon footer, and blog"
```

---

### Task 10: Motion, deletion, and the accessibility pass

Add the one orchestrated page load, delete the marketing surface for the removed product, and verify the constraints that have been asserted but not yet checked.

**Files:**
- Create: `apps/web/components/manual/draw-on-view.tsx`
- Create: `apps/web/tests/unit/reduced-motion.test.tsx`
- Delete: `apps/web/components/sections/`, and the decorative components listed below
- Modify: `apps/web/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: everything.
- Produces: `<DrawOnView>` wrapping any figure to draw its strokes on entry.

- [ ] **Step 1: Write the failing reduced-motion test**

Create `apps/web/tests/unit/reduced-motion.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrawOnView } from '@/components/manual/draw-on-view';

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe('DrawOnView', () => {
  it('renders content in its final state when reduced motion is requested', () => {
    mockReducedMotion(true);
    const { container } = render(
      <DrawOnView>
        <svg>
          <line x1="0" y1="0" x2="10" y2="10" />
        </svg>
      </DrawOnView>
    );
    expect(container.firstElementChild).not.toHaveAttribute('data-draw-pending');
  });

  it('marks content as pending when motion is allowed', () => {
    mockReducedMotion(false);
    const { container } = render(
      <DrawOnView>
        <svg>
          <line x1="0" y1="0" x2="10" y2="10" />
        </svg>
      </DrawOnView>
    );
    expect(container.firstElementChild).toHaveAttribute('data-draw-pending');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/web && pnpm vitest run tests/unit/reduced-motion.test.tsx; cd ../..
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement DrawOnView**

Create `apps/web/components/manual/draw-on-view.tsx`: a client component using `IntersectionObserver` to add a class when the wrapper enters the viewport, driving a `stroke-dashoffset` transition on descendant strokes. It checks `matchMedia('(prefers-reduced-motion: reduce)')` on mount and, when reduced motion is requested, renders children with no `data-draw-pending` attribute and attaches no observer.

The pending state sets `stroke-dasharray: 1; stroke-dashoffset: 1;` via CSS on `[data-draw-pending] svg *`, transitioning to `stroke-dashoffset: 0` over 600ms with `--ease-out-expo`, staggered by 60ms per element index.

- [ ] **Step 4: Run the test and apply the wrapper**

```bash
cd apps/web && pnpm vitest run tests/unit/reduced-motion.test.tsx; cd ../..
```

Expected: PASS.

Wrap each figure in `DrawOnView`. In the hero, sequence the callout numbers in with a 90ms stagger after the drawing completes, total under 900ms.

- [ ] **Step 5: Delete the old marketing surface**

Every one of these describes the AI mentor product removed in Phase 1:

```bash
cd apps/web
git rm -r components/sections
git rm components/blog-section.tsx components/landing-blog-section.tsx
git rm components/ui/animated-hero.tsx components/ui/bento-grid.tsx components/ui/border-beam.tsx \
       components/ui/faq-section.tsx components/ui/fancy-button.tsx \
       components/ui/placeholders-and-vanish-input.tsx components/ui/placeholders-and-vanish-input.demo.tsx \
       components/ui/feature-block-animated-card.tsx components/ui/activity-card.tsx \
       components/ui/expandable-card.tsx components/ui/question-card.tsx \
       components/ui/color-system-demo.tsx components/ui/circular-progress.tsx
cd ../..
```

Before each removal, confirm nothing still imports it:

```bash
grep -rn "sections/\|animated-hero\|bento-grid\|border-beam\|expandable-card" apps/web --include=*.tsx
```

Then remove the dependencies only those components needed, if nothing else uses them: `framer-motion`, `embla-carousel-react`, `recharts`, `mermaid`.

```bash
grep -rn "framer-motion\|embla\|recharts\|mermaid" apps/web --include=*.tsx --include=*.ts
```

- [ ] **Step 6: Run the constraint audit**

Each of these must return nothing. They enforce the global constraints:

```bash
cd apps/web
grep -rn "shadow-\|box-shadow" components app | grep -v "outline"
grep -rn "rounded-\(sm\|md\|lg\|xl\|2xl\|3xl\)" components app
grep -rn "gradient" components app
grep -rn "—" components app ../../packages/i18n/src/locales/en.json
grep -rn "#fff\|#000\|#ffffff\|#000000" components app
cd ../..
```

The only permitted `rounded-full` is the callout number in `annotated-figure.tsx`:

```bash
grep -rn "rounded-full" apps/web/components
```

- [ ] **Step 7: Verify the full page**

```bash
cd apps/web && pnpm typecheck && pnpm test && pnpm build 2>&1 | tail -15; cd ../..
```

Then in the browser, at `http://localhost:3000/en`:

1. Tab through the page. Focus is visible on every interactive element as a 2px oxide outline.
2. Enable "reduce motion" in the OS and reload. Every figure is complete on arrival and nothing animates.
3. Disable JavaScript and reload. All six plates render with full copy.
4. At 375px, no horizontal scroll, and every leader line has become a numbered list item.
5. In greyscale, blocked items are still distinguishable from open ones.

- [ ] **Step 8: Regenerate ms and zh**

With `en` final, regenerate the other two locales for the `landing` key. Then check every plate at `/ms` and `/zh` for layout breakage: the display headline is the most likely casualty of a 40% longer string.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(web): motion, delete the old marketing surface, accessibility pass

Removes components/sections and the decorative UI built for the AI mentor
product that Phase 1 deleted, along with the dependencies only they used."
```

---

## Verification checklist

- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm build` pass from the repository root
- [ ] The boundary test from the split still passes: no Supabase in `apps/web`
- [ ] Every constraint grep in Task 10 Step 6 returns nothing
- [ ] `rounded-full` appears exactly once in the codebase
- [ ] Reduced motion renders every figure complete, with no animation
- [ ] The page renders fully with JavaScript disabled
- [ ] No horizontal scroll at 360px
- [ ] Plate 04 contains no sentence implying the agent exists today
- [ ] `record.ts` contains the author's real project data, not invented content
- [ ] Both calls to action reach the workspace login page
- [ ] `/en`, `/ms`, and `/zh` all render without layout breakage

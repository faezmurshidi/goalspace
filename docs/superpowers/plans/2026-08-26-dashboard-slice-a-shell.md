# Workspace Dashboard — Slice A (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top-bar workspace shell with a persistent project-scoped sidebar, and surface undecided proposals on Resume.

**Architecture:** A trimmed shadcn sidebar primitive lands in `packages/ui`, skinned in the Workshop Manual tokens rather than shadcn's neutral defaults. The parts of the shell that can actually be wrong — which destinations exist, which one is active, whether the sidebar starts collapsed — move into pure modules under `apps/app/lib/shell/` and are unit-tested. The components themselves are verified by typecheck and build.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Radix (dialog, tooltip, separator, slot) · Vitest.

**Spec:** [2026-08-26-workspace-dashboard-design.md](../specs/2026-08-26-workspace-dashboard-design.md) — slice A of §9.

## Global Constraints

- **Structure from shadcn, skin from the Workshop Manual.** When they disagree, the system wins: hairline rules not cards, no elevation, no rounded containers, `paper`/`paper-shade`/`ink`/`ink-soft`/`rule`/`rule-strong`, `oxide` for the active state, text labels not icons.
- **Nothing is advertised that does not exist.** Slice A ships four destinations: Resume, Work, Log, Inbox. Documents, Agents, and Settings arrive with slices B, C, and D.
- **A count of zero renders nothing.** A badge reading "0" is noise. Counts are quantities, never scores — no streaks, no badges in the achievement sense, no progress celebration.
- **Quick capture does not change.** It stays mounted in the project layout at the bottom of the content area. Do not move it, re-mount it, or alter `CaptureBar` itself. The one permitted change is wrapping it in a labelled landmark (Task 6, Step 4) — spec §8 requires one and it adds no behaviour.
- **`apps/app` has no component-test infrastructure** — vitest runs `environment: 'node'` with `include: ['tests/**/*.test.ts']`, and there is no jsdom or testing-library. Do not add any. Test the pure modules; verify components with `pnpm typecheck && pnpm build`.
- **Strings are i18n keys, never prose**, and every new key lands in `en`, `ms`, and `zh`. Sidebar labels are the tightest constraint in the app — the collapsed rail must not be sized to English.
- **WCAG 2.1 AA.** `aria-current="page"` on the active item; the `oxide` edge is never the only signal. `prefers-reduced-motion` honoured on the collapse transition.
- **Node 22+.** The shell defaults to Node 20 on this machine; run `nvm use 22` first or every `pnpm` command fails on `engines.node`.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/app/lib/shell/destinations.ts` | Pure. Project slug → nav destinations, and which is active for a path. |
| `apps/app/lib/shell/sidebar-state.ts` | Pure. The collapse cookie's name, parsing, and serialisation. |
| `packages/ui/src/hooks/use-is-mobile.ts` | Viewport hook the sidebar needs for its sheet/rail switch. Generic and token-free, so it is shared. |
| `packages/ui/src/index.ts` | **Modify** — export the hook. |
| `apps/app/components/shell/sidebar.tsx` | The trimmed, skinned sidebar primitive. Lives in the app, not the shared package — see below. |
| `apps/app/components/shell/workspace-sidebar.tsx` | The project sidebar: switcher, sections, collapse rail. |
| `apps/app/components/shell/header-rail.tsx` | Section title, sidebar trigger, account menu (theme, sign out). |
| `apps/app/components/shell/workspace-chrome.tsx` | **Rewrite** — composition only: skip link, provider, sidebar, rail, main. |
| `apps/app/app/(workspace)/layout.tsx` | **Modify** — read the collapse cookie server-side, pass it down. |
| `apps/app/lib/db/resume.ts` | **Modify** — `ResumeData.undecidedProposals`. |
| `apps/app/app/(workspace)/projects/[slug]/page.tsx` | **Modify** — render the undecided-proposals line. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | **Modify** — new nav keys. |

**The skinned primitive lives in `apps/app`, not `packages/ui`.** Every existing component in that package uses shadcn's semantic tokens — 16 uses of `bg-background`, 14 of `text-foreground`, no app tokens at all — and `apps/web` defines no `paper`, `ink`, `rule`, or `oxide`. A sidebar skinned in those tokens would render unstyled the moment the other app imported it. It also keeps `ease-out-quart` resolvable, since that easing is defined in `apps/app/tailwind.config.ts` and nowhere else. `useIsMobile` is genuinely generic and stays shared.

Two modules carry the logic worth testing. `destinations.ts` exists because the current shell computes its nav inline and has already produced two recorded bugs — `/projects/new` matching as a slug and rendering links to `/projects/new/work`, and a reordering that put Account above the section nav when the bar wrapped. `sidebar-state.ts` exists because the collapse state is read on the server and written on the client, and a mismatch means the first paint is wrong.

---

## Task 1: The nav model (pure)

**Files:**
- Create: `apps/app/lib/shell/destinations.ts`
- Test: `apps/app/tests/unit/shell-destinations.test.ts`

**Interfaces:**
- Produces: `type Destination = { key: string; href: string; labelKey: string; exact: boolean; count?: number }`, `type ChromeProject = { slug: string; title: string; pendingProposals: number }`, `projectSlugFrom(pathname: string): string | null`, `destinationsFor(slug: string, counts: { inbox: number }): Destination[]`, `isActive(pathname: string, destination: Destination): boolean`.

`ChromeProject` lives here rather than in `workspace-chrome.tsx` on purpose: the sidebar needs the type and the chrome needs the sidebar, so declaring it in either component makes the two import each other. A type-only cycle is usually erased, but it is a cycle a bundler is entitled to complain about and there is no reason to create one.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/shell-destinations.test.ts
import { describe, expect, it } from 'vitest';

import { destinationsFor, isActive, projectSlugFrom } from '@/lib/shell/destinations';

describe('projectSlugFrom', () => {
  it('reads the slug out of a project path', () => {
    expect(projectSlugFrom('/projects/ev-bike')).toBe('ev-bike');
    expect(projectSlugFrom('/projects/ev-bike/log')).toBe('ev-bike');
  });

  it('does not treat /projects/new as a slug', () => {
    // A recorded bug in the previous shell: matching the segment alone made
    // "new" look like a project and rendered nav pointing at
    // /projects/new/work and /projects/new/log, neither of which exists.
    expect(projectSlugFrom('/projects/new')).toBeNull();
  });

  it('returns null off the project tree', () => {
    expect(projectSlugFrom('/')).toBeNull();
    expect(projectSlugFrom('/settings')).toBeNull();
  });

  it('decodes an escaped slug', () => {
    // Slugs are Unicode-aware, so a zh title produces percent-encoded path
    // segments that must survive the round trip.
    expect(projectSlugFrom('/projects/%E6%9C%BA%E5%99%A8%E4%BA%BA')).toBe('机器人');
  });
});

describe('destinationsFor', () => {
  it('ships exactly the four sections that exist', () => {
    // Slice A advertises nothing it cannot open. Documents, Agents, and
    // Settings arrive with their own slices.
    const keys = destinationsFor('ev-bike', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox']);
  });

  it('points every destination at the given project', () => {
    for (const d of destinationsFor('ev-bike', { inbox: 0 })) {
      expect(d.href.startsWith('/projects/ev-bike')).toBe(true);
    }
  });

  it('omits the count entirely when it is zero', () => {
    // A badge reading "0" is noise. An empty inbox is the normal state.
    const inbox = destinationsFor('ev-bike', { inbox: 0 }).find((d) => d.key === 'inbox');
    expect(inbox!.count).toBeUndefined();
  });

  it('carries the count when there is one', () => {
    const inbox = destinationsFor('ev-bike', { inbox: 3 }).find((d) => d.key === 'inbox');
    expect(inbox!.count).toBe(3);
  });
});

describe('isActive', () => {
  const dests = destinationsFor('ev-bike', { inbox: 0 });
  const resume = dests.find((d) => d.key === 'resume')!;
  const log = dests.find((d) => d.key === 'log')!;

  it('matches Resume only exactly', () => {
    // Resume is the project root. A prefix match would light it up on every
    // page in the project.
    expect(isActive('/projects/ev-bike', resume)).toBe(true);
    expect(isActive('/projects/ev-bike/log', resume)).toBe(false);
  });

  it('matches a section on its subtree', () => {
    expect(isActive('/projects/ev-bike/log', log)).toBe(true);
    expect(isActive('/projects/ev-bike/log?kind=decision', log)).toBe(true);
  });

  it('does not match a sibling whose name shares a prefix', () => {
    // /work must not light up for a future /workspaces route.
    const work = dests.find((d) => d.key === 'work')!;
    expect(isActive('/projects/ev-bike/workspaces', work)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: FAIL — cannot resolve `@/lib/shell/destinations`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/shell/destinations.ts

/**
 * What the sidebar offers, and which of it you are looking at.
 *
 * Pure, and tested, because the previous shell computed this inline and got it
 * wrong twice: `/projects/new` is a static route, not a slug, and matching the
 * segment alone rendered nav pointing at `/projects/new/work`; and an active
 * check by bare `startsWith` lights up a section for any route that merely
 * shares its prefix.
 */

/** A project as the shell needs it: enough to route to and label. */
export interface ChromeProject {
  slug: string;
  title: string;
  /** Pending proposals awaiting review. Drives the inbox count. */
  pendingProposals: number;
}

export interface Destination {
  key: string;
  href: string;
  /** An i18n key. The shell resolves it; this module never holds prose. */
  labelKey: string;
  /** Match the path exactly rather than as a subtree root. */
  exact: boolean;
  /** Absent means nothing to show — a rendered "0" is noise. */
  count?: number;
}

/** Routes under /projects that are not a project. */
const RESERVED = new Set(['new']);

export function projectSlugFrom(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/?#]+)/);
  if (!match) return null;

  const segment = decodeURIComponent(match[1]);
  return RESERVED.has(segment) ? null : segment;
}

export function destinationsFor(slug: string, counts: { inbox: number }): Destination[] {
  const base = `/projects/${slug}`;

  return [
    { key: 'resume', href: base, labelKey: 'app.nav.resume', exact: true },
    { key: 'work', href: `${base}/work`, labelKey: 'app.nav.work', exact: false },
    { key: 'log', href: `${base}/log`, labelKey: 'app.nav.log', exact: false },
    {
      key: 'inbox',
      href: `${base}/inbox`,
      labelKey: 'app.inbox.title',
      exact: false,
      ...(counts.inbox > 0 ? { count: counts.inbox } : {}),
    },
  ];
}

export function isActive(pathname: string, destination: Destination): boolean {
  // Compare paths only. A query string is a filter within a section, not a
  // different section — /log?kind=decision is still the log.
  const path = pathname.split(/[?#]/)[0];
  if (destination.exact) return path === destination.href;

  // The boundary check is what stops /work matching /workspaces.
  return path === destination.href || path.startsWith(`${destination.href}/`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/shell/destinations.ts apps/app/tests/unit/shell-destinations.test.ts
git commit -m "feat(shell): model the sidebar's destinations as tested pure logic"
```

---

## Task 2: Collapse state (pure)

**Files:**
- Create: `apps/app/lib/shell/sidebar-state.ts`
- Test: `apps/app/tests/unit/shell-sidebar-state.test.ts`

**Interfaces:**
- Produces: `SIDEBAR_COOKIE`, `SIDEBAR_MAX_AGE`, `parseSidebarState(raw: string | undefined): boolean`, `serializeSidebarState(open: boolean): string`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/shell-sidebar-state.test.ts
import { describe, expect, it } from 'vitest';

import {
  SIDEBAR_COOKIE,
  parseSidebarState,
  serializeSidebarState,
} from '@/lib/shell/sidebar-state';

describe('parseSidebarState', () => {
  it('defaults to open when no cookie has been set', () => {
    // First visit shows the nav. A shell that starts collapsed hides every
    // destination from someone who has not learned the rail yet.
    expect(parseSidebarState(undefined)).toBe(true);
  });

  it('reads both states back', () => {
    expect(parseSidebarState('true')).toBe(true);
    expect(parseSidebarState('false')).toBe(false);
  });

  it('falls back to open on anything it does not recognise', () => {
    // The cookie is client-writable. Garbage must not produce a collapsed
    // shell the user cannot explain.
    expect(parseSidebarState('')).toBe(true);
    expect(parseSidebarState('yes')).toBe(true);
  });

  it('round-trips through serialize', () => {
    // The server reads what the client wrote. A mismatch here means the first
    // paint disagrees with the stored state and the sidebar visibly jumps.
    expect(parseSidebarState(serializeSidebarState(false))).toBe(false);
    expect(parseSidebarState(serializeSidebarState(true))).toBe(true);
  });
});

describe('SIDEBAR_COOKIE', () => {
  it('is namespaced to the product', () => {
    // Shared with apps/web on the same apex domain in production.
    expect(SIDEBAR_COOKIE.startsWith('goalspace.')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-sidebar-state.test.ts`
Expected: FAIL — cannot resolve `@/lib/shell/sidebar-state`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/shell/sidebar-state.ts

/**
 * Whether the sidebar starts open.
 *
 * Read on the server from a cookie and written on the client, which is the
 * only way the first paint can match the stored state — deciding in an effect
 * means every navigation renders the wrong shell for a frame.
 *
 * Both halves live here so they cannot drift: a client writing `"0"` and a
 * server reading `"false"` produces a sidebar that silently forgets.
 */

export const SIDEBAR_COOKIE = 'goalspace.sidebar';

/** A year. The preference is not worth asking about twice. */
export const SIDEBAR_MAX_AGE = 60 * 60 * 24 * 365;

export function parseSidebarState(raw: string | undefined): boolean {
  // Anything unrecognised means open. The cookie is client-writable, and the
  // failure this guards is a collapsed shell the user cannot account for.
  return raw === 'false' ? false : true;
}

export function serializeSidebarState(open: boolean): string {
  return open ? 'true' : 'false';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-sidebar-state.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/shell/sidebar-state.ts apps/app/tests/unit/shell-sidebar-state.test.ts
git commit -m "feat(shell): keep the sidebar's collapse state readable on both sides"
```

---

## Task 3: The sidebar primitive

**Files:**
- Create: `packages/ui/src/hooks/use-is-mobile.ts`
- Modify: `packages/ui/src/index.ts`
- Create: `apps/app/components/shell/sidebar.tsx`

**Interfaces:**
- Produces: `useIsMobile(): boolean` from `@goalspace/ui`; and from `@/components/shell/sidebar`: `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarTrigger`, `useSidebar`.

This is shadcn's sidebar **trimmed to what this app uses** and reskinned. Do not paste shadcn's full file: it ships sub-menus, input, skeletons, and several variants none of which appear in the design. YAGNI.

- [ ] **Step 1: Write the viewport hook**

```typescript
// packages/ui/src/hooks/use-is-mobile.ts
'use client';

import { useEffect, useState } from 'react';

/** Below this the sidebar becomes a sheet rather than a rail. */
const MOBILE_BREAKPOINT = 768;

/**
 * Starts false and corrects after mount.
 *
 * The server cannot know the viewport, so any initial guess is wrong half the
 * time. Starting desktop and correcting means the sheet never flashes over
 * desktop content, which is the more jarring of the two mistakes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
```

- [ ] **Step 2: Write the sidebar primitive**

```tsx
// apps/app/components/shell/sidebar.tsx
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Sheet, SheetContent, SheetTitle, cn, useIsMobile } from '@goalspace/ui';

/**
 * shadcn's sidebar, trimmed to what this product uses and reskinned.
 *
 * The structure is worth borrowing: a provider, a rail that collapses, a sheet
 * below the breakpoint. The skin is not — this app is built on hairline rules
 * and warm paper, not cards and neutral gray, so nothing here carries a
 * shadow, a radius, or a filled active state.
 *
 * Sub-menus, inputs, skeletons, and the floating/inset variants are omitted.
 * They are not in the design and an unused variant is a thing that rots.
 */

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used inside <SidebarProvider>');
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  onOpenChange,
  className,
  children,
}: {
  defaultOpen?: boolean;
  /** Called on every change so the host can persist it. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpenState] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  // On mobile the sheet is the sidebar, so the same control has to drive it.
  const toggle = React.useCallback(() => {
    if (isMobile) setOpenMobile((previous) => !previous);
    else setOpen(!open);
  }, [isMobile, open, setOpen]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({ open, setOpen, toggle, isMobile, openMobile, setOpenMobile }),
    [open, setOpen, toggle, isMobile, openMobile]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className={cn('flex min-h-svh w-full bg-paper', className)}>{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  label,
  className,
  children,
}: {
  /** Accessible name for the navigation landmark. Required, not optional. */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isMobile, openMobile, setOpenMobile, open } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-72 border-r border-rule-strong bg-paper p-0"
        >
          {/* Radix requires a title for the dialog's accessible name. It is
              visually hidden because the sheet already shows the project. */}
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <nav aria-label={label} className="flex h-full flex-col">
            {children}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <nav
      aria-label={label}
      data-state={open ? 'open' : 'collapsed'}
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-rule bg-paper md:flex',
        // Width is the only thing that animates, and motion-reduce removes it.
        'transition-[width] duration-200 ease-out-quart motion-reduce:transition-none',
        open ? 'w-64' : 'w-14',
        className
      )}
    >
      {children}
    </nav>
  );
}

export function SidebarHeader({ className, children }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-14 items-center border-b border-rule px-3', className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ className, children }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto py-3', className)}>{children}</div>;
}

export function SidebarFooter({ className, children }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('border-t border-rule px-3 py-3', className)}>{children}</div>
  );
}

export function SidebarGroup({ className, children }: React.ComponentProps<'div'>) {
  return <div className={cn('px-2 py-1', className)}>{children}</div>;
}

export function SidebarMenu({ className, children }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-col gap-0.5', className)}>{children}</ul>;
}

export function SidebarMenuItem({ className, children }: React.ComponentProps<'li'>) {
  return <li className={cn('list-none', className)}>{children}</li>;
}

/**
 * One destination.
 *
 * Active state is a left rule in `oxide` plus a colour change — the existing
 * bottom-border idiom rotated 90°, not a filled pill. Never colour alone:
 * `aria-current` carries it for anyone who cannot see the edge.
 */
export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  {
    asChild?: boolean;
    isActive?: boolean;
    className?: string;
    children: React.ReactNode;
  } & React.ComponentPropsWithoutRef<'a'>
>(function SidebarMenuButton({ asChild, isActive, className, children, ...props }, ref) {
  const Component = asChild ? Slot : 'a';

  return (
    <Component
      ref={ref}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'label unstyled flex h-9 items-center gap-3 border-l-2 px-3 transition-colors',
        isActive
          ? 'border-oxide bg-paper-shade text-ink'
          : 'border-transparent text-ink-soft hover:bg-paper-shade hover:text-ink',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export function SidebarTrigger({
  label,
  className,
}: {
  /** Accessible name. The control is an icon at every width. */
  label: string;
  className?: string;
}) {
  const { toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={cn(
        'label flex h-9 w-9 items-center justify-center border border-rule text-ink-soft transition-colors hover:bg-paper-shade hover:text-ink',
        className
      )}
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}
```

- [ ] **Step 3: Export the hook from the package**

Add one line to `packages/ui/src/index.ts`, after the component exports:

```typescript
export * from './hooks/use-is-mobile';
```

Only the hook. The sidebar itself is an app component and is imported by path.

- [ ] **Step 4: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS for both apps.

`cn`, `Sheet`, `SheetContent`, and `SheetTitle` are all exported from `@goalspace/ui` — verified. Inside `packages/ui` itself, `cn` comes from `../cn`, which is why the hook file must not import it (it does not need to).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/hooks/use-is-mobile.ts packages/ui/src/index.ts apps/app/components/shell/sidebar.tsx
git commit -m "feat(shell): add a sidebar primitive, trimmed and skinned to the system"
```

---

## Task 4: The project sidebar

**Files:**
- Create: `apps/app/components/shell/workspace-sidebar.tsx`
- Modify: `packages/i18n/src/locales/en.json`, `ms.json`, `zh.json`

**Interfaces:**
- Consumes: `ChromeProject`, `destinationsFor`, `isActive` (Task 1); the sidebar primitive from `@/components/shell/sidebar` (Task 3).
- Produces: `WorkspaceSidebar({ projects, current, pathname })`.

- [ ] **Step 1: Add the i18n keys**

`app.nav` gains `toggleSidebar` and `projectNav`. Add to all three locale files:

```json
"toggleSidebar": "Toggle sidebar",
"projectNav": "Project navigation"
```

`ms`: `"toggleSidebar": "Togol bar sisi"`, `"projectNav": "Navigasi projek"`.
`zh`: `"toggleSidebar": "切换侧边栏"`, `"projectNav": "项目导航"`.

- [ ] **Step 2: Write the sidebar**

```tsx
// apps/app/components/shell/workspace-sidebar.tsx
'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './sidebar';

import { destinationsFor, isActive, type ChromeProject } from '@/lib/shell/destinations';

export function WorkspaceSidebar({
  projects,
  current,
  pathname,
}: {
  projects: ChromeProject[];
  current: ChromeProject;
  pathname: string;
}) {
  const { t } = useAppTranslations();
  const { open } = useSidebar();

  const destinations = destinationsFor(current.slug, { inbox: current.pendingProposals });

  return (
    <Sidebar label={t('app.nav.projectNav')}>
      <SidebarHeader>
        <ProjectSwitcher current={current} projects={projects} collapsed={!open} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {destinations.map((destination) => {
              const active = isActive(pathname, destination);
              const label = t(destination.labelKey);

              return (
                <SidebarMenuItem key={destination.key}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={destination.href} title={open ? undefined : label}>
                      {/* Collapsed, the first letter stands in for the label —
                          and `sr-only` keeps the real name in the a11y tree,
                          so the rail is never an unlabelled control. */}
                      <span aria-hidden="true" className={cn(open && 'hidden')}>
                        {label.slice(0, 1)}
                      </span>
                      <span className={cn('flex-1 truncate', !open && 'sr-only')}>{label}</span>
                      {destination.count !== undefined ? (
                        <span className={cn('text-ink-soft', !open && 'sr-only')}>
                          {destination.count}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Unchanged in behaviour from the previous shell: with one project there is
 * nothing to switch to, and a disclosure arrow that opens a menu of one item
 * is a lie about what the control does.
 */
function ProjectSwitcher({
  current,
  projects,
  collapsed,
}: {
  current: ChromeProject;
  projects: ChromeProject[];
  collapsed: boolean;
}) {
  const { t } = useAppTranslations();

  if (collapsed) {
    return (
      <span aria-hidden="true" className="text-title text-ink">
        {current.title.slice(0, 1)}
      </span>
    );
  }

  if (projects.length < 2) {
    return <span className="truncate text-title text-ink">{current.title}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('app.nav.switchProject')}
        className="flex w-full items-center gap-2 truncate text-title text-ink transition-colors hover:text-oxide"
      >
        <span className="truncate">{current.title}</span>
        <span aria-hidden="true" className="label text-ink-soft">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64 border border-rule-strong bg-paper p-0">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.slug}
            asChild
            className="cursor-pointer focus:bg-paper-shade"
          >
            <Link
              href={`/projects/${project.slug}`}
              className={cn(
                'unstyled block px-3 py-2 text-body',
                project.slug === current.slug ? 'text-oxide' : 'text-ink'
              )}
            >
              {project.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS. The old `workspace-chrome.tsx` still declares its own `ChromeProject` at this point; Task 6 removes it in favour of the one from Task 1.

- [ ] **Step 4: Commit**

```bash
git add apps/app/components/shell/workspace-sidebar.tsx packages/i18n
git commit -m "feat(shell): build the project sidebar"
```

---

## Task 5: The header rail

**Files:**
- Create: `apps/app/components/shell/header-rail.tsx`

**Interfaces:**
- Consumes: `SidebarTrigger` from `./sidebar` (Task 3); `Wordmark` from `./wordmark`.
- Produces: `HeaderRail({ title })`.

Everything in the account menu is lifted from the current shell unchanged. The theme control and the sign-out behaviour are not being redesigned.

- [ ] **Step 1: Write the rail**

```tsx
// apps/app/components/shell/header-rail.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { SidebarTrigger } from './sidebar';
import { Wordmark } from './wordmark';
import { createClient } from '@/utils/supabase/client';

export function HeaderRail({ title }: { title: string | null }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function signOut() {
    // Navigate either way. If signOut rejects, React does not surface the
    // rejection from a menu handler, so the user would sit on a page that
    // still looks signed in with no feedback and an ambiguous session.
    try {
      await createClient().auth.signOut();
    } catch (caught) {
      console.error('Sign out failed', caught);
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-rule bg-paper px-4">
      {/* Rendered at every width. The desktop sidebar is `hidden md:flex`, so a
          trigger hidden above `md` would leave desktop with no way to collapse
          it at all. */}
      <SidebarTrigger label={t('app.nav.toggleSidebar')} />

      {title ? (
        <h1 className="truncate text-title text-ink">{title}</h1>
      ) : (
        <Link href="/" className="unstyled shrink-0">
          <Wordmark className="text-title" />
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="label text-ink-soft transition-colors hover:text-ink">
            {t('app.nav.account')}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-48 border border-rule-strong bg-paper p-0"
          >
            <div className="label border-b border-rule px-3 py-2 text-ink-soft">
              {t('app.nav.theme')}
            </div>
            {(['light', 'dark', 'system'] as const).map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => setTheme(value)}
                className={cn(
                  'label cursor-pointer px-3 py-2 focus:bg-paper-shade',
                  theme === value ? 'text-oxide' : 'text-ink'
                )}
              >
                {t(
                  value === 'light'
                    ? 'app.nav.themeLight'
                    : value === 'dark'
                      ? 'app.nav.themeDark'
                      : 'app.nav.themeSystem'
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-rule" />
            <DropdownMenuItem
              onSelect={signOut}
              className="label cursor-pointer px-3 py-2 text-ink focus:bg-paper-shade"
            >
              {t('app.common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/components/shell/header-rail.tsx
git commit -m "feat(shell): add the header rail, carrying the account menu over"
```

---

## Task 6: Compose the shell

**Files:**
- Modify: `apps/app/components/shell/workspace-chrome.tsx` (full rewrite)
- Modify: `apps/app/app/(workspace)/layout.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: `WorkspaceChrome({ projects, defaultSidebarOpen, children })`. `ChromeProject` is re-exported from `@/lib/shell/destinations` for the layout's convenience, not redeclared.

- [ ] **Step 1: Rewrite the chrome as composition**

```tsx
// apps/app/components/shell/workspace-chrome.tsx
'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { SidebarProvider } from './sidebar';

import { projectSlugFrom, type ChromeProject } from '@/lib/shell/destinations';
import { SIDEBAR_COOKIE, SIDEBAR_MAX_AGE, serializeSidebarState } from '@/lib/shell/sidebar-state';
import { WorkspaceSidebar } from './workspace-sidebar';
import { HeaderRail } from './header-rail';

export type { ChromeProject };

/**
 * The shell is composition and nothing else.
 *
 * What can be wrong here — which destinations exist, which is active, whether
 * the sidebar starts open — lives in `lib/shell/` and is unit-tested. This
 * file arranges components, so it is verified by typecheck and build; `apps/app`
 * runs vitest in a node environment with no jsdom, and adding component-test
 * infrastructure for a layout is not worth it.
 */
export function WorkspaceChrome({
  projects,
  defaultSidebarOpen,
  children,
}: {
  projects: ChromeProject[];
  defaultSidebarOpen: boolean;
  children: React.ReactNode;
}) {
  const { t } = useAppTranslations();
  const pathname = usePathname() ?? '/';

  // Resolved from the URL rather than from props, so the shell cannot disagree
  // with the page it sits around during a client transition.
  const slug = projectSlugFrom(pathname);
  const current = projects.find((project) => project.slug === slug) ?? null;

  const persist = useCallback((open: boolean) => {
    document.cookie = `${SIDEBAR_COOKIE}=${serializeSidebarState(open)}; path=/; max-age=${SIDEBAR_MAX_AGE}; samesite=lax`;
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} onOpenChange={persist}>
      {/*
        Keyboard users should not have to tab the whole nav on every page.

        Positioned off-screen by transform rather than with
        `sr-only focus:not-sr-only`: that pairing has `not-sr-only` setting
        `position: static` while `focus:absolute` sets `absolute`, so which one
        applies depends on Tailwind's internal utility ordering, and if static
        won the link would shove the page down as it appeared. A transform
        cannot reflow anything and does not depend on emit order.
      */}
      <a
        href="#workspace-main"
        className="label absolute left-4 top-4 z-50 -translate-y-24 border border-rule-strong bg-paper px-4 py-3 text-ink transition-transform duration-150 ease-out-quart focus:translate-y-0"
      >
        {t('app.nav.skipToContent')}
      </a>

      {current ? (
        <WorkspaceSidebar projects={projects} current={current} pathname={pathname} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderRail title={current?.title ?? null} />
        <main id="workspace-main" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Read the cookie in the layout**

```tsx
// apps/app/app/(workspace)/layout.tsx
import { cookies } from 'next/headers';

import { requireSessionContext } from '@/lib/auth/session';
import { listProjects } from '@/lib/db/projects';
import { countPendingByProject } from '@/lib/db/proposals';
import { SIDEBAR_COOKIE, parseSidebarState } from '@/lib/shell/sidebar-state';
import { WorkspaceChrome } from '@/components/shell/workspace-chrome';

// The workspace is per-user and reads live rows on every request, so nothing
// here can be prerendered or cached across users.
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await requireSessionContext();
  const projects = await listProjects(supabase, userId);
  const pending = await countPendingByProject(supabase);

  // Read here rather than in an effect: deciding on the client means the first
  // paint shows the wrong width and the sidebar visibly snaps.
  const store = await cookies();
  const defaultSidebarOpen = parseSidebarState(store.get(SIDEBAR_COOKIE)?.value);

  return (
    <WorkspaceChrome
      projects={projects.map(({ id, slug, title }) => ({
        slug,
        title,
        pendingProposals: pending.get(id) ?? 0,
      }))}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </WorkspaceChrome>
  );
}
```

- [ ] **Step 3: Give the pages their own measure**

The old `<main>` carried `mx-auto max-w-5xl px-5` and now does not, because the sidebar occupies part of the width and a centred 5xl column inside the remaining space sits off-centre against the rail.

Each of the four page files wraps its content in `<div className="mx-auto w-full max-w-4xl px-6 py-8">` at its outermost element:

- `apps/app/app/(workspace)/page.tsx`
- `apps/app/app/(workspace)/projects/[slug]/page.tsx`
- `apps/app/app/(workspace)/projects/[slug]/work/page.tsx`
- `apps/app/app/(workspace)/projects/[slug]/log/page.tsx`

`inbox/page.tsx` already carries `mx-auto w-full max-w-3xl px-4 py-8` and needs no change.

- [ ] **Step 4: Give capture a labelled landmark**

Spec §8 asks for a labelled region for each of sidebar, main, and capture. The
first two exist; capture does not.

In `apps/app/app/(workspace)/projects/[slug]/layout.tsx`, wrap the existing
`<CaptureBar />` — do not modify the component itself:

```tsx
<section aria-label={t('app.capture.region')}>
  <CaptureBar slug={slug} targets={captureTargetsFrom(workItems)} />
</section>
```

That layout is a server component, so resolve the label with
`getFixedT(await getLocale())` the way `log/page.tsx` does, rather than the
client hook.

Add `app.capture.region` to all three locales:

- `en`: `"region": "Quick capture"`
- `ms`: `"region": "Tangkapan pantas"`
- `zh`: `"region": "快速记录"`

- [ ] **Step 5: Verify the whole project**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: typecheck PASS; every existing test still passes plus the 16 from Tasks 1–2; build PASS with all routes listed.

- [ ] **Step 6: Look at it**

Run: `nvm use 22 && pnpm dev`, sign in at `http://localhost:3001`, and check:

- the sidebar shows Resume, Work, Log, Inbox and nothing else
- the active item carries the oxide edge and `aria-current`
- collapsing persists across a reload
- below 768px the sidebar becomes a sheet
- capture still sits at the bottom of the project pages and still submits
- Tab from the top of the page reaches "Skip to content" first

- [ ] **Step 7: Commit**

```bash
git add apps/app/components/shell apps/app/app/\(workspace\) packages/i18n
git commit -m "feat(shell): replace the top bar with a project sidebar"
```

---

## Task 7: Undecided proposals on Resume

**Files:**
- Modify: `apps/app/lib/db/resume.ts`
- Modify: `apps/app/app/(workspace)/projects/[slug]/page.tsx`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**Interfaces:**
- Consumes: `countPendingByProject` from `@/lib/db/proposals`.
- Produces: `ResumeData.undecidedProposals: number`.

- [ ] **Step 1: Add the count to the resume query**

In `apps/app/lib/db/resume.ts`, add to the `ResumeData` interface:

```typescript
  /**
   * Proposals awaiting a decision. An open loop like any other, and the one
   * phase 2b created and left off this surface.
   */
  undecidedProposals: number;
```

Add the import:

```typescript
import { countPendingByProject } from './proposals';
```

Add the read to the existing `Promise.all`, as a sixth entry, and destructure it:

```typescript
  const [workItems, recentEntries, recentDecisions, latestEntryAt, latestStatusAt, pending] =
    await Promise.all([
      listWorkItems(supabase, project.id),
      listEntries(supabase, project.id, { limit: 8 }),
      listEntries(supabase, project.id, { kinds: ['decision'], limit: 5 }),
      getLatestEntryAt(supabase, project.id),
      getLatestStatusChangeAt(supabase, project.id),
      countPendingByProject(supabase),
    ]);
```

Then include it in the returned object:

```typescript
    undecidedProposals: pending.get(project.id) ?? 0,
```

- [ ] **Step 2: Add the i18n key**

`app.resume` gains `undecidedProposals`:

- `en`: `"undecidedProposals": "Undecided proposals"`
- `ms`: `"undecidedProposals": "Cadangan belum diputuskan"`
- `zh`: `"undecidedProposals": "未决提议"`

- [ ] **Step 3: Render the line**

In `apps/app/app/(workspace)/projects/[slug]/page.tsx`, add the Link import at the top — the file uses `getFixedT` and defines `const t` already, but imports no `Link`:

```typescript
import Link from 'next/link';
```

Then find the block listing open questions and blocked items, and add one row in the same markup, immediately after them:

```tsx
{data.undecidedProposals > 0 ? (
  <Link href={`/projects/${slug}/inbox`} className="unstyled flex items-baseline gap-3">
    <span className="label text-ink-soft">{t('app.resume.undecidedProposals')}</span>
    <span className="text-body text-ink">{data.undecidedProposals}</span>
  </Link>
) : null}
```

Zero renders nothing, as everywhere else. Match the surrounding rows' exact classes rather than these if they differ — the point is that this row is indistinguishable in style from the ones above it.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: PASS throughout.

- [ ] **Step 5: See it with real data**

```bash
pnpm --filter @goalspace/app db:start
```

Then in Supabase Studio (`http://localhost:54323`) insert a `proposals` row for your project with `status = 'pending'`, and confirm the line appears on Resume and the count appears next to Inbox in the sidebar. Delete the row afterwards.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/db/resume.ts apps/app/app/\(workspace\)/projects/\[slug\]/page.tsx packages/i18n
git commit -m "feat(resume): surface proposals you never decided"
```

---

## Done when

1. The sidebar shows exactly Resume, Work, Log, and Inbox, each resolving to a working page.
2. The active destination carries both the oxide edge and `aria-current="page"`.
3. Collapsing the sidebar survives a reload, and the first paint is already the stored width.
4. Below 768px the sidebar is a sheet; above it, a rail that collapses to icons with accessible names intact.
5. Quick capture is unchanged in behaviour and still submits from every project page; it now sits in a labelled landmark.
6. Tab from the top of any page reaches "Skip to content" before the navigation.
7. Resume shows undecided proposals when there are any and nothing when there are none.
8. `pnpm typecheck && pnpm test && pnpm build` all pass.

## Not in this plan

Documents, agents, run traces, and settings — slices B, C, and D. The sidebar does not link to them and must not: nothing is advertised that does not exist. Each slice adds its own entry to `destinationsFor`, which is why that function is the extension point rather than markup inside the sidebar.

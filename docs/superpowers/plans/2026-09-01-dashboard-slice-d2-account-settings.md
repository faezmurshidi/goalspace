# Workspace Dashboard, Slice D2: Account Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a person set their theme, language, time zone and email preference once, have it follow them to a new browser, and have dates actually render in the zone they chose.

**Architecture:** The durable preference lives in `user_settings`; a cookie carries it per request. That split is forced by a fact about this app: the root layout wraps `/login` and `/auth` as well as the workspace, so it has no session and must not query the database to decide what to render. The locale already works this way — D2 extends the same shape to theme and time zone, and adds the one missing piece that makes any of it cross-device: seeding those cookies from the database at login.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres + RLS) · zod · Vitest · next-themes.

**Spec:** [docs/superpowers/specs/2026-08-26-workspace-dashboard-design.md](../specs/2026-08-26-workspace-dashboard-design.md) — §5 (shell), §6.6 (account settings), §7 (data work). Slices A, B, C and D1 are on `main`.

**D1 already shipped the schema.** `user_settings.locale` and `time_zone` exist in production, with defaults `'en'` and `'UTC'`, and are **read by nothing**. This slice is what makes them real. No migration is needed.

## Global Constraints

- **WCAG 2.1 AA.** Every form control has a label. Error text carries `role="alert"`; a success message carries `role="status"` — a save that announces nothing is a 4.1.3 failure, and D1 had to fix exactly that.
- **There is no `danger` colour token.** The palette is exactly `paper` / `paper-shade` / `ink` / `ink-soft` / `rule` / `rule-strong` / `oxide` / `oxide-deep` / `waiting`. `text-danger` compiles to nothing.
- **Square corners, no shadows.** Sections separated by hairline rules.
- **Control clusters wrap at phone widths:** `flex flex-wrap`, `min-w-0 flex-1` on growing cells, `shrink-0` on fixed ones.
- **`next.config.js` sets `trailingSlash: true`.** Path comparison goes through `isActive(pathname, destination)` — pathname first.
- **Every user-facing string in `en`, `ms`, `zh`, with identical key sets.** `packages/i18n/tests/locale-parity.test.ts` fails and names any key added to one file and forgotten in another.
- **`apps/app` vitest runs `environment: 'node'`** with `include: ['tests/**/*.test.ts']`. No jsdom, no `.tsx` test files, no component tests. Pure functions and server code are unit-tested; components are verified in a browser.
- **RLS tests are the security regression gate.** The suite is at **86** tests. When you add a read or write path, extend them — and create both test users in `beforeAll`, never inside a test body, and never assert a literal a sibling test wrote. D1 shipped both of those mistakes and had to fix them.
- **No `any`, no `@ts-expect-error`.**
- **Node 22+:** `source ~/.nvm/nvm.sh && nvm use 22` **in the same shell invocation** as the command, then `corepack pnpm` from the repo root.

## Rulings taken while writing this plan

**R1 — the column is the durable preference; a cookie is the request-time source.**
Not a hedge, a constraint. `apps/app/app/layout.tsx` is the root layout for the whole app including `/login` and `/auth`, and it has no session. Reading `user_settings` there would mean a database round-trip on every request including unauthenticated ones, to answer a question that must be settled before first paint. The locale already solves this with `NEXT_LOCALE`, and the D1 migration comment states the intent in as many words: *"Cookie remains the request-time source; this is the durable preference."* Theme and time zone follow the same shape.

**R2 — login seeds the cookies from the column. This is the piece that makes it cross-device.**
Without it, the column is a write-only field: you would save a preference, and a new browser would still show defaults, because nothing ever reads the column back into a cookie. `app/auth/callback/route.ts` already exchanges the code and holds a session — it sets the cookies there, on the response it is already returning.

**R3 — theme resolution: localStorage wins on a device you have used, the cookie wins on a fresh one.**
`next-themes` stores its choice in localStorage and applies the class before paint, which is what prevents a flash. Fighting that would reintroduce one. So the root layout passes the cookie value as `defaultTheme`, which `next-themes` uses **only when localStorage is empty** — precisely the new-device case. Verified against the installed next-themes 0.3.0: its pre-paint script falls through to `defaultTheme` only when the stored value is absent, and its state initialiser is `localStorage.getItem(key) || fallback`. Consulted exactly then, no more and no less.

**The consequence, which matters more than the mechanism.** Because localStorage *unconditionally* beats `defaultTheme`, **any writer that touches localStorage without also setting the cookie makes the account preference permanently invisible on that device.** Not until next login — permanently, because nothing ever clears it.

Two places in this codebase do exactly that today, and both are fixed in this slice:

- The header-rail theme menu calls `setTheme()` alone (`header-rail.tsx:71`). Task 7 makes it persist as well.
- Sign-out leaves `localStorage.theme` behind, so the next person to log in on that browser inherits the previous user's theme and their own account preference silently never applies. Task 7 clears it.

A save in account settings therefore always does both: `setTheme()` for the local mechanism, and the action for the column plus cookie.

**R4 — the time zone list comes from `Intl.supportedValuesOf('timeZone')`, never a hardcoded list.**
The D1 migration deliberately left `time_zone` unconstrained by CHECK, reasoning that the IANA list is maintained outside this repo and a hardcoded copy would eventually reject a legitimate zone. A hardcoded list in the UI would be the same mistake one layer up.

**R5 — the formatters default to `'UTC'`, never to the server's zone.**
`Intl.DateTimeFormat` with no `timeZone` uses the runtime's zone. That is the bug this slice exists to fix — a date rendering in whatever zone the server happens to run in. An explicit default makes the fallback a decision rather than an accident.

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/app/lib/db/user-settings.ts` | **Create.** `getUserSettings`, `updateUserSettings`. |
| `apps/app/lib/schemas/user-settings.ts` | **Create.** `updateAccountSettingsSchema`. (`THEMES` lives in `preference-cookies.ts`.) |
| `apps/app/lib/settings/preference-cookies.ts` | **Create.** Pure: cookie names, serialise/parse, the set-all helper's inputs. |
| `apps/app/lib/format.ts` | **Modify.** Formatters take a time zone; `getTimeZone()` added beside `getLocale()`. |
| `apps/app/app/layout.tsx` | **Modify.** Reads the theme cookie, passes it as `defaultTheme`. |
| `apps/app/app/auth/callback/route.ts` | **Modify.** Seeds preference cookies from the column after a successful exchange. |
| `apps/app/app/(workspace)/actions.ts` | **Modify.** Gains `updateAccountSettingsAction`. |
| `apps/app/app/(workspace)/settings/page.tsx` | **Create.** The account settings route. |
| `apps/app/app/(workspace)/settings/account-form.tsx` | **Create.** Theme, language, time zone, notifications. |
| `apps/app/app/(workspace)/settings/loading.tsx` | **Create.** Skeleton, with `LoadingAnnouncement` like all seven siblings. |
| `apps/app/components/shell/header-rail.tsx` | **Modify.** Account menu links to `/settings`. |
| `apps/app/components/resume/regions.tsx` | **Modify.** `Common` gains `timeZone`; six call sites pass it. |
| Six workspace pages | **Modify.** Pass `timeZone` to the formatters. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | **Modify.** New strings, all three. |

---

## Task 1: Preference cookies, as a pure module

Doing this first means the cookie names exist in one place before three different files need them, and the parsing is unit-tested without a request.

**Files:**
- Create: `apps/app/lib/settings/preference-cookies.ts`
- Test: `apps/app/tests/unit/preference-cookies.test.ts`

**Interfaces:**
- Produces: `THEME_COOKIE`, `TIME_ZONE_COOKIE`, `PREFERENCE_COOKIE_MAX_AGE`, `THEMES`, `type ThemePreference = 'light' | 'dark' | 'system'`, `parseTheme(value: string | undefined): ThemePreference`, `parseTimeZone(value: string | undefined): string`, `isSupportedTimeZone(value: string): boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/preference-cookies.test.ts
import { describe, expect, it } from 'vitest';

import {
  isSupportedTimeZone,
  parseTheme,
  parseTimeZone,
  THEME_COOKIE,
  TIME_ZONE_COOKIE,
} from '@/lib/settings/preference-cookies';

describe('parseTheme', () => {
  it('accepts the three themes next-themes understands', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
  });

  it('falls back to system for anything else', () => {
    // A cookie is client-writable. Anything unrecognised must land on the
    // documented default rather than reaching next-themes as a class name.
    for (const value of [undefined, '', 'sepia', 'DARK', '<script>']) {
      expect(parseTheme(value)).toBe('system');
    }
  });
});

describe('parseTimeZone', () => {
  it('accepts a real IANA zone', () => {
    expect(parseTimeZone('Asia/Kuala_Lumpur')).toBe('Asia/Kuala_Lumpur');
    expect(parseTimeZone('Europe/London')).toBe('Europe/London');
  });

  it('falls back to UTC for anything the runtime does not know', () => {
    // Never the server's own zone: rendering dates in whatever zone the host
    // happens to run in is the bug this slice exists to fix, so the fallback
    // has to be a stated value rather than an ambient one.
    for (const value of [undefined, '', 'Mars/Olympus_Mons', 'GMT+7', '../etc']) {
      expect(parseTimeZone(value)).toBe('UTC');
    }
  });

  it('does not throw on a value that would break Intl', () => {
    expect(() => parseTimeZone('\n')).not.toThrow();
    expect(() => parseTimeZone('🚀')).not.toThrow();
  });
});

describe('isSupportedTimeZone', () => {
  it('agrees with the runtime rather than a hardcoded list', () => {
    // The D1 migration deliberately left time_zone unconstrained because the
    // IANA list is maintained outside this repo. A hardcoded list here would
    // be the same mistake one layer up.
    expect(isSupportedTimeZone('UTC')).toBe(true);
    expect(isSupportedTimeZone('America/New_York')).toBe(true);
    expect(isSupportedTimeZone('Nowhere/Nothing')).toBe(false);
  });
});

describe('cookie names', () => {
  it('are distinct and namespaced like the existing locale cookie', () => {
    expect(THEME_COOKIE).not.toBe(TIME_ZONE_COOKIE);
    for (const name of [THEME_COOKIE, TIME_ZONE_COOKIE]) {
      expect(name).toMatch(/^[A-Za-z0-9_.-]+$/);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/preference-cookies.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// apps/app/lib/settings/preference-cookies.ts

/**
 * Preferences that must be known before the first paint.
 *
 * The durable copy of each lives in `user_settings`. These cookies are the
 * request-time copy, and they exist because `app/layout.tsx` is the root layout
 * for the whole app — including `/login` and `/auth`, where there is no session
 * to read settings with. Querying the database there would mean a round-trip on
 * every request, authenticated or not, to answer a question that has to be
 * settled before anything renders.
 *
 * The locale already works this way (`NEXT_LOCALE`); this is the same shape for
 * theme and time zone.
 */

export const THEME_COOKIE = 'goalspace.theme';
export const TIME_ZONE_COOKIE = 'goalspace.tz';

/** A year. These are preferences, not sessions. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Exported because three places need it: this parser, the account form's
 * select, and the header-rail theme menu. `header-rail.tsx` already carries a
 * hardcoded copy — replace it with this one rather than adding a third.
 */
export const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];

/**
 * A cookie is client-writable, so every value here is untrusted input. An
 * unrecognised theme must land on the default rather than reaching next-themes,
 * which would put it on `<html>` as a class name.
 */
export function parseTheme(value: string | undefined): ThemePreference {
  return THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';
}

/**
 * Whether the running JavaScript engine recognises this zone.
 *
 * Asks `Intl` rather than consulting a list. The D1 migration left `time_zone`
 * unconstrained for exactly this reason: the IANA database is maintained
 * outside this repo and gains zones on its own schedule, so a copy kept here
 * would eventually reject a zone nobody chose to disallow.
 */
export function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function parseTimeZone(value: string | undefined): string {
  if (!value) return 'UTC';
  return isSupportedTimeZone(value) ? value : 'UTC';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/preference-cookies.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/settings/preference-cookies.ts apps/app/tests/unit/preference-cookies.test.ts
git commit -m "feat(settings): preference cookies, parsed against the runtime not a list"
```

---

## Task 2: Time zone in the formatters

**Files:**
- Modify: `apps/app/lib/format.ts`
- Test: `apps/app/tests/unit/format.test.ts`

**Interfaces:**
- Consumes: `TIME_ZONE_COOKIE`, `parseTimeZone` (Task 1).
- Produces: `getTimeZone(): Promise<string>`; `formatDate(iso, locale, timeZone)`, `formatDateTime(iso, locale, timeZone)`, `formatMonthYear(iso, locale, timeZone)`.

**This task changes three function signatures with twelve call sites.** Do not update the call sites here — Task 3 does that in one sweep. Make `timeZone` a **required** third parameter so the compiler lists every site rather than letting some silently keep the old behaviour.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/format.test.ts
import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatMonthYear } from '@/lib/format';

// 2026-01-01T02:00:00Z is still 2025-12-31 in New York and already
// 2026-01-01 in Kuala Lumpur — so a zone that is ignored shows up as a
// wrong day, month and year at once.
const NEW_YEAR_UTC = '2026-01-01T02:00:00.000Z';

describe('formatDate', () => {
  it('renders the date in the given zone, not the runtime zone', () => {
    expect(formatDate(NEW_YEAR_UTC, 'en', 'UTC')).toContain('2026');
    expect(formatDate(NEW_YEAR_UTC, 'en', 'America/New_York')).toContain('2025');
  });

  it('shifts the day across a zone boundary', () => {
    const kl = formatDate(NEW_YEAR_UTC, 'en', 'Asia/Kuala_Lumpur');
    const ny = formatDate(NEW_YEAR_UTC, 'en', 'America/New_York');
    expect(kl).not.toBe(ny);
  });
});

describe('formatDateTime', () => {
  it('renders the hour in the given zone', () => {
    // 02:00 UTC is 10:00 in Kuala Lumpur (UTC+8).
    expect(formatDateTime(NEW_YEAR_UTC, 'en', 'Asia/Kuala_Lumpur')).toMatch(/10[:.]00/);
    expect(formatDateTime(NEW_YEAR_UTC, 'en', 'UTC')).toMatch(/02[:.]00/);
  });
});

describe('formatMonthYear', () => {
  it('crosses a month boundary with the zone', () => {
    expect(formatMonthYear(NEW_YEAR_UTC, 'en', 'UTC')).toContain('January');
    expect(formatMonthYear(NEW_YEAR_UTC, 'en', 'America/New_York')).toContain('December');
  });
});

describe('an unknown zone', () => {
  it('renders as UTC rather than throwing or falling back to the host', () => {
    // Intl throws a RangeError on an unknown zone. A date page must not 500
    // because a cookie held a stale zone name.
    expect(() => formatDate(NEW_YEAR_UTC, 'en', 'Mars/Olympus_Mons')).not.toThrow();
    expect(formatDate(NEW_YEAR_UTC, 'en', 'Mars/Olympus_Mons')).toBe(
      formatDate(NEW_YEAR_UTC, 'en', 'UTC')
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/format.test.ts`
Expected: FAIL — the formatters take two arguments.

- [ ] **Step 3: Implement**

Add `timeZone` as a required third parameter to all three formatters, pass it into the `Intl.DateTimeFormat` options, and guard it with `parseTimeZone` so an unknown value renders as UTC instead of throwing. Add `getTimeZone()` beside the existing `getLocale()`, reading `TIME_ZONE_COOKIE` through `parseTimeZone`. Follow `getLocale`'s exact shape — it reads `cookies()` and returns a parsed value.

Each formatter's doc comment should say **why** the zone is explicit: `Intl.DateTimeFormat` with no `timeZone` uses the runtime's zone, so a server in one region would render every date in that region for every reader.

- [ ] **Step 4: Run to verify it passes**

Run: `corepack pnpm --filter @goalspace/app exec vitest run tests/unit/format.test.ts`
Expected: PASS, 5 tests.

**Typecheck will now fail** at the twelve call sites. That is intended and is Task 3's work — do not fix them here, and do not commit a broken typecheck: commit this task together with Task 3.

- [ ] **Step 5: Do not commit yet**

Proceed directly to Task 3. These two tasks share one commit, because the repository does not typecheck between them.

---

## Task 3: Thread the time zone through every call site

**Files:**
- Modify: `apps/app/components/resume/regions.tsx` (6 call sites, via its shared prop type)
- Modify: `apps/app/app/(workspace)/projects/[slug]/page.tsx` (passes `timeZone` into those components)
- Modify: `apps/app/app/(workspace)/projects/[slug]/log/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/agents/[agentId]/page.tsx`
- Modify: `apps/app/app/(workspace)/projects/[slug]/runs/[runId]/page.tsx`

- [ ] **Step 1: Find every call site from the compiler**

```bash
corepack pnpm typecheck 2>&1 | grep -E "error TS2554" | sort -u
```

**Grep for the error code, not the function name.** Piped output is not `--pretty`, so TypeScript emits `path(line,col): error TS2554: Expected 3 arguments, but got 2.` — the message does **not** contain `formatDate`. Grepping for the function name returns nothing, which would read as "no call sites" and cause this task to be skipped, leaving the branch unable to typecheck because Task 2 is deliberately uncommitted.

Expect twelve results across seven files. Cross-check against the file list above: if the compiler names a file this plan does not, the plan is stale — fix the site and say so in your report.

- [ ] **Step 2: Thread it through**

Each server page already calls `getLocale()`; add `getTimeZone()` beside it and pass the value as the third argument.

`components/resume/regions.tsx` is a **server** component whose exported pieces share a `Common` prop type carrying `t` and `locale`. Add `timeZone: string` to `Common` and pass it from `projects/[slug]/page.tsx`.

**Then fix the three components that opt out of `locale`.** `regions.tsx` types three of its exports as `Omit<Common, 'locale'>` — at lines 224, 333 and 348 — because they render no dates. Adding `timeZone` to `Common` would make those three *require* a time zone they never use, and produce three fresh errors at the call site. Widen each to `Omit<Common, 'locale' | 'timeZone'>`.

An earlier draft of this plan claimed one type change and one call site would cover all six usages. It would not; that is why this paragraph exists.

- [ ] **Step 3: Verify**

```bash
corepack pnpm typecheck && corepack pnpm test
```
Expected: both pass. The typecheck passing is the proof that no call site was missed — that is why the parameter is required rather than optional.

- [ ] **Step 4: Commit Tasks 2 and 3 together**

```bash
# Stage the specific files the compiler named, not the whole route tree —
# `git add "apps/app/app/(workspace)"` would sweep in anything else in progress.
git add apps/app/lib/format.ts apps/app/tests/unit/format.test.ts apps/app/components/resume/regions.tsx
git add $(corepack pnpm typecheck 2>&1 | grep -oE "apps/app/app/\(workspace\)[^(]*\.tsx" | sort -u)
git commit -m "feat(settings): render dates in the reader's time zone, not the server's"
```

---

## Task 4: Reading and writing account settings

**Files:**
- Create: `apps/app/lib/db/user-settings.ts`
- Create: `apps/app/lib/schemas/user-settings.ts`
- Test: `apps/app/tests/unit/user-settings-schema.test.ts`, `apps/app/tests/rls/user-settings.test.ts`

**Interfaces:**
- Consumes: `isSupportedTimeZone` (Task 1); `locales` from `@goalspace/i18n`.
- Produces: `type UserSettings = Tables<'user_settings'>`, `getUserSettings(supabase, userId): Promise<UserSettings>`, `updateUserSettings(supabase, { userId, values }): Promise<UserSettings | null>`, `updateAccountSettingsSchema`, `UpdateAccountSettingsValues`.

**The schema's locale list comes from `packages/i18n`, which is where the database CHECK came from.** Verified: `packages/i18n/src/locales.ts` exports `locales = ['en', 'ms', 'zh'] as const` and the `Locale` type, and it is re-exported from the package root. `apps/app/lib/schemas/common.ts` has **no** locale schema, so there is nothing to reuse there and nothing to collide with — build `z.enum(locales)` from the shared tuple rather than writing a third copy of the list.

**The time zone is validated with `isSupportedTimeZone`, not a list** — same reasoning as R4.

- [ ] **Step 1: Write the failing tests**

The unit test covers the schema: each theme accepted, an unknown theme rejected, each shipped locale accepted, an unshipped one rejected, a real IANA zone accepted, an invented one rejected, and `email_notifications` accepting both booleans (a `false` must not be treated as absent — that is the same trap as D1's zero cap).

The RLS test covers isolation, and **must follow the corrected pattern**: create both users in `beforeAll`, and for the refusal case pass **alice's** userId with **bob's** client so RLS is what refuses rather than the function's own filter. Assert the refused write changed nothing by reading the value first, not by comparing to a literal another test wrote.

Cases: `getUserSettings` returns the row the signup trigger created; `updateUserSettings` changes all four fields; a second user cannot read alice's settings; a second user cannot write them, and alice's row is unchanged afterwards.

**The defaults case needs its own user.** Asserting that `getUserSettings` returns column defaults only holds while nothing has updated that row — so if it shares a user with the update case it silently depends on test order, which is the D1 mistake in mirror image. Create a third user in `beforeAll` used by that case alone, and delete it in `afterAll` with the others.

- [ ] **Step 2: Run to verify they fail**

`corepack pnpm --filter @goalspace/app exec vitest run tests/unit/user-settings-schema.test.ts` then `corepack pnpm test:rls`.

- [ ] **Step 3: Implement**

Follow `apps/app/lib/db/budgets.ts` for the module shape. `user_settings` has a `unique (user_id)`, and `on_auth_user_created` inserts the row in the same transaction as the auth record (`20260814000100_users_profile_trigger.sql:84`, with a one-off backfill at `:173`), so `getUserSettings` reads rather than upserts.

Still handle a missing row by returning the column defaults rather than throwing: the trigger guarantees new accounts, not old ones, and a settings page that 500s is a worse failure than one showing defaults.

`updateUserSettings` filters on `user_id` and returns `null` when nothing matched, so the caller can distinguish refused from changed.

- [ ] **Step 4: Verify**

`corepack pnpm typecheck && corepack pnpm test && corepack pnpm test:rls` — the RLS suite is at 86 before this task.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/db/user-settings.ts apps/app/lib/schemas/user-settings.ts apps/app/tests/unit/user-settings-schema.test.ts apps/app/tests/rls/user-settings.test.ts
git commit -m "feat(settings): read and write account preferences, isolation-tested"
```

---

## Task 5: The action, and the cookies it must keep in step

**Files:**
- Modify: `apps/app/app/(workspace)/actions.ts`
- Modify: `apps/app/app/auth/callback/route.ts`

**Interfaces:**
- Produces: `updateAccountSettingsAction(input: unknown): Promise<ActionResult<{ locale: string }>>`.

**Two writes, one act.** The action persists to `user_settings` **and** sets the three preference cookies (`NEXT_LOCALE`, `THEME_COOKIE`, `TIME_ZONE_COOKIE`) on the same response. Persisting without setting the cookies would leave the current session rendering the old preference until the next login; setting cookies without persisting would lose it on a new device.

**Login is where the column becomes real.** In `app/auth/callback/route.ts`, after `exchangeCodeForSession` succeeds and before the redirect, read the user's settings and set the same three cookies on the response being returned. Without this the column is write-only — a new browser would show defaults forever, because nothing reads it back.

Set them on the `NextResponse` the route already builds. Do not add a second redirect.

**If reading settings fails, delete the three preference cookies and continue to the redirect.** A preference lookup must never cost someone their login — but leaving the cookies untouched is not the safe fallback it looks like. On a shared browser they still hold the *previous* account's theme, language and time zone, so the new user would silently inherit them. Clearing is the correct failure mode: the app falls back to documented defaults rather than to somebody else's preferences.

- [ ] **Step 1: Write the action**

Follow `updateProjectAction` in the same file for shape: `safeParse` → `requireSessionContext` → db call → `fail`/`ok`. It has no slug; account settings are not project-scoped.

Revalidate `'/'` at layout scope, since locale and theme affect every rendered page.

- [ ] **Step 2: Seed the cookies at login**

- [ ] **Step 3: Verify**

`corepack pnpm typecheck && corepack pnpm test`

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(workspace)/actions.ts" apps/app/app/auth/callback/route.ts
git commit -m "feat(settings): persist account preferences, and seed them at login"
```

---

## Task 6: Theme resolution in the root layout

**Files:**
- Modify: `apps/app/app/layout.tsx`

The root layout currently hardcodes `defaultTheme="system"`. Read `THEME_COOKIE` and pass its parsed value instead.

**Why this is the whole mechanism, and why it does not fight `next-themes`:** `next-themes` reads localStorage and applies the class before paint, which is what prevents a flash. `defaultTheme` is used **only when localStorage holds nothing** — which is exactly a browser you have not used before. So a familiar device keeps its most recent local choice, a fresh one inherits the account preference seeded at login, and the two never race. Do not add an effect that syncs localStorage from the cookie; that reintroduces the flash this avoids.

Keep `suppressHydrationWarning` on `<html>` — `next-themes` mutates that element before React hydrates, and removing it would fill the console with warnings that are expected here.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Verify** — `corepack pnpm typecheck && corepack pnpm build`
- [ ] **Step 3: Commit**

```bash
git add apps/app/app/layout.tsx
git commit -m "feat(settings): let the account theme decide first paint on a new device"
```

---

## Task 7: The account settings route

**Files:**
- Create: `apps/app/app/(workspace)/settings/page.tsx`
- Create: `apps/app/app/(workspace)/settings/account-form.tsx`
- Create: `apps/app/app/(workspace)/settings/loading.tsx`
- Modify: `apps/app/components/shell/header-rail.tsx`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**This route is not project-scoped**, and the shell already handles that: `workspace-chrome.tsx` resolves the project from the pathname, finds none, and renders the wordmark instead of a section title. Do not add a sidebar destination — §5 is explicit that *"the sidebar is always project-scoped"* and that account settings live behind the account control in the header rail.

The page carries a `generateMetadata` and a single `<h1>`, like all seven sibling routes — read `apps/app/app/(workspace)/projects/[slug]/settings/page.tsx` for both.

**The form** carries theme, language, time zone and email notifications, following `apps/app/app/(workspace)/projects/[slug]/settings/project-form.tsx` for the `useTransition` / `ActionResult` / per-field-error pattern — read it first.

- Theme is a `<select>` over `'light' | 'dark' | 'system'`. On save it calls **both** `setTheme()` from `next-themes` (so the current tab changes immediately) and the action (so it persists).
- Language is a `<select>` over the locales `packages/i18n` actually ships.
- Time zone is a `<select>` over the IANA zone list. **Build that list in `page.tsx` on the server and pass it as a prop** — do not call `Intl.supportedValuesOf('timeZone')` inside the client component. It returns 418 entries on this Node 22 (measured) and is not guaranteed to return the same set in the browser's ICU, so computing it on both sides risks a hydration mismatch across hundreds of `<option>` elements. Render it as a plain `<select>`, not a custom combobox: a native select is already type-to-search and needs no new component.

  These options are raw IANA identifiers — `Asia/Kuala_Lumpur`, `Europe/London`. They are **not** translated strings and must not be added to the locale files; only the field's *label* is translated. Say so in your report, because ~418 untranslated strings on screen otherwise reads like a locale-parity omission to the next person.
- Email notifications is a checkbox. `false` is a real value, not an absent one.

**The header rail** gains a link to `/settings` in the existing account dropdown, above the sign-out item, using the existing separator idiom. The theme controls already in that menu **stay** — they are a shortcut, and the settings page is the full surface — but they must be made to persist, which is its own step below rather than a line of advice.

- [ ] **Step 1: Write the form and page**
- [ ] **Step 2: Add the loading skeleton** — with `LoadingAnnouncement`, matching all seven siblings
- [ ] **Step 3: Add strings to all three locales**
- [ ] **Step 4: Link from the account menu**

- [ ] **Step 5: Make the menu's theme shortcut persist, and stop sign-out shadowing the next user**

Two edits in `apps/app/components/shell/header-rail.tsx`, both consequences of R3's localStorage rule:

1. Each theme item currently calls `setTheme(value)` only. It must also call `updateAccountSettingsAction` so the choice reaches the column and the cookie. Without this, a theme set from the menu never follows the person to another device — **and worse**, the settings page's `<select>` reads the column and will show a different value than the app is actually rendering. Send the user's other current settings unchanged alongside the new theme, so the action's schema validates; read them from a prop the shell already has, or add one rather than guessing defaults.
2. `signOut` must clear `localStorage.theme` along with the three preference cookies. Otherwise the next person to log in on that browser inherits the previous user's theme, and because localStorage beats `defaultTheme`, their own account preference never applies at all.

Replace the menu's hardcoded theme list with `THEMES` from `@/lib/settings/preference-cookies` while you are here — there should be one list, not three.

- [ ] **Step 6: Verify** — typecheck, `pnpm test`, `pnpm build`, and confirm `/settings` is in the route list

- [ ] **Step 7: Commit**

---

## Task 8: Browser pass

Not optional. `apps/app` runs vitest in `node` with no DOM, so **nothing in the suite can observe rendering, first paint, or a cookie round-trip** — and this slice's whole subject is what a browser does before React runs.

- [ ] **Step 1: Run against the local stack**

The dev server's `.env.local` points at **production**. Point it at the local stack:

```bash
cd apps/app
set -a; . ./.env.test; set +a
NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" corepack pnpm dev
```

- [ ] **Step 2: The things only a browser settles**

- **Save each preference and confirm it persists** — reload and check it survives, then check the row in the database. All four fields.
- **The time zone actually changes rendered dates.** Set a zone far from UTC, then look at the log or a run trace. A date that does not move means the value is stored and ignored, which is the failure this slice exists to prevent.
- **No flash of the wrong theme.** Set dark, hard-reload, and watch the first paint. Then clear localStorage only (leaving the cookie) and reload — that simulates a new device, and the cookie should decide.
- **The header menu and the settings page agree.** Change the theme in one, then open the other; they must not disagree.
- **Zero horizontal overflow** at 390px and 1440px, in `en` and `ms`, measured — not eyeballed.
- **No raw `app.*` keys** in the server HTML, in both locales. Fetch the route and regex the response body; do not scan a `document.write`'d iframe, which returns empty text and has already hidden this exact defect once.
- **Errors are visible** — `text-oxide`, `role="alert"` — and **success announces**, `role="status"`.

- [ ] **Step 3: Fix what you find, then re-verify.** Each fix gets its own commit with the measurement in the message.

---

## Done when

1. `/settings` lets a person set theme, language, time zone and email notifications, and each persists to `user_settings`.
2. A preference set on one browser is in effect on a fresh one after logging in.
3. Dates render in the chosen zone everywhere — all twelve call sites — and an unknown zone renders as UTC rather than throwing.
4. No flash of the wrong theme on reload.
5. The account menu links to `/settings`; the sidebar gains nothing, because it is project-scoped.
6. Two-user isolation is asserted for `user_settings`, with both users created in `beforeAll` and no assertion depending on a sibling test.
7. All three locales carry identical key sets.
8. Zero horizontal overflow at 390px and 1440px in `en` and `ms`, measured.
9. `corepack pnpm typecheck`, `test`, `test:rls`, and `build` all pass.

## Deliberately not in this slice

- **A migration.** D1 already shipped `locale` and `time_zone` to production. This slice only makes them readable.
- **Per-project preferences.** These are account-level; nothing here is project-scoped.
- **Changing how `NEXT_LOCALE` is resolved.** The cookie stays the request-time source; this slice adds a durable copy behind it.

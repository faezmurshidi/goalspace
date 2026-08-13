# Goalspace Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip goalspace to its reusable infrastructure, upgrade the stack, and stand up the phase-1 database schema, RLS isolation, and pure domain logic — all under test — so the workspace UI can be built on a verified foundation.

**Architecture:** Delete before upgrading, because most of the existing 23.5k lines are scheduled for deletion and making them compile under Next 16 is wasted work. Then upgrade the remaining shell, reset the database destructively (nothing is in production), and build the pure domain logic test-first. Relational data lives in Postgres with flat `owner_id` RLS; all derived values (progress, due items) are computed in TypeScript by pure functions rather than stored or triggered.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Auth + Storage), Tailwind, shadcn/ui, Zustand (site-info only), Vitest, zod.

**Source spec:** `docs/superpowers/specs/2026-07-30-goalspace-repository-core-design.md`

**Scope note:** This is plan 1 of 2 for phase 1. It ends with a green build, a migrated database, passing RLS isolation tests, and tested domain logic — but no workspace UI. Plan 2 (`phase1-workspace`) builds capture, the resume view, the work tree, and documents on top of it.

## Global Constraints

- Node ≥ 20.9.0 (required by `next@16`). Verified present: v20.19.5.
- Package manager is **pnpm** (10.2.1). Never use `npm install` in this repo.
- Target versions: `next@^16.2.12`, `react@^19.2.8`, `react-dom@^19.2.8`, `@supabase/supabase-js@^2.111.0`, `@supabase/ssr@^0.12.4`, `vitest@^4.1.10`.
- **No AI dependencies in phase 1.** `ai`, `@ai-sdk/*`, and `@anthropic-ai/sdk` are removed and must not be reintroduced.
- Every new table carries `project_id` and `owner_id`. RLS mutation policies are flat `owner_id = auth.uid()` — never nested `EXISTS` chains.
- Progress and due-date state are **computed, never stored**. No triggers that denormalise derived values.
- Path alias is `@/*` → repo root (already configured in `tsconfig.json`).
- Existing i18n machinery (`en`/`ms`/`zh`) is retained. Do not delete `lib/i18n.ts`, `lib/hooks/use-translations.ts`, or `locales/`.
- **Never reinstate `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds`.** Task 2 removes them; with them set, every "verify the build is green" step in this plan is meaningless. `pnpm typecheck` must pass before any commit from Task 2 onward.
- Never commit a file containing a credential. `.gitignore` blocks AI codebase-dump files as of Task 0; do not add exceptions.

## Monorepo split note (2026-08-13)

This plan was written when the app lived at the repository root. `refactor/monorepo-split` later moved it into `apps/web` (marketing/landing, no Supabase) and `apps/app` (the authenticated workspace, Supabase-backed), with shared `@goalspace/ui`, `@goalspace/i18n`, and `@goalspace/config` packages. Tasks 0 through 6 below predate the split and describe work already done against the old root-level paths (`app/`, `lib/`, `tests/`, `supabase/`) — those paths are historical and left as written rather than rewritten; read them as `apps/app/...` unless context says otherwise. Task 7 onward has been repointed to the post-split paths below, since that work had not started when the split happened.

**Known gap — sign-up no longer provisions the `public.users` profile row.** Task 3 of the monorepo split resolved a duplicate-file conflict by keeping the auth form that does not create the row, leaving `lib/auth.ts` (which did) orphaned in `apps/app`. That insert only ever ran when email verification was disabled, so it was already fragile. The accepted fix, per a human ruling made during that task, is a `on auth.users` database trigger added in a Phase 1 migration, replacing the client-side insert entirely. Every Phase 1 table below keys `owner_id` off `users(id)`, so this trigger must land before the workspace UI (plan 2) depends on it.

---

### Task 0: Remove the committed credential and block future dumps

> **PREREQUISITE — NOT A STEP IN THIS TASK.** `test.txt` on `main` of this **public** repository contains a full Supabase session for `faezmurshidiadnan@gmail.com` on project `wmiciabkatqfjbppvwiz`, including a **refresh token**, which does not expire on a clock. **The repository owner must revoke it** in the Supabase dashboard (Authentication → Users → sign out all sessions) before or alongside this task.
>
> **Deleting the files does not remediate the exposure.** The blobs remain reachable in git history and via GitHub's PR blob storage even after branches are deleted. Revocation is the only fix; this task just stops the bleeding and prevents a recurrence.

**Files:**
- Delete: `test.txt`, `tesst.txt`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working tree with no committed credentials and a `.gitignore` that blocks AI codebase dumps

- [ ] **Step 1: Confirm the credential is present before deleting**

```bash
grep -l "auth-token=base64-" test.txt tesst.txt 2>/dev/null
```

Expected: `test.txt` is listed. Do not print the file contents — the token is a live credential.

- [ ] **Step 2: Delete the stray files**

```bash
git rm --quiet test.txt tesst.txt
```

- [ ] **Step 3: Block AI codebase dumps from ever being committed**

Append to `.gitignore`:

```gitignore
# AI codebase dumps — these inline every file, including any pasted secrets.
# A dump of this repo leaked a Supabase session in PR #5.
.repomix-output.txt
repomix-output.*
*.repomix.txt
.aidigest
codebase-dump.*
```

- [ ] **Step 4: Scan the rest of the tree for other credentials**

```bash
grep -rInE "eyJ[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{20,}|sk-ant-|xi-api-key['\"]?\s*[:=]\s*['\"][A-Za-z0-9]{20,}|postgres(ql)?://[^:]+:[^@]+@" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next . \
  | cut -c1-160
```

Expected: no output. Any hit is another leaked credential — stop, report it, and get it revoked before continuing. A match inside `locales/` or a lockfile is a false positive; verify before acting.

- [ ] **Step 5: Verify the build still works**

```bash
pnpm install
pnpm build 2>&1 | tail -20
```

The build may fail for pre-existing reasons unrelated to this task — nothing imports `test.txt`. Record the output; Task 1 addresses build failures.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "security: remove committed Supabase session and block codebase dumps

test.txt contained a full auth cookie including a refresh token, exposed on
a public repo since Feb 2025. The session must be revoked separately - the
blobs remain in git history and in PR #5's repomix dump.

Adds .gitignore rules for AI codebase dump files, which inline every file in
the repo and were the vector that widened this leak."
```

---

### Task 1: Purge the obsolete application surface

Removes everything the new model replaces, so the upgrade in Task 2 operates on a small surface. The remaining app is the marketing/blog/login shell plus reusable infrastructure.

**Files:**
- Delete: `app/api/` (all 18 routes), `app/(dashboard)/`, `app/(authenticated)/`, `app/design/`, `app/pricing/`
- Delete: `components/TipTap.tsx`, `components/app-sidebar.tsx`, `components/background.tsx`, `components/chat-window.tsx`, `components/chat-with-mentor.tsx`, `components/custom-podcast.tsx`, `components/digital-clock.tsx`, `components/generated-spaces.tsx`, `components/goal-form.tsx`, `components/goal-switcher.tsx`, `components/knowledge-base.tsx`, `components/markdown-content.tsx`, `components/model-selection-dialog.tsx`, `components/new-goal-dialog.tsx`, `components/podcast.tsx`, `components/space-content-editor.tsx`, `components/space-module.tsx`, `components/space-navbar.tsx`, `components/space-todo-list.tsx`, `components/space-tools-window.tsx`, `components/space-tools.tsx`, `components/spaces-grid.tsx`, `components/spaces-sidebar.tsx`, `components/todo-list.tsx`
- Delete: `lib/store.ts`, `lib/stores/space-store.ts`, `lib/agent-config.ts`, `lib/vector.ts`, `lib/types/goalspace.ts`, `lib/types/space.ts`, `lib/types/module.ts`, `lib/utils/ai-generate.ts`, `lib/utils/prompt-generator.ts`, `lib/utils/paywall.ts`, `lib/utils/mock-data.ts`, `lib/utils/schemas.ts`
- Delete: `types/agent.ts` (pairs with the deleted `lib/agent-config.ts`)
- Modify: `middleware.ts`, `package.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a repo whose `pnpm build` succeeds containing only `app/[locale]/` (landing, blog, login), `app/auth/`, `app/dev/site-info/`, `app/providers/`, `app/_lib/`, `components/ui/` (65 shadcn primitives), and the retained `lib/` infrastructure

- [ ] **Step 1: Install dependencies and record the baseline**

```bash
pnpm install
pnpm build 2>&1 | tail -40
```

The build may fail. **Do not fix it.** Failures are expected to live in code this task deletes; fixing them wastes effort. Record the output for comparison and continue.

- [ ] **Step 2: Delete obsolete routes**

```bash
git rm -r --quiet "app/api" "app/(dashboard)" "app/(authenticated)" "app/design" "app/pricing"
```

`app/dev/site-info/` is retained — it is the documented site-info debug tool.

- [ ] **Step 3: Delete obsolete components**

```bash
git rm --quiet \
  components/TipTap.tsx components/app-sidebar.tsx components/background.tsx \
  components/chat-window.tsx components/chat-with-mentor.tsx components/custom-podcast.tsx \
  components/digital-clock.tsx components/generated-spaces.tsx components/goal-form.tsx \
  components/goal-switcher.tsx components/knowledge-base.tsx components/markdown-content.tsx \
  components/model-selection-dialog.tsx components/new-goal-dialog.tsx components/podcast.tsx \
  components/space-content-editor.tsx components/space-module.tsx components/space-navbar.tsx \
  components/space-todo-list.tsx components/space-tools-window.tsx components/space-tools.tsx \
  components/spaces-grid.tsx components/spaces-sidebar.tsx components/todo-list.tsx
```

- [ ] **Step 4: Delete obsolete lib files**

```bash
git rm --quiet \
  lib/store.ts lib/stores/space-store.ts lib/agent-config.ts lib/vector.ts \
  lib/types/goalspace.ts lib/types/space.ts lib/types/module.ts \
  lib/utils/ai-generate.ts lib/utils/prompt-generator.ts lib/utils/paywall.ts \
  lib/utils/mock-data.ts lib/utils/schemas.ts \
  types/agent.ts
```

`types/supabase.ts` is retained — it is imported by the Supabase client helpers and is regenerated in Task 7.

`lib/stores/siteInfoStore.ts` is retained and uses Zustand, so `zustand` stays in `package.json`.

- [ ] **Step 5: Find and remove references to deleted modules**

```bash
grep -rn "lib/store\|space-store\|ai-generate\|prompt-generator\|mock-data\|@/components/space-\|@/components/podcast\|@/components/TipTap\|@/components/background\|markdown-content" \
  app components lib hooks providers utils 2>/dev/null
```

Delete or comment out each importing line. Most hits will be in `components/sections/` and `components/site-header.tsx`; remove the imports and the JSX that used them. If a whole component exists only to render deleted content, delete that component too.

- [ ] **Step 6: Update middleware route matchers**

Open `middleware.ts` and remove any matcher entry or path check referencing `/dashboard`, `/space`, `/knowledge-base`, `/chat`, or `/pricing`. Leave locale detection, auth redirection, and the `/login`, `/auth`, and `/blog` public-path logic intact. Do not add matchers for `/projects` yet — plan 2 adds those alongside the routes.

- [ ] **Step 7: Remove obsolete dependencies**

```bash
pnpm remove ai @ai-sdk/anthropic @ai-sdk/deepseek @ai-sdk/openai @anthropic-ai/sdk \
  @react-three/fiber node-fetch \
  @tiptap/react @tiptap/pm @tiptap/extension-code-block-lowlight \
  @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/extension-task-item \
  @tiptap/extension-task-list @tiptap/extension-typography
```

Then check for stragglers and remove any that are present:

```bash
grep -nE '"(three|@tiptap/[a-z-]+|lowlight|@ai-sdk/[a-z]+)"' package.json
```

- [ ] **Step 8: Verify the build is green**

```bash
pnpm install
pnpm build
```

Expected: build succeeds. If it fails, the error names a file still importing something deleted — fix that import and re-run. Do not reintroduce a removed dependency to satisfy an import; delete the code that needs it.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove goals/spaces/modules surface and AI dependencies

Deletes all 18 API routes, the dashboard route group, the goal/space/module
components, the Zustand goal store, and every AI dependency. Retains auth,
i18n, shadcn primitives, site-info, blog, and the marketing shell."
```

---

### Task 2: Upgrade to Next 16 and React 19

The shell is now small enough that the upgrade touches few files. The known breaking change in this repo is that `cookies()` became async in Next 15.

**Files:**
- Modify: `package.json`, `tsconfig.json`, `next.config.js`, `utils/supabase/server.ts`, `app/auth/callback/route.ts`
- Modify: any `page.tsx` or `layout.tsx` under `app/[locale]/` that reads `params`

**Interfaces:**
- Consumes: the purged tree from Task 1
- Produces: `createClient()` in `utils/supabase/server.ts` with signature `() => Promise<SupabaseClient<Database>>` — it now calls `cookies()` internally rather than accepting a cookie store

- [ ] **Step 1: Upgrade the framework packages**

```bash
pnpm add next@^16.2.12 react@^19.2.8 react-dom@^19.2.8
pnpm add -D @types/react@^19 @types/react-dom@^19
pnpm add @supabase/supabase-js@^2.111.0 @supabase/ssr@^0.12.4
```

- [ ] **Step 2: Raise the TypeScript target**

In `tsconfig.json`, change `"target": "es5"` to `"target": "es2022"`. `es5` predates the async/await and class-field syntax used throughout, and forces unnecessary downlevel emit.

- [ ] **Step 3: Rewrite `next.config.js`**

The current config has three problems beyond the version bump: `experimental` flags that were removed or renamed in Next 15/16, a CORS block for `/api/*` routes that Task 1 deleted, and — most importantly — `ignoreBuildErrors` and `ignoreDuringBuilds`, which mean a green build proves nothing about type or lint correctness. Replace the whole file:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  staticPageGenerationTimeout: 180,
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

What changed and why:

- **`typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` are gone.** They let builds pass with type errors, which makes every "verify the build is green" step in this plan meaningless. Removing them is what gives those steps teeth.
- **The `/api/*` CORS block is gone** — those routes no longer exist. It also paired `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`, which browsers reject outright, and which becomes a real vulnerability the moment someone "fixes" the `*` by reflecting the request origin.
- **Security headers are salvaged from PR #5's `vercel.json`**, minus `X-XSS-Protection` — that header is deprecated and its filter introduced vulnerabilities, so modern guidance is to omit it rather than set it.
- **`experimental` is gone.** `serverComponentsExternalPackages` was renamed to the top-level `serverExternalPackages`, and `swcMinify`, `workerThreads`, and `fallbackNodePolyfills` no longer exist. Nothing in the remaining tree needs any of them.
- **The `webpack` block is gone.** Its `ws` / `bufferutil` / `utf-8-validate` fallbacks existed for the AI SDK packages Task 1 removed, and Next 16 uses Turbopack by default, where a `webpack` key does not apply.

- [ ] **Step 4: Add a real type-check gate**

Add to `package.json` scripts:

```json
"typecheck": "tsc --noEmit"
```

Then run it:

```bash
pnpm typecheck
```

Expected: errors, at this point. With `ignoreBuildErrors` removed these are now visible; fix each one. Errors pointing at deleted modules mean Task 1 missed an import — delete that code rather than reinstating the dependency.

- [ ] **Step 5: Make the server Supabase client async**

Replace the contents of `utils/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

export const createClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
};
```

- [ ] **Step 6: Update every caller of `createClient`**

```bash
grep -rn "createClient(cookieStore)\|createClient(await cookies())\|createClient(cookies())" app components lib utils
```

Each call site becomes `const supabase = await createClient();` and its `cookies()` import is removed if now unused.

- [ ] **Step 7: Await dynamic route params**

```bash
grep -rn "params" app --include=page.tsx --include=layout.tsx --include=route.ts
```

In Next 15+, `params` and `searchParams` are Promises. Every occurrence becomes:

```ts
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // ...
}
```

- [ ] **Step 8: Build and verify**

```bash
pnpm build
```

Expected: build succeeds on Next 16. If a Radix package errors under React 19, upgrade that specific package with `pnpm add @radix-ui/<name>@latest` and rebuild.

- [ ] **Step 9: Smoke-test the running app**

```bash
pnpm dev
```

Visit `http://localhost:3000` — the landing page renders and redirects to a locale. Visit `/en/login` — the login form renders. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Next 16 and React 19

Bumps next, react, react-dom, and the Supabase packages. Makes the server
Supabase client async for the Next 15+ cookies() API, awaits dynamic route
params, and raises the TS target from es5 to es2022."
```

---

### Task 3: Stand up the Vitest harness

No tests exist today. This task establishes the harness with a single trivial test so later tasks have somewhere to put real ones.

**Files:**
- Create: `vitest.config.ts`, `tests/unit/sanity.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the upgraded toolchain from Task 2
- Produces: `pnpm test` runs unit tests in `tests/unit/`; `pnpm test:rls` runs isolation tests in `tests/rls/`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest@^4.1.10 @vitest/coverage-v8@^4.1.10 dotenv@^16
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add test scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run tests/unit",
"test:watch": "vitest tests/unit",
"test:rls": "vitest run tests/rls"
```

- [ ] **Step 4: Write a sanity test**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("harness", () => {
  it("runs and resolves the @ alias", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("a", "b")).toBe("a b");
  });
});
```

- [ ] **Step 5: Run the test**

```bash
pnpm test
```

Expected: PASS, 1 test. If the alias fails to resolve, the `resolve.alias` path in `vitest.config.ts` is wrong.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/unit/sanity.test.ts package.json pnpm-lock.yaml
git commit -m "test: add Vitest harness with unit and rls test scripts"
```

---

### Task 4: Establish the database schema

**Why this replaces a "reset".** The plan originally dropped legacy tables then created new ones. That is impossible: `supabase db reset` applies only `supabase/migrations/` and `supabase/seed.sql`, and **no migration ever creates `users`, `user_settings`, `goals`, or `spaces`** — those live only in `supabase/schema/*.sql`, which `db reset` never reads. The existing `20240321..._create_documents_table.sql` already fails on a fresh database because it references `spaces(id)`. Nothing is in production, so the honest fix is to replace the entire migration history with one baseline that creates exactly what phase 1 needs.

**Files:**
- Delete: all 13 files in `supabase/migrations/`
- Delete: `supabase/schema/01_users.sql`, `supabase/schema/02_goalspace.sql`, `supabase/schema/02_modules.sql`
- Create: `supabase/migrations/20260730000100_phase1_baseline.sql`
- Modify: `supabase/seed.sql`, `.gitignore`
- Create: `tests/rls/schema.test.ts`, `.env.test`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: tables `users`, `user_settings`, `projects`, `entries`, `work_items`, `documents`, `document_revisions`, `attachments` in the local database

- [ ] **Step 1: Start local Supabase**

```bash
supabase start
```

Use the Homebrew CLI (v2.22.6) already on `PATH`. Docker is running. Expect the API URL `http://127.0.0.1:54321` plus anon and service_role keys.

- [ ] **Step 2: Write the local test environment file**

```bash
supabase status -o env > .env.test
```

Then append `.env.test` as a new line in `.gitignore`. Confirm `.env.test` contains `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`. These are local-only development keys. Note `.gitignore` already ignores `.env*.local`, which does **not** match `.env.test` — that is why this entry is needed.

- [ ] **Step 3: Remove the broken migration history and superseded schema files**

```bash
git rm --quiet supabase/migrations/*.sql
git rm --quiet supabase/schema/01_users.sql supabase/schema/02_goalspace.sql supabase/schema/02_modules.sql
```

- [ ] **Step 4: Empty the seed file**

`supabase/config.toml` runs `./seed.sql` on every reset, and its only contents insert `blog_posts` rows. The blog renders from `app/[locale]/blog/mock-data.ts` and no code references the `blog_posts` table, so the table is not in the baseline and the seed must not reference it. Replace the entire contents of `supabase/seed.sql` with:

```sql
-- Intentionally empty. Phase 1 seeds no data; tests create their own fixtures.
```

- [ ] **Step 5: Write the baseline migration**

Create `supabase/migrations/20260730000100_phase1_baseline.sql`:

```sql
-- Phase 1 baseline. Nothing is in production, so this replaces the entire
-- migration history rather than migrating from it.

create extension if not exists "uuid-ossp";

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Retained auth tables. users.id IS auth.users.id, so the flat
-- owner_id = auth.uid() policies added in Task 5 are correct by construction.
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_settings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  theme               text not null default 'system',
  email_notifications boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id)
);

create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  slug        text not null,
  title       text not null,
  brief       text,
  kind        text not null check (kind in ('build','learn','research')),
  visibility  text not null default 'private' check (visibility in ('private','public')),
  status      text not null default 'active' check (status in ('active','paused','done','abandoned')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create table entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid,
  kind        text not null check (kind in ('note','decision','source','session')),
  title       text,
  body        text not null default '',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table work_items (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  owner_id           uuid not null references users(id) on delete cascade,
  agent_id           uuid,
  parent_id          uuid references work_items(id) on delete cascade,
  order_index        integer not null default 0,
  kind               text not null default 'task' check (kind in ('task','question')),
  status             text not null default 'open' check (status in ('open','doing','blocked','done','dropped')),
  title              text not null,
  body               text not null default '',
  wake_at            timestamptz,
  closed_by_entry_id uuid references entries(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  status_changed_at  timestamptz not null default now(),
  closed_at          timestamptz
);

-- entries.work_item_id is added after work_items exists (mutual reference).
alter table entries
  add column work_item_id uuid references work_items(id) on delete set null;

create table documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id   uuid not null references users(id) on delete cascade,
  agent_id   uuid,
  title      text not null,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_revisions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  entry_id     uuid references entries(id) on delete cascade,
  document_id  uuid references documents(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  byte_size    bigint not null,
  created_at   timestamptz not null default now(),
  check (num_nonnulls(entry_id, document_id) = 1)
);

create index entries_project_occurred_idx on entries (project_id, occurred_at desc);
create index entries_work_item_idx on entries (work_item_id);
create index work_items_tree_idx on work_items (project_id, parent_id, order_index);
create index work_items_status_idx on work_items (project_id, status);
create index documents_project_idx on documents (project_id);
create index document_revisions_doc_idx on document_revisions (document_id, created_at desc);
create index attachments_entry_idx on attachments (entry_id);
create index attachments_document_idx on attachments (document_id);
create index projects_owner_updated_idx on projects (owner_id, updated_at desc);

create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();
create trigger update_user_settings_updated_at before update on user_settings
  for each row execute function update_updated_at_column();
create trigger update_projects_updated_at before update on projects
  for each row execute function update_updated_at_column();
create trigger update_entries_updated_at before update on entries
  for each row execute function update_updated_at_column();
create trigger update_work_items_updated_at before update on work_items
  for each row execute function update_updated_at_column();
create trigger update_documents_updated_at before update on documents
  for each row execute function update_updated_at_column();

-- RLS for the two retained auth tables. The six phase-1 tables get theirs in
-- Task 5. The old schema enabled RLS on users with no INSERT policy at all,
-- so the auth callback's insert could never have succeeded; these fix that.
alter table users enable row level security;
alter table user_settings enable row level security;

create policy users_select on users for select using (id = auth.uid());
create policy users_insert on users for insert with check (id = auth.uid());
create policy users_update on users for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_settings_select on user_settings for select using (user_id = auth.uid());
create policy user_settings_insert on user_settings for insert with check (user_id = auth.uid());
create policy user_settings_update on user_settings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

There is deliberately **no `handle_new_user()` trigger**. The old one inserted a `user_settings` row on every `public.users` insert while `app/auth/callback/route.ts` also inserts that row explicitly, colliding with `unique (user_id)`. The callback is now the single writer. `user_api_usage` and `user_subscription_history` are also gone — nothing references them after the earlier purge.

- [ ] **Step 6: Apply the migration**

```bash
supabase db reset
```

Expected: the single baseline applies, the empty seed runs, no errors.

- [ ] **Step 7: Write the schema smoke test**

Create `tests/rls/schema.test.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";

config({ path: ".env.test" });

const admin = createClient(process.env.API_URL!, process.env.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

describe("phase 1 schema", () => {
  it("creates every table phase 1 needs", async () => {
    for (const table of [
      "users",
      "user_settings",
      "projects",
      "entries",
      "work_items",
      "documents",
      "document_revisions",
      "attachments",
    ]) {
      const { error } = await admin.from(table).select("id").limit(1);
      expect(error, `${table} should exist`).toBeNull();
    }
  });

  it("carries no legacy tables", async () => {
    for (const table of [
      "goals",
      "spaces",
      "modules",
      "tasks",
      "chat_messages",
      "blog_posts",
      "document_embeddings",
    ]) {
      const { error } = await admin.from(table).select("id").limit(1);
      expect(error, `${table} should not exist`).not.toBeNull();
    }
  });
});
```

- [ ] **Step 8: Run the schema test**

```bash
pnpm test:rls
```

Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

Stage everything and commit with this message:

```
feat(db): replace migration history with a phase 1 baseline

supabase db reset could never have worked: no migration created users,
user_settings, goals, or spaces - those existed only in supabase/schema/,
which db reset does not apply, so the documents migration already failed on
a fresh database. Nothing is in production, so the 13 legacy migrations are
replaced by one baseline creating the retained auth tables and the six
phase 1 tables.

Drops blog_posts (the blog renders from mock-data.ts and no code reads the
table) and empties seed.sql accordingly. Removes handle_new_user, whose
user_settings insert collided with the auth callback's own. Adds the users
INSERT policy the old schema was missing entirely.
```

---

### Task 5: RLS policies and two-user isolation tests

The security property of the product. Tests come first here because the failure mode is silent — the current schema ships dead policies that reference a nonexistent column, and nothing caught it.

**Files:**
- Create: `tests/helpers/supabase.ts`
- Create: `tests/rls/isolation.test.ts`
- Create: `supabase/migrations/20260730000300_phase1_rls.sql`

**Interfaces:**
- Consumes: the tables from Task 4
- Produces: `type TestUser = { id: string; email: string; client: SupabaseClient }`; `createTestUser(email: string): Promise<TestUser>`; `deleteTestUser(id: string): Promise<void>`; `adminClient(): SupabaseClient`

- [ ] **Step 1: Write the test helper**

Create `tests/helpers/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.test" });

const url = process.env.API_URL!;
const anonKey = process.env.ANON_KEY!;
const serviceKey = process.env.SERVICE_ROLE_KEY!;

export type TestUser = { id: string; email: string; client: SupabaseClient };

export function adminClient(): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function createTestUser(email: string): Promise<TestUser> {
  const admin = adminClient();
  const password = "test-password-123!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;

  // public.users is a separate profile table; its id must match auth.uid().
  const { error: profileError } = await admin
    .from("users")
    .insert({ id, email });
  if (profileError) throw profileError;

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id, email, client };
}

export async function deleteTestUser(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}
```

- [ ] **Step 2: Write the failing isolation test**

Create `tests/rls/isolation.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../helpers/supabase";

let alice: TestUser;
let bob: TestUser;
let aliceProjectId: string;
let aliceEntryId: string;
let aliceWorkItemId: string;
let aliceDocumentId: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`alice-${stamp}@example.test`);
  bob = await createTestUser(`bob-${stamp}@example.test`);

  const { data: project, error } = await alice.client
    .from("projects")
    .insert({
      owner_id: alice.id,
      slug: "ev-bike",
      title: "Custom EV bike",
      kind: "build",
    })
    .select()
    .single();
  if (error) throw error;
  aliceProjectId = project.id;

  const { data: entry } = await alice.client
    .from("entries")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      kind: "decision",
      title: "18650 over 21700",
      body: "Sourcing lead time 6 weeks vs 14.",
    })
    .select()
    .single();
  aliceEntryId = entry!.id;

  const { data: item } = await alice.client
    .from("work_items")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: "Design BMS",
    })
    .select()
    .single();
  aliceWorkItemId = item!.id;

  const { data: doc } = await alice.client
    .from("documents")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: "Frame geometry spec",
      body: "v1",
    })
    .select()
    .single();
  aliceDocumentId = doc!.id;
});

afterAll(async () => {
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
});

describe("owner can reach their own rows", () => {
  it("reads their project", async () => {
    const { data } = await alice.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toHaveLength(1);
  });
});

describe("a second user is fully isolated", () => {
  it("cannot read the project", async () => {
    const { data } = await bob.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toEqual([]);
  });

  it("cannot read entries", async () => {
    const { data } = await bob.client
      .from("entries")
      .select("id")
      .eq("id", aliceEntryId);
    expect(data).toEqual([]);
  });

  it("cannot read work items", async () => {
    const { data } = await bob.client
      .from("work_items")
      .select("id")
      .eq("id", aliceWorkItemId);
    expect(data).toEqual([]);
  });

  it("cannot read documents", async () => {
    const { data } = await bob.client
      .from("documents")
      .select("id")
      .eq("id", aliceDocumentId);
    expect(data).toEqual([]);
  });

  it("cannot update the project", async () => {
    await bob.client
      .from("projects")
      .update({ title: "hijacked" })
      .eq("id", aliceProjectId);

    const { data } = await alice.client
      .from("projects")
      .select("title")
      .eq("id", aliceProjectId)
      .single();
    expect(data!.title).toBe("Custom EV bike");
  });

  it("cannot delete the project", async () => {
    await bob.client.from("projects").delete().eq("id", aliceProjectId);

    const { data } = await alice.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toHaveLength(1);
  });

  it("cannot insert a row into another user's project", async () => {
    const { error } = await bob.client.from("entries").insert({
      project_id: aliceProjectId,
      owner_id: bob.id,
      kind: "note",
      body: "intrusion",
    });
    expect(error).not.toBeNull();
  });

  it("cannot forge ownership by setting owner_id to the victim", async () => {
    const { error } = await bob.client.from("entries").insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      kind: "note",
      body: "forged",
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm test:rls
```

Expected: FAIL. RLS is not yet enabled, so Bob reads and writes Alice's rows freely. Several isolation tests fail. This proves the tests have teeth.

- [ ] **Step 4: Write the RLS migration**

Create `supabase/migrations/20260730000300_phase1_rls.sql`:

```sql
alter table projects           enable row level security;
alter table entries            enable row level security;
alter table work_items         enable row level security;
alter table documents          enable row level security;
alter table document_revisions enable row level security;
alter table attachments        enable row level security;

-- projects: owner reads and writes; public projects are world-readable.
create policy projects_select on projects for select
  using (owner_id = auth.uid() or visibility = 'public');
create policy projects_insert on projects for insert
  with check (owner_id = auth.uid());
create policy projects_update on projects for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy projects_delete on projects for delete
  using (owner_id = auth.uid());

-- Child tables: flat ownership for writes, one shallow EXISTS for public reads.
-- The insert check also requires the parent project to belong to the caller,
-- so ownership cannot be forged by pointing at someone else's project.
--
-- These 20 policies are written out rather than generated in a loop. Security
-- rules must be greppable: you cannot search for a policy that exists only as
-- a format string, and an auditor reading this file should see exactly what is
-- enforced without mentally expanding a DO block.

create policy entries_select on entries for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = entries.project_id and p.visibility = 'public'));
create policy entries_insert on entries for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy entries_update on entries for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy entries_delete on entries for delete
  using (owner_id = auth.uid());

create policy work_items_select on work_items for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = work_items.project_id and p.visibility = 'public'));
create policy work_items_insert on work_items for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy work_items_update on work_items for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy work_items_delete on work_items for delete
  using (owner_id = auth.uid());

create policy documents_select on documents for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = documents.project_id and p.visibility = 'public'));
create policy documents_insert on documents for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy documents_update on documents for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy documents_delete on documents for delete
  using (owner_id = auth.uid());

create policy document_revisions_select on document_revisions for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = document_revisions.project_id and p.visibility = 'public'));
create policy document_revisions_insert on document_revisions for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy document_revisions_update on document_revisions for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy document_revisions_delete on document_revisions for delete
  using (owner_id = auth.uid());

create policy attachments_select on attachments for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = attachments.project_id and p.visibility = 'public'));
create policy attachments_insert on attachments for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy attachments_update on attachments for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy attachments_delete on attachments for delete
  using (owner_id = auth.uid());
```

- [ ] **Step 5: Apply and re-run the tests**

```bash
supabase db reset
pnpm test:rls
```

Expected: PASS, all isolation tests plus the two schema tests from Task 4.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): enable RLS with two-user isolation tests

Flat owner_id policies on all six tables, with insert checks that also verify
the parent project belongs to the caller so ownership cannot be forged.
Public reads are gated by a single shallow EXISTS against projects.visibility."
```

---

### Task 6: Attachment storage bucket and policies

**Files:**
- Create: `supabase/migrations/20260730000400_phase1_storage.sql`
- Create: `tests/rls/storage.test.ts`

**Interfaces:**
- Consumes: `createTestUser` from Task 5
- Produces: a private `attachments` bucket keyed by `{owner_id}/{project_id}/{filename}`

- [ ] **Step 1: Write the failing storage isolation test**

Create `tests/rls/storage.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, type TestUser } from "../helpers/supabase";

let alice: TestUser;
let bob: TestUser;
let path: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`sa-${stamp}@example.test`);
  bob = await createTestUser(`sb-${stamp}@example.test`);
  path = `${alice.id}/project/weld.txt`;

  const { error } = await alice.client.storage
    .from("attachments")
    .upload(path, new Blob(["weld photo stand-in"]), { contentType: "text/plain" });
  if (error) throw error;
});

afterAll(async () => {
  await alice.client.storage.from("attachments").remove([path]);
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
});

it("the owner can download their own attachment", async () => {
  const { data, error } = await alice.client.storage.from("attachments").download(path);
  expect(error).toBeNull();
  expect(data).not.toBeNull();
});

it("another user cannot download it", async () => {
  const { data } = await bob.client.storage.from("attachments").download(path);
  expect(data).toBeNull();
});

it("another user cannot upload into someone else's prefix", async () => {
  const { error } = await bob.client.storage
    .from("attachments")
    .upload(`${alice.id}/project/intrusion.txt`, new Blob(["x"]));
  expect(error).not.toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test:rls tests/rls/storage.test.ts
```

Expected: FAIL — the `attachments` bucket does not exist, so the upload in `beforeAll` throws.

- [ ] **Step 3: Write the storage migration**

Create `supabase/migrations/20260730000400_phase1_storage.sql`:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 26214400,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain']
)
on conflict (id) do nothing;

-- The leading path segment is the owner's uuid, mirroring table RLS.
create policy attachments_read on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy attachments_insert on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy attachments_update on storage.objects for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy attachments_delete on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
```

The 26214400 byte limit is 25 MB, matching the spec.

- [ ] **Step 4: Apply and re-run**

```bash
supabase db reset
pnpm test:rls
```

Expected: PASS, all tests including the three storage tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): add private attachments bucket with owner-prefixed policies"
```

---

### Task 7: Generated database types and zod schemas

Shared validation used by both forms and server actions, so there is exactly one validation path.

**Files:**
- Create: `apps/app/types/supabase.ts` (regenerated)
- Create: `apps/app/lib/schemas/project.ts`, `apps/app/lib/schemas/entry.ts`, `apps/app/lib/schemas/work-item.ts`, `apps/app/lib/schemas/document.ts`
- Create: `apps/app/tests/unit/schemas.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the tables from Tasks 4–6
- Produces:
  - `projectCreateSchema`, `ProjectCreateInput` — `{ slug, title, brief?, kind }`
  - `entryCreateSchema`, `EntryCreateInput` — `{ projectId, kind, title?, body, workItemId?, occurredAt? }`
  - `workItemCreateSchema`, `WorkItemCreateInput` — `{ projectId, parentId?, kind, title, body?, orderIndex? }`
  - `workItemUpdateSchema`, `WorkItemUpdateInput` — `{ status?, title?, body?, wakeAt?, parentId?, orderIndex? }`
  - `documentUpsertSchema`, `DocumentUpsertInput` — `{ projectId, title, body }`

- [ ] **Step 1: Add the type generation script**

In `package.json` scripts:

```json
"db:types": "supabase gen types typescript --local > apps/app/types/supabase.ts"
```

- [ ] **Step 2: Generate types**

```bash
pnpm db:types
head -30 apps/app/types/supabase.ts
```

Expected: the file names `projects`, `entries`, `work_items`, `documents`, `document_revisions`, and `attachments`.

- [ ] **Step 3: Write the failing schema test**

Create `apps/app/tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { projectCreateSchema } from "@/lib/schemas/project";
import { entryCreateSchema } from "@/lib/schemas/entry";
import { workItemCreateSchema, workItemUpdateSchema } from "@/lib/schemas/work-item";

describe("projectCreateSchema", () => {
  it("accepts a valid project", () => {
    const parsed = projectCreateSchema.parse({
      slug: "ev-bike",
      title: "Custom EV bike",
      kind: "build",
    });
    expect(parsed.slug).toBe("ev-bike");
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      projectCreateSchema.parse({ slug: "x", title: "X", kind: "cooking" })
    ).toThrow();
  });

  it("rejects a slug with spaces or capitals", () => {
    expect(() =>
      projectCreateSchema.parse({ slug: "EV Bike", title: "X", kind: "build" })
    ).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() =>
      projectCreateSchema.parse({ slug: "x", title: "", kind: "build" })
    ).toThrow();
  });
});

describe("entryCreateSchema", () => {
  it("accepts a decision with a body", () => {
    const parsed = entryCreateSchema.parse({
      projectId: "00000000-0000-0000-0000-000000000001",
      kind: "decision",
      body: "18650 over 21700.",
    });
    expect(parsed.kind).toBe("decision");
  });

  it("rejects a non-uuid projectId", () => {
    expect(() =>
      entryCreateSchema.parse({ projectId: "nope", kind: "note", body: "x" })
    ).toThrow();
  });

  it("rejects an entry with neither title nor body", () => {
    expect(() =>
      entryCreateSchema.parse({
        projectId: "00000000-0000-0000-0000-000000000001",
        kind: "note",
        body: "",
      })
    ).toThrow();
  });
});

describe("workItemUpdateSchema", () => {
  it("accepts a status change", () => {
    expect(workItemUpdateSchema.parse({ status: "blocked" }).status).toBe("blocked");
  });

  it("rejects an unknown status", () => {
    expect(() => workItemUpdateSchema.parse({ status: "waiting" })).toThrow();
  });
});

describe("workItemCreateSchema", () => {
  it("defaults kind to task and orderIndex to 0", () => {
    const parsed = workItemCreateSchema.parse({
      projectId: "00000000-0000-0000-0000-000000000001",
      title: "Design BMS",
    });
    expect(parsed.kind).toBe("task");
    expect(parsed.orderIndex).toBe(0);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `@/lib/schemas/project` cannot be resolved.

- [ ] **Step 5: Write the schemas**

Create `apps/app/lib/schemas/project.ts`:

```ts
import { z } from "zod";

export const PROJECT_KINDS = ["build", "learn", "research"] as const;
export const PROJECT_STATUSES = ["active", "paused", "done", "abandoned"] as const;

export const projectCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(200),
  brief: z.string().max(2000).optional(),
  kind: z.enum(PROJECT_KINDS),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
```

Create `apps/app/lib/schemas/entry.ts`:

```ts
import { z } from "zod";

export const ENTRY_KINDS = ["note", "decision", "source", "session"] as const;

export const entryCreateSchema = z
  .object({
    projectId: z.string().uuid(),
    workItemId: z.string().uuid().optional(),
    kind: z.enum(ENTRY_KINDS),
    title: z.string().max(200).optional(),
    body: z.string().max(50000).default(""),
    occurredAt: z.coerce.date().optional(),
  })
  .refine((v) => (v.title?.trim().length ?? 0) > 0 || v.body.trim().length > 0, {
    message: "an entry needs a title or a body",
  });

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
```

Create `apps/app/lib/schemas/work-item.ts`:

```ts
import { z } from "zod";

export const WORK_ITEM_KINDS = ["task", "question"] as const;
export const WORK_ITEM_STATUSES = ["open", "doing", "blocked", "done", "dropped"] as const;

export const workItemCreateSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  kind: z.enum(WORK_ITEM_KINDS).default("task"),
  title: z.string().min(1).max(200),
  body: z.string().max(50000).default(""),
  orderIndex: z.number().int().min(0).default(0),
});

export const workItemUpdateSchema = z.object({
  status: z.enum(WORK_ITEM_STATUSES).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(50000).optional(),
  wakeAt: z.coerce.date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export type WorkItemCreateInput = z.infer<typeof workItemCreateSchema>;
export type WorkItemUpdateInput = z.infer<typeof workItemUpdateSchema>;
```

Create `apps/app/lib/schemas/document.ts`:

```ts
import { z } from "zod";

export const documentUpsertSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(500000).default(""),
});

export type DocumentUpsertInput = z.infer<typeof documentUpsertSchema>;
```

- [ ] **Step 6: Run to verify it passes**

```bash
pnpm test
```

Expected: PASS. `zod@^3.24.1` is already a dependency — do not upgrade it to v4 in this task; every schema above is written against the zod 3 API.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add generated db types and shared zod schemas"
```

---

### Task 8: Work-item tree assembly

First of three pure modules. No database, no framework — the logic most likely to be subtly wrong, made cheap to test.

**Files:**
- Create: `apps/app/lib/work-items/types.ts`, `apps/app/lib/work-items/tree.ts`
- Create: `apps/app/tests/helpers/work-item-fixtures.ts`, `apps/app/tests/unit/tree.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type WorkItemNode = { id: string; parentId: string | null; orderIndex: number; status: WorkItemStatus; kind: WorkItemKind; title: string; createdAt: string; statusChangedAt: string; wakeAt: string | null }`
  - `type WorkItemTreeNode = WorkItemNode & { children: WorkItemTreeNode[] }`
  - `buildTree(items: WorkItemNode[]): WorkItemTreeNode[]` — throws `CycleError` on a cycle
  - `class CycleError extends Error`
  - `flattenTree(nodes: WorkItemTreeNode[]): WorkItemTreeNode[]` — depth-first, display order
  - `item(over: Partial<WorkItemNode> & { id: string }): WorkItemNode` from `apps/app/tests/helpers/work-item-fixtures.ts` — the shared test fixture builder, reused by Tasks 9 and 10

- [ ] **Step 1: Write the shared test fixture**

Create `apps/app/tests/helpers/work-item-fixtures.ts`. Tasks 9 and 10 import this same builder rather than redefining it:

```ts
import type { WorkItemNode } from "@/lib/work-items/tree";

/** Builds a WorkItemNode with sane defaults; override only what a test cares about. */
export function item(over: Partial<WorkItemNode> & { id: string }): WorkItemNode {
  return {
    parentId: null,
    orderIndex: 0,
    status: "open",
    kind: "task",
    title: over.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    statusChangedAt: "2026-01-01T00:00:00.000Z",
    wakeAt: null,
    ...over,
  };
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/app/tests/unit/tree.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTree, flattenTree, CycleError } from "@/lib/work-items/tree";
import { item } from "../helpers/work-item-fixtures";

describe("buildTree", () => {
  it("returns an empty array for no items", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("nests children under their parent", () => {
    const tree = buildTree([
      item({ id: "battery" }),
      item({ id: "bms", parentId: "battery" }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("battery");
    expect(tree[0].children.map((c) => c.id)).toEqual(["bms"]);
  });

  it("sorts siblings by orderIndex, then createdAt as a tiebreak", () => {
    const tree = buildTree([
      item({ id: "c", orderIndex: 1, createdAt: "2026-01-03T00:00:00.000Z" }),
      item({ id: "a", orderIndex: 0, createdAt: "2026-01-02T00:00:00.000Z" }),
      item({ id: "b", orderIndex: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(tree.map((n) => n.id)).toEqual(["b", "a", "c"]);
  });

  it("nests three levels deep", () => {
    const tree = buildTree([
      item({ id: "characters" }),
      item({ id: "hsk1", parentId: "characters" }),
      item({ id: "radicals", parentId: "hsk1" }),
    ]);
    expect(tree[0].children[0].children[0].id).toBe("radicals");
  });

  it("treats an item whose parent is absent as a root", () => {
    const tree = buildTree([item({ id: "orphan", parentId: "missing" })]);
    expect(tree.map((n) => n.id)).toEqual(["orphan"]);
  });

  it("throws CycleError on a two-node cycle", () => {
    expect(() =>
      buildTree([
        item({ id: "a", parentId: "b" }),
        item({ id: "b", parentId: "a" }),
      ])
    ).toThrow(CycleError);
  });

  it("throws CycleError on a self-referencing item", () => {
    expect(() => buildTree([item({ id: "a", parentId: "a" })])).toThrow(CycleError);
  });
});

describe("flattenTree", () => {
  it("returns depth-first display order", () => {
    const tree = buildTree([
      item({ id: "battery", orderIndex: 0 }),
      item({ id: "bms", parentId: "battery" }),
      item({ id: "frame", orderIndex: 1 }),
    ]);
    expect(flattenTree(tree).map((n) => n.id)).toEqual(["battery", "bms", "frame"]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm test apps/app/tests/unit/tree.test.ts
```

Expected: FAIL — cannot resolve `@/lib/work-items/tree`.

- [ ] **Step 4: Write the types**

Create `apps/app/lib/work-items/types.ts`:

```ts
import type { WORK_ITEM_KINDS, WORK_ITEM_STATUSES } from "@/lib/schemas/work-item";

export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export type WorkItemNode = {
  id: string;
  parentId: string | null;
  orderIndex: number;
  status: WorkItemStatus;
  kind: WorkItemKind;
  title: string;
  createdAt: string;
  statusChangedAt: string;
  wakeAt: string | null;
};

export type WorkItemTreeNode = WorkItemNode & { children: WorkItemTreeNode[] };
```

- [ ] **Step 5: Write the implementation**

Create `apps/app/lib/work-items/tree.ts`:

```ts
import type { WorkItemNode, WorkItemTreeNode } from "./types";

export type { WorkItemNode, WorkItemTreeNode } from "./types";

export class CycleError extends Error {
  constructor(id: string) {
    super(`work item ${id} is part of a parent cycle`);
    this.name = "CycleError";
  }
}

function assertAcyclic(items: WorkItemNode[]): void {
  const parentOf = new Map(items.map((i) => [i.id, i.parentId]));
  for (const item of items) {
    const seen = new Set<string>([item.id]);
    let cursor = item.parentId;
    while (cursor != null && parentOf.has(cursor)) {
      if (seen.has(cursor)) throw new CycleError(item.id);
      seen.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }
  }
}

function compare(a: WorkItemNode, b: WorkItemNode): number {
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  return a.createdAt.localeCompare(b.createdAt);
}

export function buildTree(items: WorkItemNode[]): WorkItemTreeNode[] {
  assertAcyclic(items);

  const nodes = new Map<string, WorkItemTreeNode>(
    items.map((i) => [i.id, { ...i, children: [] }])
  );
  const roots: WorkItemTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId != null ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortDeep = (list: WorkItemTreeNode[]) => {
    list.sort(compare);
    for (const n of list) sortDeep(n.children);
  };
  sortDeep(roots);

  return roots;
}

export function flattenTree(nodes: WorkItemTreeNode[]): WorkItemTreeNode[] {
  const out: WorkItemTreeNode[] = [];
  const walk = (list: WorkItemTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
```

- [ ] **Step 6: Run to verify it passes**

```bash
pnpm test apps/app/tests/unit/tree.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/app/lib/work-items apps/app/tests/helpers/work-item-fixtures.ts apps/app/tests/unit/tree.test.ts
git commit -m "feat: add work-item tree assembly with cycle detection"
```

---

### Task 9: Progress computation

Derived, never stored — replacing the old stored-progress trigger that went stale on insert, delete, and cascade.

**Files:**
- Create: `apps/app/lib/work-items/progress.ts`
- Create: `apps/app/tests/unit/progress.test.ts`

**Interfaces:**
- Consumes: `WorkItemNode` and `buildTree` from Task 8; the `item()` fixture from `apps/app/tests/helpers/work-item-fixtures.ts` (Task 8)
- Produces:
  - `type Progress = { done: number; total: number; ratio: number | null }`
  - `computeProgress(items: WorkItemNode[]): Map<string, Progress>` — keyed by work-item id

Rules, from the spec: a leaf contributes `1/1` when `done` and `0/1` otherwise; `dropped` items are excluded from both numerator and denominator; a parent's figures are the sum over its leaf descendants. `ratio` is `null` when `total` is 0.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeProgress } from "@/lib/work-items/progress";
import { item } from "../helpers/work-item-fixtures";

describe("computeProgress", () => {
  it("scores a lone open leaf as 0 of 1", () => {
    const p = computeProgress([item({ id: "a" })]);
    expect(p.get("a")).toEqual({ done: 0, total: 1, ratio: 0 });
  });

  it("scores a lone done leaf as 1 of 1", () => {
    const p = computeProgress([item({ id: "a", status: "done" })]);
    expect(p.get("a")).toEqual({ done: 1, total: 1, ratio: 1 });
  });

  it("counts doing and blocked as not done", () => {
    const p = computeProgress([
      item({ id: "a", status: "doing" }),
      item({ id: "b", status: "blocked" }),
    ]);
    expect(p.get("a")!.done).toBe(0);
    expect(p.get("b")!.done).toBe(0);
  });

  it("excludes dropped leaves from both numerator and denominator", () => {
    const p = computeProgress([
      item({ id: "root" }),
      item({ id: "x", parentId: "root", status: "done" }),
      item({ id: "y", parentId: "root", status: "dropped" }),
    ]);
    expect(p.get("root")).toEqual({ done: 1, total: 1, ratio: 1 });
  });

  it("returns a null ratio when every descendant is dropped", () => {
    const p = computeProgress([
      item({ id: "root" }),
      item({ id: "x", parentId: "root", status: "dropped" }),
    ]);
    expect(p.get("root")).toEqual({ done: 0, total: 0, ratio: null });
  });

  it("sums leaf descendants rather than averaging child ratios", () => {
    // left has 1 leaf (done); right has 3 leaves (1 done). Averaging child
    // ratios would give 0.667; summing leaves correctly gives 0.5.
    const p = computeProgress([
      item({ id: "root" }),
      item({ id: "left", parentId: "root" }),
      item({ id: "l1", parentId: "left", status: "done" }),
      item({ id: "right", parentId: "root" }),
      item({ id: "r1", parentId: "right", status: "done" }),
      item({ id: "r2", parentId: "right" }),
      item({ id: "r3", parentId: "right" }),
    ]);
    expect(p.get("root")).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it("ignores a parent's own status and uses its leaves", () => {
    const p = computeProgress([
      item({ id: "root", status: "done" }),
      item({ id: "child", parentId: "root", status: "open" }),
    ]);
    expect(p.get("root")).toEqual({ done: 0, total: 1, ratio: 0 });
  });

  it("scores three levels deep", () => {
    const p = computeProgress([
      item({ id: "characters" }),
      item({ id: "hsk1", parentId: "characters" }),
      item({ id: "r1", parentId: "hsk1", status: "done" }),
      item({ id: "r2", parentId: "hsk1" }),
    ]);
    expect(p.get("characters")).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(p.get("hsk1")).toEqual({ done: 1, total: 2, ratio: 0.5 });
  });

  it("returns an empty map for no items", () => {
    expect(computeProgress([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test apps/app/tests/unit/progress.test.ts
```

Expected: FAIL — cannot resolve `@/lib/work-items/progress`.

- [ ] **Step 3: Write the implementation**

Create `apps/app/lib/work-items/progress.ts`:

```ts
import { buildTree, type WorkItemNode, type WorkItemTreeNode } from "./tree";

export type Progress = { done: number; total: number; ratio: number | null };

function score(node: WorkItemTreeNode, out: Map<string, Progress>): Progress {
  if (node.children.length === 0) {
    const result: Progress =
      node.status === "dropped"
        ? { done: 0, total: 0, ratio: null }
        : node.status === "done"
          ? { done: 1, total: 1, ratio: 1 }
          : { done: 0, total: 1, ratio: 0 };
    out.set(node.id, result);
    return result;
  }

  let done = 0;
  let total = 0;
  for (const child of node.children) {
    const childScore = score(child, out);
    done += childScore.done;
    total += childScore.total;
  }

  const result: Progress = { done, total, ratio: total === 0 ? null : done / total };
  out.set(node.id, result);
  return result;
}

export function computeProgress(items: WorkItemNode[]): Map<string, Progress> {
  const out = new Map<string, Progress>();
  for (const root of buildTree(items)) score(root, out);
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test apps/app/tests/unit/progress.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/work-items/progress.ts apps/app/tests/unit/progress.test.ts
git commit -m "feat: compute work-item progress from the tree

Sums leaf descendants rather than averaging child ratios, excludes dropped
items from both numerator and denominator, and returns a null ratio for
all-dropped subtrees."
```

---

### Task 10: Re-entry signals

Powers the resume view's two loudest claims: what is due, and how long something has sat.

**Files:**
- Create: `apps/app/lib/work-items/reentry.ts`
- Create: `apps/app/tests/unit/reentry.test.ts`

**Interfaces:**
- Consumes: `WorkItemNode` from Task 8; the `item()` fixture from `apps/app/tests/helpers/work-item-fixtures.ts` (Task 8)
- Produces:
  - `dueWakeItems(items: WorkItemNode[], now: Date): WorkItemNode[]` — blocked items whose `wakeAt` has arrived, soonest first
  - `daysInStatus(item: WorkItemNode, now: Date): number` — whole days since `statusChangedAt`, never negative
  - `daysSince(iso: string, now: Date): number`

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/reentry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dueWakeItems, daysInStatus, daysSince } from "@/lib/work-items/reentry";
import { item } from "../helpers/work-item-fixtures";

const NOW = new Date("2026-07-30T12:00:00.000Z");

describe("dueWakeItems", () => {
  it("returns a blocked item whose wake date has passed", () => {
    const due = dueWakeItems(
      [item({ id: "motor", status: "blocked", wakeAt: "2026-07-01T00:00:00.000Z" })],
      NOW
    );
    expect(due.map((i) => i.id)).toEqual(["motor"]);
  });

  it("excludes a blocked item whose wake date is in the future", () => {
    const due = dueWakeItems(
      [item({ id: "motor", status: "blocked", wakeAt: "2026-09-01T00:00:00.000Z" })],
      NOW
    );
    expect(due).toEqual([]);
  });

  it("excludes a blocked item with no wake date", () => {
    expect(dueWakeItems([item({ id: "x", status: "blocked" })], NOW)).toEqual([]);
  });

  it("excludes non-blocked items even when their wake date has passed", () => {
    const due = dueWakeItems(
      [
        item({ id: "open", status: "open", wakeAt: "2026-01-01T00:00:00.000Z" }),
        item({ id: "done", status: "done", wakeAt: "2026-01-01T00:00:00.000Z" }),
      ],
      NOW
    );
    expect(due).toEqual([]);
  });

  it("includes an item whose wake date is exactly now", () => {
    const due = dueWakeItems(
      [item({ id: "edge", status: "blocked", wakeAt: NOW.toISOString() })],
      NOW
    );
    expect(due.map((i) => i.id)).toEqual(["edge"]);
  });

  it("sorts the longest overdue first", () => {
    const due = dueWakeItems(
      [
        item({ id: "recent", status: "blocked", wakeAt: "2026-07-20T00:00:00.000Z" }),
        item({ id: "ancient", status: "blocked", wakeAt: "2026-03-01T00:00:00.000Z" }),
      ],
      NOW
    );
    expect(due.map((i) => i.id)).toEqual(["ancient", "recent"]);
  });
});

describe("daysInStatus", () => {
  it("counts whole days since the status last changed", () => {
    expect(
      daysInStatus(item({ id: "a", statusChangedAt: "2026-07-20T12:00:00.000Z" }), NOW)
    ).toBe(10);
  });

  it("returns 0 for a status changed moments ago", () => {
    expect(
      daysInStatus(item({ id: "a", statusChangedAt: "2026-07-30T11:00:00.000Z" }), NOW)
    ).toBe(0);
  });

  it("never returns a negative number for a future timestamp", () => {
    expect(
      daysInStatus(item({ id: "a", statusChangedAt: "2026-08-30T00:00:00.000Z" }), NOW)
    ).toBe(0);
  });
});

describe("daysSince", () => {
  it("counts whole days", () => {
    expect(daysSince("2026-07-07T12:00:00.000Z", NOW)).toBe(23);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test apps/app/tests/unit/reentry.test.ts
```

Expected: FAIL — cannot resolve `@/lib/work-items/reentry`.

- [ ] **Step 3: Write the implementation**

Create `apps/app/lib/work-items/reentry.ts`:

```ts
import type { WorkItemNode } from "./tree";

const MS_PER_DAY = 86_400_000;

export function daysSince(iso: string, now: Date): number {
  const elapsed = now.getTime() - new Date(iso).getTime();
  return elapsed <= 0 ? 0 : Math.floor(elapsed / MS_PER_DAY);
}

export function daysInStatus(item: WorkItemNode, now: Date): number {
  return daysSince(item.statusChangedAt, now);
}

export function dueWakeItems(items: WorkItemNode[], now: Date): WorkItemNode[] {
  return items
    .filter(
      (i) =>
        i.status === "blocked" &&
        i.wakeAt !== null &&
        new Date(i.wakeAt).getTime() <= now.getTime()
    )
    .sort((a, b) => new Date(a.wakeAt!).getTime() - new Date(b.wakeAt!).getTime());
}
```

- [ ] **Step 4: Run the full suite**

```bash
pnpm typecheck
pnpm test
pnpm test:rls
pnpm build
```

Expected: no type errors, all unit tests pass, all RLS tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/work-items/reentry.ts apps/app/tests/unit/reentry.test.ts
git commit -m "feat: add re-entry signals for due wake dates and status duration"
```

---

## Definition of done

- `pnpm typecheck` passes with `ignoreBuildErrors` removed — this is the gate that makes the rest meaningful.
- `pnpm build` succeeds on Next 16 / React 19.
- No credential remains in the working tree, and `.gitignore` blocks codebase dumps.
- `pnpm test` passes: schemas, tree, progress, re-entry.
- `pnpm test:rls` passes: schema shape, two-user isolation across six tables, storage isolation.
- No AI dependency remains in `package.json`.
- `supabase db reset` applies cleanly from an empty database.

## What plan 2 builds on this

The workspace UI: routes under `apps/app/app/projects/`, the `apps/app/lib/db` query layer, server actions, quick capture, the resume view, the work tree, the markdown document editor with revisions, and the Playwright pass over capture → close work item → resume view.

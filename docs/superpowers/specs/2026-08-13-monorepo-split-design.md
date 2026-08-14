# Goalspace Monorepo Split

**Date:** 2026-08-13
**Status:** Approved design, ready for implementation planning
**Scope:** Structural. Separates the marketing surface from the workspace
application. No product features are added or removed.

Companion spec: `2026-08-13-landing-design.md` (the landing page that lands in
`apps/web` after this split). Prerequisite context:
`2026-07-30-goalspace-repository-core-design.md` (Phase 1 product design).

---

## 1. Why now

The repository holds one Next 16 application serving two unrelated jobs: a
public marketing site (landing, blog, three locales, SEO) and a private
workspace (auth, projects, the record). They have opposite requirements. The
marketing site wants static rendering, indexability, and frequent copy changes.
The workspace wants sessions, database access, and a middleware that redirects
anonymous visitors away.

Today both jobs share one middleware, one build, one deployment, and one set of
environment variables, which is why the current `middleware.ts` runs 220 lines
of interleaved locale and auth logic with a hand-maintained public-route
allowlist. Every marketing copy change redeploys the application, and every
route added to the workspace risks the marketing site's public access.

The timing is the argument. Phase 1 stopped after the database and RLS work, so
**the workspace UI does not exist yet.** Splitting now costs a file move.
Splitting after the workspace is built costs a file move plus a rewrite of
everything built in between.

---

## 2. Decisions

| Decision | Choice |
|---|---|
| Topology | Two Vercel projects. Landing on the apex domain, workspace on `app.` |
| Auth home | Entirely in the workspace app. The landing has no Supabase dependency. |
| Shared code | Three packages: `ui`, `i18n`, `config`. Database stays with the app. |
| App i18n | The workspace drops the `[locale]` URL segment and keeps translations. |
| Scope | Structural move plus the rewrites the split forces. No opportunistic refactors. |

---

## 3. Target layout

```
goalspace/
├── apps/
│   ├── web/          landing: marketing, blog, /[locale], zero Supabase
│   └── app/          workspace: auth + projects, no locale segment
├── packages/
│   ├── ui/           shadcn primitives, cn(), theme provider
│   ├── i18n/         locale list, en/ms/zh strings, provider, hooks
│   └── config/       tsconfig bases, tailwind preset, prettier
├── turbo.json
├── pnpm-workspace.yaml
└── package.json      workspace scripts only, no application dependencies
```

pnpm workspaces (the repository is already on pnpm 10.2.1) with Turborepo for
task orchestration.

**Packages are source-only.** No build step, no `dist/`, no `exports` map
pointing at compiled output. Each package's `main` points at its TypeScript
source, and both applications list the packages in `transpilePackages` in
`next.config.js`. This keeps the dev loop instant, removes build ordering from
`turbo.json`, and means a change to a shared component is visible without a
rebuild. The cost is that packages cannot be published to a registry, which is
not a goal.

Dependency direction is strictly one-way:

```
apps/web ─┐
          ├─→ packages/i18n ─→ packages/ui ─→ (nothing)
apps/app ─┘
          └─→ packages/config (consumed as config files, not imports)
```

No cycles, so no `dependsOn` chains are needed for typecheck.

---

## 4. apps/web

The marketing surface. Development port 3000.

**Receives:** `app/[locale]/{page,layout}`, `app/[locale]/blog/**`,
`app/not-found.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/_lib/analytics.ts`,
`app/providers/analytics-provider.tsx`, `components/sections/*`,
`main-nav.tsx`, `site-header.tsx`, `blog-section.tsx`,
`landing-blog-section.tsx`, and the decorative UI components (§6).

Most of that marketing surface is deleted by the landing redesign that follows.
It moves intact anyway, so that the split is a pure relocation and the redesign
is the only commit that changes what the page says.

**Loses:** every Supabase import, the auth branch of the middleware, the
`isPublicPage` allowlist, `login-form.tsx`, `auth-form.tsx`, and the
`components/auth/` directory.

**Middleware** collapses to locale detection, the `NEXT_LOCALE` cookie, and the
redirect that adds a missing locale segment. The Supabase client construction,
the session check, the public-route allowlist, and the login-route special case
all disappear because every route on this application is public. This is a
reduction from roughly 220 lines to roughly 40, and it is a consequence of the
split rather than a refactor undertaken for its own sake.

With no session read anywhere in the tree, the landing becomes statically
renderable.

**Consequence, accepted:** the landing can never greet a signed-in visitor or
swap its call to action to "open your workspace", because it cannot see the
session cookie (§7). The call to action is identical for both audiences, so the
loss is cosmetic.

---

## 5. apps/app

The workspace. Development port 3001.

**Receives:** `app/[locale]/login/page.tsx` (relocated to `app/login/`),
`app/auth/callback/route.ts`, `app/auth/page.tsx`, `utils/supabase/*`,
`types/supabase.ts`, `lib/auth.ts`, `components/login-form.tsx`,
`components/auth/*`, the `supabase/` directory (migrations, config, seed), and
`tests/` (unit and RLS).

**Routing.** The `[locale]` segment is dropped. The Phase 1 route tree becomes:

```
/projects
/projects/new
/projects/[slug]              resume view
/projects/[slug]/log
/projects/[slug]/work
/projects/[slug]/work/[id]
/projects/[slug]/docs
/projects/[slug]/docs/[id]
```

Language is read from the `NEXT_LOCALE` cookie that the landing already sets,
and strings still resolve through `packages/i18n`. Nothing behind a login needs
to be indexed in three languages, so the segment bought nothing and cost a
redirect chain on every request.

**Middleware** is auth only: refresh the session through the existing
`@supabase/ssr` helper in `utils/supabase/middleware.ts`, and redirect anonymous
requests to `/login?returnUrl=<path>`. The deprecated
`@supabase/auth-helpers-nextjs` client used by the current root middleware is
dropped along with the file it lived in. This is a forced rewrite, not an
optional one: the old middleware cannot be moved intact because its auth and
locale logic are interleaved, and `@supabase/ssr` is already a dependency doing
the same job correctly elsewhere in the tree.

---

## 6. Packages

### packages/ui

**The rule: generic primitives only.** A component belongs here if it was
generated by shadcn and carries no product or marketing personality. Everything
else lives in the application that renders it.

That rule is mechanical enough to apply per file without deliberation, and it
splits the current 60-file `components/ui` directory roughly 20/40. Staying:
`button`, `card`, `dialog`, `drawer`, `dropdown-menu`, `form`, `input`,
`textarea`, `label`, `select`, `checkbox`, `radio-group`, `switch`, `tabs`,
`table`, `tooltip`, `popover`, `separator`, `skeleton`, `sonner`, `toast`,
`toaster`, `scroll-area`, `command`, `sheet`, `accordion`, `collapsible`,
`avatar`, `badge`, `progress`, plus `cn()` from `lib/utils.ts`, the theme
provider, `theme-toggle`, `mode-toggle`, and `use-toast`.

The theme components stay in the package even though the landing never renders
them: the landing commits to a single light treatment
(`2026-08-13-landing-design.md`), and theming belongs to the workspace. For the
same reason `apps/web` does not mount the theme provider and does not depend on
`next-themes`.

Moving to `apps/web`: `animated-hero`, `bento-grid`, `border-beam`,
`faq-section`, `fancy-button`, `placeholders-and-vanish-input` (and its demo),
`feature-block-animated-card`, `activity-card`, `expandable-card`,
`question-card`, `circular-progress`, `color-system-demo`.

Several of these are casualties of the landing redesign rather than the split
(`2026-08-13-landing-design.md`), but they move first and are deleted there, so
that each change has one reason.

`components.json` for shadcn points at `packages/ui`, so future
`shadcn add` runs land in the right place.

### packages/i18n

Owns the locale list (`['en','ms','zh']` and `defaultLocale`), which currently
lives inside `middleware.ts` and would otherwise need to be duplicated into both
applications. Also owns the three locale JSON files, `lib/i18n.ts`,
`lib/hooks/use-translations.ts`, the i18n provider, the language provider, the
language selector component, and `types/i18next.d.ts`.

**This package resolves the repository's duplicate files.** Today there are two
of nearly everything: `locales/` and `src/locales/`, `components/providers/
language-provider.tsx` and `src/providers/language-provider.tsx`,
`components/language-selector.tsx` and `src/components/language-selector.tsx`.
The `src/` copies are dropped and `src/` is deleted. `locales/en.json.new` is
resolved against `locales/en.json` and the loser is deleted. Two copies cannot
both move into one package, which is what makes this a forced resolution rather
than an opportunistic cleanup.

The same applies to `hooks/use-expandable.tsx` versus
`components/hooks/use-expandable.ts`, and `components/auth-form.tsx` versus
`components/auth/auth-form.tsx`. Each pair is reduced to one file, and the
surviving copy is whichever the current build actually imports.

### packages/config

Not an import target. It holds files the applications extend:

- `tsconfig/base.json` and `tsconfig/next.json`. Each application keeps its own
  `tsconfig.json` extending these, with its own `@/*` path mapping rooted at
  itself.
- `tailwind/preset.ts`, which is the current `tailwind.config.ts` re-expressed
  as a preset. Each application keeps a thin `tailwind.config.ts` extending it
  and declaring its own `content` globs, which must include
  `../../packages/*/src/**/*.{ts,tsx}`.
- `prettier/index.mjs`, from the current `.prettierrc`, including the import
  sort plugin configuration.

Each application keeps its own `postcss.config.js` and `globals.css`. Both are
short enough that sharing them would cost more indirection than duplication.

---

## 7. Deployment

Two Vercel projects on one repository:

| | apps/web | apps/app |
|---|---|---|
| Root directory | `apps/web` | `apps/app` |
| Domain | `goalspace.com` | `app.goalspace.com` |
| Framework preset | Next.js | Next.js |
| Install command | `pnpm install` at repository root | same |

Both projects enable "include files outside root directory" so the workspace
packages resolve. Each application owns its `vercel.json`; the current root
`vercel.json` is deleted, along with its hardcoded
`NEXT_PUBLIC_URL=https://goalspace.vercel.app`.

**Ignored build step.** Each project runs `turbo-ignore` so that a landing copy
change does not rebuild the workspace, and a migration does not rebuild the
landing.

**Environment variables.**

- `apps/web` reads `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_WEB_URL`,
  `NEXT_PUBLIC_APP_URL`, and the PostHog keys. No Supabase keys, and the absence
  is load-bearing: it is what proves the landing cannot read a session.
- `apps/app` reads the Supabase URL and anon key, the service role key (tests
  only), `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_WEB_URL`, and `NEXT_PUBLIC_APP_URL`.

`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_WEB_URL` exist so cross-application links
resolve correctly in local development (ports 3000 and 3001), preview
deployments, and production, without hardcoding a domain in a component.

The root `.env.example` is split per application and pruned. Its current
contents include NextAuth secrets, Upstash Redis and Vector credentials, and
five AI provider keys, all belonging to the product deleted in Phase 1 task 1.
Splitting the file forces the question of which variables each application
actually reads, so the prune happens here rather than being deferred.

**Auth cookie scope.** Because auth lives entirely in `apps/app`, Supabase
cookies scope to `app.goalspace.com` with no parent-domain sharing and no
cross-subdomain cookie configuration. This is the direct benefit of the auth
placement decision, and its only cost is the accepted consequence in §4.

---

## 8. Testing and CI

Vitest moves to `apps/app` with both suites intact. The config's `@` alias
repoints from the repository root to `apps/app`. Test scripts become
`pnpm --filter @goalspace/app test` locally, with the root `pnpm test` fanning
out through turbo.

`turbo.json` defines `build` (outputs `.next/**`, excluding `.next/cache/**`),
`dev` (persistent, uncached), `typecheck`, `test`, and `lint`. Environment
variables that affect output are declared in each task's `env` list so the cache
does not serve a build made with different keys.

There is no CI today, only a pull request template. The split adds a GitHub
Actions workflow running `turbo typecheck test build` on affected packages,
because a monorepo without CI makes it easy to break the application you were
not looking at. The RLS suite requires a local Supabase instance, so it runs
separately from the default test task rather than blocking every pull request.

The Playwright end-to-end path specified in the Phase 1 spec targets `apps/app`
once the workspace UI exists.

---

## 9. Sequence

Six commits, each independently green, verified by `pnpm build` and
`pnpm typecheck` before moving on.

1. **Scaffold.** Add `pnpm-workspace.yaml`, `turbo.json`, and the root
   `package.json` scripts. The application still builds from the root. Proves
   the tooling works before anything moves.
2. **`packages/config`.** Extract tsconfig bases, the tailwind preset, and
   prettier. The root application extends them.
3. **`packages/ui` and `packages/i18n`.** Extract both, resolving every
   duplicate file pair (§6) and deleting `src/`.
4. **`apps/web`.** Move the marketing surface, strip auth from it and from its
   middleware, and point its "sign in" links at `NEXT_PUBLIC_APP_URL`.
5. **`apps/app`.** Move auth, Supabase, migrations, and tests. Drop the
   `[locale]` segment. Write the auth-only middleware.
6. **Deployment and CI.** Per-application `vercel.json`, split `.env.example`,
   `turbo-ignore`, and the GitHub Actions workflow.

The landing redesign follows as separate work inside `apps/web`, so that it
lands on moved code rather than being tangled with the move.

`docs/superpowers/plans/2026-07-30-phase1-foundation.md` is amended for the new
file paths and the dropped `[locale]` segment. Tasks 0 through 6 are already
complete and are annotated rather than rewritten.

---

## 10. Risks

| Risk | Response |
|---|---|
| Vercel misconfiguration silently deploys the wrong root directory | Verify each project's first deployment by URL before pointing DNS at it |
| `transpilePackages` misses a package and the build fails opaquely | Both applications list all three packages from the first commit that creates them |
| Tailwind content globs miss `packages/`, silently dropping classes | Verified visually on a component that only exists in `packages/ui` |
| Duplicate-file resolution picks the wrong copy | The surviving copy is the one the current build imports, confirmed by grep before deleting |
| The RLS suite breaks on the alias repoint | Task 5's tests are run before and after the move and must produce identical output |
| Phase 1 plan paths go stale mid-execution | The plan is amended in the same commit that invalidates it |

---

## 11. Non-goals

| Non-goal | Rationale |
|---|---|
| Sharing the database layer as a package | Only one consumer. Revisit when phase 2 adds an agent runtime. |
| Publishing packages to a registry | No external consumer. Source-only packages are simpler. |
| Rewriting the locale detection logic | It works. The split only removes the auth half of the middleware. |
| Migrating off `trailingSlash: true` | Unrelated to the split, and it affects live URLs. |
| A shared ESLint config | There is no lint setup today. Adding one is its own task. |
| Changing the auth provider or session model | Supabase auth moves unchanged. |

# Goalspace

A repository for one long project.

A log of what happened (notes, decisions, sources, sessions), work items for
what is next (nested, with real statuses including blocked and a wake date),
and documents as living artifacts. The record accrues as a by-product of daily
use, because nobody maintains a journal deliberately for two years.

The job it does is **re-entry**. Open a project after a month away and the
resume view answers what is open, what you last did, and what you already
decided, without navigation. Not planning, not motivation, not habit tracking —
there are no streaks, badges, or progress celebration, by design.

## Layout

pnpm workspaces, driven by Turborepo.

```text
apps/app        the workspace application — the product   (:3001)
apps/web        marketing site and blog                   (:3000)
packages/ui     shared design-system components
packages/i18n   i18next setup, provider, locale cookie
packages/config Tailwind preset, Prettier, tsconfig
docs/           specs, plans, and reference
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Supabase
(Postgres, Auth, Storage) · zod · Vitest.

## Getting started

Requires **Node ≥ 22** and pnpm ≥ 8.

```bash
pnpm install
cp apps/app/.env.example apps/app/.env.local   # then fill in the values
pnpm dev
```

The workspace app comes up on http://localhost:3001, the marketing site on
http://localhost:3000.

See [docs/environment.md](docs/environment.md) for what each variable does and
which file it belongs in — the short version is that every secret goes in
`.env.local`, because the other `.env.*` files are tracked.

## Commands

```bash
pnpm dev          # both apps
pnpm build
pnpm typecheck
pnpm test         # unit tests
pnpm test:rls     # RLS isolation tests — needs a live Supabase project
pnpm lint
pnpm format
```

Inside `apps/app`, `pnpm db:start` and `pnpm db:reset` drive the local Supabase
stack. Migrations live in `apps/app/supabase/migrations`.

## Documentation

| Document | What it covers |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Audience, voice, design principles, anti-references. Read before writing anything user-facing. |
| [DESIGN.md](DESIGN.md) | The Workshop Manual design system — colors, type, spacing. |
| [CLAUDE.md](CLAUDE.md) | Working knowledge base for agents and new contributors. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | The five phases and their status. |
| [docs/superpowers/specs/](docs/superpowers/specs/) | Approved designs. These are specifications, not sketches. |
| [docs/environment.md](docs/environment.md) | Environment variables. |
| [docs/auth.md](docs/auth.md) | Supabase auth flow and route protection. |
| [docs/usage-tracking.md](docs/usage-tracking.md) | PostHog analytics. |

## Status

Phase 1 (the repository core) is built: projects, the entry log, nested work
items, documents with recorded revisions, attachments, and the resume view,
with row-level security enforced by policy and covered by isolation tests.

Phase 2 — an agent that reads your repository back to you, proposing rather
than writing — is designed and not yet started. See
[docs/ROADMAP.md](docs/ROADMAP.md).

## Internationalization

English, Malay, and Chinese (`en`, `ms`, `zh`). Layouts must survive strings
roughly 40% longer than the English original.

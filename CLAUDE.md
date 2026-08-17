# CLAUDE.md — Knowledge Base for Goalspace

## What this product is

Goalspace is a **repository for one long project**. A log of what happened
(notes, decisions, sources, sessions), work items for what is next (nested, with
real statuses including blocked and a wake date), and documents as living
artifacts. The record accrues as a by-product of daily use.

The job to be done is **re-entry**: open the project after a month away and the
resume view answers what is open, what you last did, and what you already
decided, without navigation. Not planning, not motivation, not habit tracking.

Read [PRODUCT.md](PRODUCT.md) before writing anything user-facing — it carries
the audience, the voice (workmanlike, exacting, unsentimental), and the
anti-references. Streaks, badges, confetti, and progress celebration are
explicitly excluded from the product, not merely undesigned.

> **Historical note.** Until commit `8b7245a` this was an AI goal-setting
> product with an assistant named Faez, generated "learning spaces", AI mentors,
> and a podcast feature. All of it was deleted. If you find a doc, comment, or
> string referring to goals, spaces, mentors, modules, or Faez, it is stale —
> fix it or flag it rather than building to it.

## Repository layout

pnpm workspaces driven by Turborepo.

| Path | What it is |
|---|---|
| `apps/app` | The workspace application. Port 3001. This is the product. |
| `apps/web` | The marketing site and blog. Port 3000. |
| `packages/ui` | Shared shadcn/ui primitives and design-system components. |
| `packages/i18n` | i18next setup, provider, and cookie-based locale resolution. |
| `packages/config` | Shared Tailwind preset, Prettier, and TypeScript config. |
| `docs/superpowers/` | Design specs and implementation plans. The specs are approved designs, not sketches. |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase
(Postgres + Auth + Storage) · zod · react-hook-form · Vitest.

## Commands

Run from the repository root; Turborepo fans out to the workspaces.

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
stack.

## Data model

Migrations live in `apps/app/supabase/migrations`; generated types in
`apps/app/types/supabase.ts`.

- **users**, **user_settings** — account and preferences.
- **projects** — one long project. Carries `visibility`, which gates public reads.
- **entries** — the log. A `kind` (note, decision, source, session, …), a body,
  an optional title, and `occurred_at` separate from `created_at` so work can be
  backdated.
- **work_items** — nested, ordered, with statuses including blocked and a
  `wake_at` date. `closed_by_entry_id` ties a closure to the log entry that
  caused it.
- **documents** and **document_revisions** — living artifacts with an undo path.
- **attachments** — files in Supabase Storage.

`entries`, `work_items`, and `documents` each carry a nullable `agent_id`. It is
always null today. Null means human-authored; it exists so the agent layer can
set provenance without a later migration.

### Row Level Security

Every table has RLS enabled. Ownership is flat (`owner_id = auth.uid()`) for
reads and deletes; insert and update checks additionally require the row's
`project_id` to belong to the caller, so ownership cannot be forged by
relocating a row into someone else's project. Public projects are world-readable
via a shallow `EXISTS` on `projects.visibility`.

The policies are written out longhand rather than generated in a loop, on
purpose: security rules must be greppable. Keep it that way.

## Code layout (`apps/app`)

| Path | Responsibility |
|---|---|
| `lib/schemas/` | zod schemas. One validation path shared by forms and server actions. |
| `lib/db/` | Typed queries, one module per entity. |
| `lib/actions/` | Server actions and the `Result` type they return. |
| `lib/work-items/` | Pure domain logic — tree, progress, re-entry. No I/O. |
| `lib/auth/` | Session helpers. |
| `app/(workspace)/` | The workspace routes. |
| `app/login/` | The single auth surface. |

`lib/work-items/*` is pure functions over plain data and is tested directly.
Keep domain logic there rather than in components or queries.

## Testing

- `apps/app/tests/unit` — Vitest, no database.
- `apps/app/tests/rls` — two-user isolation, schema, and storage tests against a
  real Supabase project. These are the security regression gate; when you add a
  table, extend them.

Domain logic in this repo has been written test-first. Follow that.

## Internationalization

`packages/i18n` (i18next + react-i18next), locales `en`, `ms`, `zh`. The
marketing site is locale-routed (`app/[locale]/`); locale is resolved from a
cookie. Layouts must survive strings ~40% longer than English.

## The AI layer

**There is none yet.** No AI dependencies, no model calls, no agent tables, no
pgvector. Do not add one incidentally.

It is designed in
[docs/superpowers/specs/2026-07-30-goalspace-grounded-copartner-design.md](docs/superpowers/specs/2026-07-30-goalspace-grounded-copartner-design.md)
as phase 2. Two constraints from that design shape everything and should not be
softened without a deliberate decision:

1. **Agents propose; they never write.** Every mutation an agent wants becomes a
   proposal the owner accepts or rejects.
2. **Agents are capability boundaries, not personas.** The tool set handed to a
   model is intersected server-side with the agent's allowlist, so a model that
   emits a disallowed call cannot execute it. Enforced by code and proven by
   test — never by prompt instruction.

Models will be addressed as `"provider/model"` strings through the Vercel AI
Gateway (`AI_GATEWAY_API_KEY`), not through per-provider SDKs and keys.

## Environment

`.env.development`, `.env.preview`, and `.env.production` are **tracked** and
hold only non-secret configuration. Only `.env` and `.env*.local` are
gitignored. Every real secret belongs in `.env.local`; putting one in any other
`.env.*` file commits it.

See [docs/environment.md](docs/environment.md) for the full variable list.

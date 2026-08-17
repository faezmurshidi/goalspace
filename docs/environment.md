# Environment Configuration

## Which file goes where

| File | Tracked? | Purpose |
|---|---|---|
| `.env.example` | yes | The template. Variable names, no values. |
| `.env.development` | **yes** | Local and preview defaults. Non-secret configuration only. |
| `.env.preview` | **yes** | Vercel preview deployments. Non-secret only. |
| `.env.production` | **yes** | Production. Non-secret only; real values live in Vercel project settings. |
| `.env.local` | no | **Every secret goes here.** Gitignored via `.env*.local`. |

> Only `.env`, `.env*.local`, and `.env.test` are gitignored. The three
> environment-specific files are committed, so a secret placed in one is a
> secret published. If you need a credential locally, it belongs in
> `.env.local` and nowhere else.

Vercel system environment variables override values from these files at
deploy time.

## Setup

```bash
cp apps/app/.env.example apps/app/.env.local
# then fill in the values below
```

## Variables the code actually reads

### Supabase

```
NEXT_PUBLIC_SUPABASE_URL=       # public; embedded in the client bundle
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # public; carries no authority of its own
```

Both are public by design. RLS is what protects the data, which is why every
table has owner-scoped policies and why the isolation tests exist.

### RLS tests only

```
API_URL=            # Supabase project URL
ANON_KEY=           # anon key
SERVICE_ROLE_KEY=   # service role key — a real secret, .env.local only
```

Note the names: the RLS helper reads `SERVICE_ROLE_KEY`, **not**
`SUPABASE_SERVICE_ROLE_KEY`. See `apps/app/tests/helpers/supabase.ts`.

The service role key bypasses RLS entirely. It is used only to set up and tear
down fixtures in `pnpm test:rls`; it must never reach application code or a
tracked file.

### Cross-application links

```
NEXT_PUBLIC_ENV=development     # development | preview | production
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Defaulted in `apps/app/next.config.js` if unset.

### Analytics

```
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
POSTHOG_SERVER_KEY=             # server-side; currently commented out in code
```

Read by `apps/app/app/_lib/analytics.ts`, `apps/web/app/_lib/analytics.ts`, and
`apps/app/utils/server-analytics.ts`. See [usage-tracking.md](usage-tracking.md).

### AI Gateway

```
AI_GATEWAY_API_KEY=   # a real secret — .env.local only
```

All model access goes through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
using `"provider/model"` slugs, so this is the **only** model credential the
project needs. There are no per-provider keys: no `OPENAI_API_KEY`, no
`ANTHROPIC_API_KEY`. Two providers appear in the phase-2 design — Anthropic for
generation, OpenAI for embeddings — because chat and embedding are different
model classes, but both resolve through the same gateway credential.

Alternatively, `vercel env pull .env.local` provisions a short-lived
`VERCEL_OIDC_TOKEN` (~24h) and no static key is needed. When both are present
`AI_GATEWAY_API_KEY` wins — the gateway checks it first.

## Variables set but never read

`NEXT_PUBLIC_ENABLE_CHAT`, `NEXT_PUBLIC_ENABLE_SKILL_TREE`, `SENTRY_DSN`, and
`NEXT_PUBLIC_API_URL` appear in the tracked `.env.*` files but no code reads
them. They are residue from the removed goals/spaces surface. Delete them when
next touching those files rather than reviving them by accident.

# Monorepo Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single Next application into a marketing site (`apps/web`) and a workspace application (`apps/app`) in a pnpm + Turborepo monorepo, with `ui`, `i18n`, and `config` as shared packages.

**Architecture:** pnpm workspaces provide package resolution, Turborepo orchestrates tasks. Shared packages are source-only (no build step, no `dist/`), consumed through `transpilePackages` in each application's `next.config.js`. Auth lives entirely in `apps/app`, which lets `apps/web` drop every Supabase dependency and become statically renderable, and lets `apps/app` drop the `[locale]` URL segment.

**Tech Stack:** pnpm 10.2.1 workspaces, Turborepo 2.x, Next 16.2, React 19.2, TypeScript 5.3, Tailwind 3.4, Vitest 4.1, Supabase (`@supabase/ssr`).

**Spec:** `docs/superpowers/specs/2026-08-13-monorepo-split-design.md`

## Global Constraints

- Package manager is `pnpm@10.2.1`. Never run `npm` or `yarn` in this repository.
- Node `>=22.0.0`. The repo pins it in `.nvmrc`.
- Shared packages are **source-only**: `main` points at TypeScript source, there is no build step, and both applications must list every shared package in `transpilePackages`.
- Package names are `@goalspace/ui`, `@goalspace/i18n`, `@goalspace/config`. Applications are `@goalspace/web` and `@goalspace/app`.
- Dev ports: `apps/web` on 3000, `apps/app` on 3001.
- Dependency direction is one-way: apps depend on packages, `i18n` depends on `ui`, `ui` depends on nothing. Never introduce a package that imports from an app.
- `apps/web` must never depend on `@supabase/*` or read a session. Task 6 adds a test that enforces this.
- Every task ends with a green `pnpm build` and `pnpm typecheck` before its commit.
- This is a structural move. Do not rename variables, reformat files, or "improve" code that is being relocated. The only rewrites are the ones each task explicitly calls for.

---

### Task 1: Workspace scaffold

Stand up pnpm workspaces and Turborepo while the application still lives at the repository root. Nothing moves. This proves the tooling works before any file is at risk.

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: `package.json` (add `turbo`, add workspace scripts)
- Modify: `.gitignore` (add `.turbo`)

**Interfaces:**
- Consumes: nothing.
- Produces: `turbo dev|build|typecheck|test|lint` as the entry points every later task relies on. Task caching keyed on the `env` lists declared here.

- [ ] **Step 1: Record the baseline build**

Run and save the output. Every later task compares against it.

```bash
pnpm install && pnpm build 2>&1 | tail -30
```

Expected: build succeeds. Note the route list it prints; Task 4 and Task 5 must reproduce it (minus the routes that intentionally move).

- [ ] **Step 2: Create the workspace manifest**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create the Turborepo config**

Create `turbo.json`. The `env` lists matter: a variable not listed here will not invalidate the cache, so a build made with the wrong Supabase key would be served from cache.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "globalEnv": ["NODE_ENV", "NEXT_PUBLIC_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "NEXT_PUBLIC_URL",
        "NEXT_PUBLIC_WEB_URL",
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_POSTHOG_KEY",
        "NEXT_PUBLIC_POSTHOG_HOST"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "test:rls": {
      "cache": false
    },
    "lint": {}
  }
}
```

- [ ] **Step 4: Add turbo and workspace scripts**

In `package.json`, add `turbo` to `devDependencies`:

```json
"turbo": "^2.5.0"
```

Leave every existing script alone for now. The root is still the application; Task 4 converts these to turbo passthroughs.

- [ ] **Step 5: Ignore the turbo cache**

Append to `.gitignore`:

```
# turborepo
.turbo
```

- [ ] **Step 6: Install and verify nothing broke**

```bash
pnpm install && pnpm build 2>&1 | tail -20
```

Expected: identical route list to Step 1. `turbo` is installed but orchestrates nothing yet, because there are no workspace members.

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml .gitignore
git commit -m "build: add pnpm workspace and turborepo scaffolding"
```

---

### Task 2: packages/config

Extract the TypeScript, Tailwind, and Prettier configuration into a workspace package that the applications extend. This package is never imported at runtime; it is consumed as config files.

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/next.json`
- Create: `packages/config/tailwind/preset.ts`
- Create: `packages/config/prettier/index.mjs`
- Modify: `tsconfig.json` (extend the base)
- Modify: `tailwind.config.ts` (consume the preset)
- Delete: `.prettierrc` (replaced by the package export)
- Modify: `package.json` (add the dependency, add a `prettier` field)

**Interfaces:**
- Consumes: the workspace from Task 1.
- Produces: `@goalspace/config/tsconfig/next.json` for app tsconfigs to extend, `@goalspace/config/tailwind/preset` as a Tailwind `presets` entry, and `@goalspace/config/prettier` as the Prettier config.

- [ ] **Step 1: Create the package manifest**

Create `packages/config/package.json`:

```json
{
  "name": "@goalspace/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/next.json": "./tsconfig/next.json",
    "./tailwind/preset": "./tailwind/preset.ts",
    "./prettier": "./prettier/index.mjs"
  },
  "devDependencies": {
    "@ianvs/prettier-plugin-sort-imports": "^4.4.0",
    "prettier-plugin-tailwindcss": "^0.6.9",
    "tailwindcss": "3.4.19",
    "tailwindcss-animate": "^1.0.7",
    "@tailwindcss/typography": "^0.5.20"
  }
}
```

- [ ] **Step 2: Create the TypeScript bases**

Create `packages/config/tsconfig/base.json` with the compiler options from the current root `tsconfig.json`, minus `paths` and `include` (those stay per-application because they are rooted at the application):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true
  }
}
```

Create `packages/config/tsconfig/next.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 3: Create the Tailwind preset**

Copy the entire current `tailwind.config.ts` into `packages/config/tailwind/preset.ts`, changing only the export shape: drop the `content` array (each application declares its own) and export a `Config` without it.

```ts
import type { Config } from 'tailwindcss';

// Everything from the previous root tailwind.config.ts except `content`.
const preset = {
  darkMode: ['class'],
  theme: {
    // ... copy verbatim from tailwind.config.ts
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
} satisfies Omit<Config, 'content'>;

export default preset;
```

Copy the `theme` block character for character. Do not tidy it. The landing redesign replaces these tokens later, and a diff that mixes relocation with retuning is unreviewable.

- [ ] **Step 4: Create the Prettier config**

Create `packages/config/prettier/index.mjs` from the current `.prettierrc`, converted from JSON to an ES module default export. Keep every option and the plugin array exactly as they are.

- [ ] **Step 5: Point the root at the package**

In `tsconfig.json`, replace the inlined `compilerOptions` with an extend, keeping `paths` and `include`:

```json
{
  "extends": "@goalspace/config/tsconfig/next.json",
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

In `tailwind.config.ts`, reduce the file to a preset consumer:

```ts
import type { Config } from 'tailwindcss';
import preset from '@goalspace/config/tailwind/preset';

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
} satisfies Config;
```

In `package.json`, add the dependency and the Prettier pointer, then delete `.prettierrc`:

```json
"devDependencies": {
  "@goalspace/config": "workspace:*"
},
"prettier": "@goalspace/config/prettier"
```

- [ ] **Step 6: Verify**

```bash
pnpm install && pnpm typecheck && pnpm build 2>&1 | tail -20
```

Expected: both pass, same route list as Task 1 Step 1. If Tailwind classes disappear from the rendered output, the `content` globs in Step 5 are wrong.

- [ ] **Step 7: Commit**

```bash
git add packages/config tsconfig.json tailwind.config.ts package.json pnpm-lock.yaml
git rm .prettierrc
git commit -m "build: extract shared tsconfig, tailwind preset, and prettier config"
```

---

### Task 3: packages/ui and packages/i18n

Extract the shared primitives and the i18n machinery, resolving every duplicate file pair in the process. The application still lives at the root and now imports from both packages.

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`
- Create: `packages/ui/src/**` (moved shadcn primitives)
- Create: `packages/i18n/package.json`, `packages/i18n/tsconfig.json`, `packages/i18n/src/index.ts`
- Create: `packages/i18n/src/**` (moved i18n machinery and locale JSON)
- Delete: `src/` (entire directory), `locales/en.json.new`, and the losing copy of each duplicate pair
- Modify: every file importing the moved modules
- Modify: `package.json`, `next.config.js`, `tailwind.config.ts`, `components.json`

**Interfaces:**
- Consumes: `@goalspace/config` from Task 2.
- Produces:
  - `@goalspace/ui` exporting the shadcn primitives, `cn(...classes: ClassValue[]): string`, `ThemeProvider`, `ThemeToggle`, `ModeToggle`, `Toaster`, and `useToast`.
  - `@goalspace/i18n` exporting `locales: string[]` (`['en','ms','zh']`), `defaultLocale: 'en'`, `i18n` (the configured i18next instance), `I18nProvider`, `LanguageProvider`, `LanguageSelector`, and `useAppTranslations()`.

- [ ] **Step 1: Identify which copy of each duplicate survives**

Four pairs exist. For each, the survivor is the copy the current build imports. Confirm with grep before deleting anything:

```bash
grep -rn "components/language-selector\|src/components/language-selector" app components lib --include=*.tsx --include=*.ts
grep -rn "providers/language-provider" app components lib src --include=*.tsx
grep -rn "hooks/use-expandable" app components lib --include=*.tsx --include=*.ts
grep -rn "auth-form" app components lib --include=*.tsx
grep -rn "locales/en.json" app components lib src --include=*.ts --include=*.tsx
```

Record the winner for each pair before proceeding:

| Pair | Survivor |
|---|---|
| `components/language-selector.tsx` vs `src/components/language-selector.tsx` | whichever is imported |
| `components/providers/language-provider.tsx` vs `src/providers/language-provider.tsx` | whichever is imported |
| `hooks/use-expandable.tsx` vs `components/hooks/use-expandable.ts` | whichever is imported |
| `components/auth-form.tsx` vs `components/auth/auth-form.tsx` | whichever is imported |
| `locales/en.json` vs `locales/en.json.new` | `locales/en.json` unless the `.new` file is a superset, in which case diff and merge |

If neither copy of a pair is imported, delete both and note it in the commit message.

- [ ] **Step 2: Create the ui package manifest**

Create `packages/ui/package.json`. Note `main` and `exports` point at TypeScript source, which is what makes this source-only:

```json
{
  "name": "@goalspace/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.tsx"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.477.0",
    "next-themes": "^0.3.0",
    "sonner": "^1.5.0",
    "cmdk": "^1.0.0",
    "vaul": "^0.9.9",
    "react-hook-form": "^7.54.2",
    "@hookform/resolvers": "^3.10.0"
  },
  "peerDependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@goalspace/config": "workspace:*"
  }
}
```

Add every `@radix-ui/*` package that the surviving primitives import. Determine the list mechanically after Step 3:

```bash
grep -rho "@radix-ui/[a-z-]*" packages/ui/src | sort -u
```

Create `packages/ui/tsconfig.json`:

```json
{
  "extends": "@goalspace/config/tsconfig/base.json",
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Move the primitives**

The rule from the spec: a component belongs in `packages/ui` only if it is a generic shadcn primitive. Move exactly these with `git mv` so history follows:

```bash
mkdir -p packages/ui/src/components
for f in accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button card \
         checkbox collapsible command context-menu dialog drawer dropdown-menu form \
         hover-card input input-otp label menubar navigation-menu pagination popover \
         progress radio-group resizable scroll-area select separator sheet skeleton \
         slider sonner switch table tabs textarea toast toaster toggle toggle-group tooltip; do
  git mv "components/ui/$f.tsx" "packages/ui/src/components/$f.tsx"
done
git mv components/ui/use-toast.ts packages/ui/src/components/use-toast.ts
git mv components/theme-provider.tsx packages/ui/src/theme-provider.tsx
git mv components/ui/theme-toggle.tsx packages/ui/src/theme-toggle.tsx
git mv components/mode-toggle.tsx packages/ui/src/mode-toggle.tsx
git mv lib/utils.ts packages/ui/src/cn.ts
```

`theme-toggle` and `mode-toggle` stay in the package even though the landing will not render them: the landing commits to a single light treatment, and theming belongs to the workspace.

Everything else in `components/ui/` stays where it is for now and moves with the application in Task 4: `animated-hero`, `bento-grid`, `border-beam`, `chart`, `circular-progress`, `color-system-demo`, `carousel`, `embla`-based files, `expandable-card`, `fancy-button`, `faq-section`, `feature-block-animated-card`, `activity-card`, `question-card`, `placeholders-and-vanish-input` and its demo, `sidebar`.

- [ ] **Step 4: Fix intra-package imports**

Every moved primitive imports `cn` from `@/lib/utils`. Inside the package that path does not exist. Rewrite them:

```bash
cd packages/ui
grep -rl "@/lib/utils" src | xargs sed -i '' "s|from '@/lib/utils'|from '../cn'|g"
grep -rl "@/components/ui/" src/components | xargs sed -i '' "s|@/components/ui/|./|g"
cd ../..
```

Then check for stragglers, which must return nothing:

```bash
grep -rn "@/" packages/ui/src
```

- [ ] **Step 5: Write the ui barrel export**

Create `packages/ui/src/index.ts`. List every primitive explicitly rather than using a wildcard, so a consumer's import failure names the missing thing:

```ts
export { cn } from './cn';
export { ThemeProvider } from './theme-provider';
export { ThemeToggle } from './theme-toggle';
export { ModeToggle } from './mode-toggle';

export * from './components/accordion';
export * from './components/alert';
export * from './components/alert-dialog';
export * from './components/avatar';
export * from './components/badge';
export * from './components/button';
export * from './components/card';
export * from './components/checkbox';
export * from './components/collapsible';
export * from './components/command';
export * from './components/dialog';
export * from './components/drawer';
export * from './components/dropdown-menu';
export * from './components/form';
export * from './components/input';
export * from './components/label';
export * from './components/navigation-menu';
export * from './components/popover';
export * from './components/progress';
export * from './components/radio-group';
export * from './components/scroll-area';
export * from './components/select';
export * from './components/separator';
export * from './components/sheet';
export * from './components/skeleton';
export * from './components/sonner';
export * from './components/switch';
export * from './components/table';
export * from './components/tabs';
export * from './components/textarea';
export * from './components/toast';
export * from './components/toaster';
export * from './components/tooltip';
export * from './components/use-toast';
```

Add the remaining moved primitives to this list. If two primitives export the same symbol, TypeScript will error at build; resolve by exporting that one via a namespace rather than renaming the component.

- [ ] **Step 6: Create the i18n package**

Create `packages/i18n/package.json`:

```json
{
  "name": "@goalspace/i18n",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "i18next": "^24.2.3",
    "i18next-browser-languagedetector": "^8.0.4",
    "i18next-http-backend": "^3.0.2",
    "react-i18next": "^15.4.1",
    "@goalspace/ui": "workspace:*"
  },
  "peerDependencies": {
    "next": "^16.2.12",
    "react": "^19.2.8"
  },
  "devDependencies": {
    "@goalspace/config": "workspace:*"
  }
}
```

Create `packages/i18n/tsconfig.json` extending `@goalspace/config/tsconfig/base.json` with `"resolveJsonModule": true` already inherited, including `src/**/*`.

- [ ] **Step 7: Move the i18n machinery**

```bash
mkdir -p packages/i18n/src/locales
git mv locales/en.json packages/i18n/src/locales/en.json
git mv locales/ms.json packages/i18n/src/locales/ms.json
git mv locales/zh.json packages/i18n/src/locales/zh.json
git mv lib/i18n.ts packages/i18n/src/i18n.ts
git mv lib/hooks/use-translations.ts packages/i18n/src/use-translations.ts
git mv components/providers/i18n-provider.tsx packages/i18n/src/i18n-provider.tsx
git mv types/i18next.d.ts packages/i18n/src/i18next.d.ts
git rm locales/en.json.new
```

Move the surviving copy of `language-provider` and `language-selector` (from Step 1) into `packages/i18n/src/`, then delete the entire `src/` directory:

```bash
git rm -r src
```

In `packages/i18n/src/i18n.ts`, fix the three locale imports, which currently reach up one directory:

```ts
import enTranslation from './locales/en.json';
import msTranslation from './locales/ms.json';
import zhTranslation from './locales/zh.json';
```

- [ ] **Step 8: Move the locale list out of middleware**

`middleware.ts` currently declares `locales` and `defaultLocale`, which both applications would otherwise need to duplicate. Create `packages/i18n/src/locales.ts`:

```ts
export const locales = ['en', 'ms', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
```

In `middleware.ts`, delete the two declarations at the top of the file and import them instead:

```ts
import { locales, defaultLocale } from '@goalspace/i18n';
```

Every other line of `middleware.ts` stays as it is. It is rewritten in Tasks 4 and 5.

- [ ] **Step 9: Write the i18n barrel export**

Create `packages/i18n/src/index.ts`:

```ts
export { locales, defaultLocale, isLocale, type Locale } from './locales';
export { default as i18n } from './i18n';
export { default as I18nProvider } from './i18n-provider';
export { useAppTranslations } from './use-translations';
export { LanguageProvider } from './language-provider';
export { LanguageSelector } from './language-selector';
```

Match the export style of the surviving `language-provider` and `language-selector` files. If they are default exports, use `export { default as X }`.

- [ ] **Step 10: Repoint every consumer**

```bash
grep -rl "@/components/ui/\|@/lib/utils\|@/lib/i18n\|@/lib/hooks/use-translations\|@/components/providers/i18n-provider\|@/components/theme-provider" app components lib hooks utils \
  --include=*.ts --include=*.tsx
```

For each file, replace the moved imports with package imports, merging multiple primitive imports into one statement:

```ts
// before
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// after
import { Button, Card, CardContent, cn } from '@goalspace/ui';
```

```ts
// before
import { useAppTranslations } from '@/lib/hooks/use-translations';
import I18nProvider from '@/components/providers/i18n-provider';

// after
import { useAppTranslations, I18nProvider } from '@goalspace/i18n';
```

- [ ] **Step 11: Wire the packages into the root application**

In `package.json` add both to `dependencies`:

```json
"@goalspace/ui": "workspace:*",
"@goalspace/i18n": "workspace:*"
```

In `next.config.js`, add the transpile list to `nextConfig`:

```js
transpilePackages: ['@goalspace/ui', '@goalspace/i18n'],
```

In `tailwind.config.ts`, extend `content` so package classes are not purged:

```ts
content: [
  './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
  '../../packages/i18n/src/**/*.{ts,tsx}',
],
```

Because the application is still at the repository root in this task, use `./packages/*/src/**/*.{ts,tsx}` here and change it to the `../../` form when it moves in Task 4.

In `components.json`, point the shadcn aliases at the package so future `shadcn add` runs land correctly:

```json
"aliases": {
  "components": "@goalspace/ui",
  "utils": "@goalspace/ui"
}
```

- [ ] **Step 12: Verify**

```bash
pnpm install && pnpm typecheck
```

Expected: passes. The most likely failure is a missing `@radix-ui/*` dependency in `packages/ui/package.json`; add whatever the error names.

```bash
pnpm build 2>&1 | tail -20
```

Expected: same route list as Task 1 Step 1.

Then start the dev server and confirm the landing page still renders with styles, and that switching language still works:

```bash
pnpm dev
```

Visit `http://localhost:3000/en` and `http://localhost:3000/ms`. If components render unstyled, the Tailwind `content` globs in Step 11 are wrong.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor: extract @goalspace/ui and @goalspace/i18n packages

Resolves the duplicate file pairs that could not both survive the move:
src/ is deleted in favour of the imported copies, and locales/en.json.new
is dropped. The locale list moves out of middleware.ts so both future
applications can share it."
```

---

### Task 4: apps/web

Relocate the entire application into `apps/web`. Nothing is deleted and no behaviour changes: auth still works here, and Task 5 extracts it. Moving everything first and extracting second is cheaper than moving twice, because the current application is mostly marketing already.

**Files:**
- Move: `app/`, `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `config/`, `public/`, `styles/`, `middleware.ts`, `next.config.js`, `postcss.config.js`, `tailwind.config.ts`, `tsconfig.json`, `next-env.d.ts`, `components.json`, `vitest.config.ts`, `tests/`, `supabase/` into `apps/web/`
- Create: `apps/web/package.json`
- Modify: root `package.json` (reduce to workspace root)
- Delete: root `vercel.json`, `middleware-auth.ts`, `tsconfig.tsbuildinfo`

**Interfaces:**
- Consumes: `@goalspace/ui`, `@goalspace/i18n`, `@goalspace/config`.
- Produces: `apps/web` as a workspace member named `@goalspace/web` running on port 3000, with `dev`, `build`, `typecheck`, `test`, and `test:rls` scripts that turbo discovers.

- [ ] **Step 1: Move the application**

```bash
mkdir -p apps/web
for p in app components hooks lib utils types config public styles tests supabase \
         middleware.ts next.config.js postcss.config.js tailwind.config.ts \
         tsconfig.json next-env.d.ts components.json vitest.config.ts; do
  git mv "$p" "apps/web/$p"
done
git rm -f middleware-auth.ts
rm -f tsconfig.tsbuildinfo
```

`middleware-auth.ts` is an 84-byte orphan that nothing imports; confirm with `grep -rn "middleware-auth" .` before removing it.

- [ ] **Step 2: Move the environment files**

The env files are gitignored but the application will not run without them:

```bash
mv .env.local .env.development .env.preview .env.production .env.test apps/web/ 2>/dev/null
cp .env.example apps/web/.env.example
```

Keep `.env.example` at the root for now; Task 6 splits it per application.

- [ ] **Step 3: Create the application manifest**

Create `apps/web/package.json`. Move every dependency from the root `package.json` except `turbo` and the shared devDependencies:

```json
{
  "name": "@goalspace/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "test": "vitest run tests/unit",
    "test:watch": "vitest tests/unit",
    "test:rls": "vitest run tests/rls"
  },
  "dependencies": {
    "@goalspace/ui": "workspace:*",
    "@goalspace/i18n": "workspace:*"
  },
  "devDependencies": {
    "@goalspace/config": "workspace:*"
  }
}
```

Then move the dependency lists across wholesale. Everything the application uses, including `next`, `react`, `react-dom`, `@supabase/*`, `zod`, `framer-motion`, `date-fns`, `recharts`, and the markdown stack, moves to `apps/web`.

**The rule for the shared packages' dependencies: if `apps/web` imports a package directly in its own source, `apps/web` declares it, even when `packages/ui` or `packages/i18n` also declares it.** Both declaring the same dependency is correct, not duplication.

A dependency may only be dropped from `apps/web` when nothing under `apps/web` imports it directly. Verify per package rather than assuming, because `.npmrc` sets `shamefully-hoist=true`, which resolves undeclared imports through another workspace package's `node_modules`. That makes a phantom dependency build green today and break the moment hoisting is tightened:

```bash
for pkg in $(cat /tmp/dropped-deps.txt); do
  hits=$(grep -rl "from '$pkg\|require('$pkg" apps/web --include=*.ts --include=*.tsx | wc -l)
  [ "$hits" -gt 0 ] && echo "KEEP $pkg ($hits files)"
done
```

In practice `lucide-react`, `class-variance-authority`, `next-themes`, and `@radix-ui/react-icons` are all imported directly by application code and must stay declared here despite living in `packages/ui` too.

- [ ] **Step 4: Reduce the root manifest**

Rewrite the root `package.json` as a workspace root with no application dependencies:

```json
{
  "name": "goalspace",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "start": "turbo start",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:rls": "turbo test:rls",
    "lint": "turbo lint",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@goalspace/config": "workspace:*",
    "prettier": "^3.4.2",
    "turbo": "^2.5.0"
  },
  "prettier": "@goalspace/config/prettier",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@10.2.1"
}
```

- [ ] **Step 5: Fix the relative paths that the move broke**

In `apps/web/tailwind.config.ts`, the package globs must now climb two levels:

```ts
content: [
  './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
  '../../packages/i18n/src/**/*.{ts,tsx}',
],
```

In `apps/web/vitest.config.ts`, the `@` alias still resolves relative to the config file, so it is already correct. Confirm the `.env.test` load in `apps/web/tests/helpers/supabase.ts` still finds the file: `config({ path: '.env.test' })` resolves against the process working directory, which is now `apps/web` when tests run through the package script. No change needed, but this is the line to check first if the RLS suite cannot connect.

- [ ] **Step 6: Delete the root Vercel config**

```bash
git rm vercel.json
```

Its `buildCommand`, `outputDirectory`, and hardcoded `NEXT_PUBLIC_URL=https://goalspace.vercel.app` are all wrong for a monorepo. Task 6 writes per-application replacements.

- [ ] **Step 7: Verify**

```bash
pnpm install
pnpm typecheck
pnpm build 2>&1 | tail -25
```

Expected: turbo now reports one package (`@goalspace/web`) and the route list matches Task 1 Step 1 exactly.

```bash
pnpm test
```

Expected: the unit suite passes, same count as before the move.

- [ ] **Step 8: Verify the RLS suite still connects**

The RLS suite needs local Supabase running:

```bash
cd apps/web && pnpm supabase start && pnpm test:rls; cd ../..
```

Expected: identical pass/fail output to before the move. If it cannot reach the database, the cause is the `.env.test` path from Step 5.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: move the application into apps/web

Pure relocation. Auth, Supabase, and the tests move too and are extracted
into apps/app in the next commit. The root package.json becomes a workspace
root with no application dependencies."
```

---

### Task 5: apps/app

Extract the workspace application. This is the task with real rewrites: two middlewares replace one, the `[locale]` segment disappears from the app, and the landing's navigation loses its session listener.

**Files:**
- Create: `apps/app/` (package manifest, configs, `app/layout.tsx`, `app/page.tsx`, `app/login/page.tsx`, `middleware.ts`)
- Move: `apps/web/app/auth/`, `apps/web/utils/supabase/`, `apps/web/types/supabase.ts`, `apps/web/lib/auth.ts`, `apps/web/components/login-form.tsx`, `apps/web/components/auth/`, `apps/web/supabase/`, `apps/web/tests/`, `apps/web/vitest.config.ts` into `apps/app/`
- Rewrite: `apps/web/middleware.ts`, `apps/web/components/main-nav.tsx`
- Create: `packages/i18n/src/cookie-locale.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 through 4.
- Produces:
  - `@goalspace/app` on port 3001, routes `/login`, `/auth/callback`, `/`.
  - `packages/i18n` additionally exports `NEXT_LOCALE_COOKIE: 'NEXT_LOCALE'` and `localeFromCookie(value: string | undefined): Locale`.
  - `apps/web` with zero `@supabase/*` imports.

- [ ] **Step 1: Create the application skeleton**

Create `apps/app/package.json`:

```json
{
  "name": "@goalspace/app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "typecheck": "tsc --noEmit",
    "test": "vitest run tests/unit",
    "test:watch": "vitest tests/unit",
    "test:rls": "vitest run tests/rls",
    "db:start": "supabase start",
    "db:reset": "supabase db reset"
  },
  "dependencies": {
    "@goalspace/ui": "workspace:*",
    "@goalspace/i18n": "workspace:*",
    "@supabase/ssr": "^0.12.4",
    "@supabase/supabase-js": "^2.111.0",
    "next": "^16.2.12",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@goalspace/config": "workspace:*",
    "@types/node": "^20.6.2",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "autoprefixer": "10.4.15",
    "dotenv": "^16.4.7",
    "postcss": "8.4.30",
    "supabase": "^2.2.1",
    "tailwindcss": "3.4.19",
    "typescript": "^5.3.3",
    "vitest": "^4.1.10",
    "@vitest/coverage-v8": "^4.1.10"
  }
}
```

Copy `apps/web/postcss.config.js`, `apps/web/tsconfig.json`, and `apps/web/tailwind.config.ts` to `apps/app/`, then in the copied `tailwind.config.ts` set `content` to `./app/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`, and the same two `../../packages/*` globs.

Create `apps/app/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ['@goalspace/ui', '@goalspace/i18n'],
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
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

- [ ] **Step 2: Move the auth and database surface**

```bash
mkdir -p apps/app/app apps/app/components apps/app/lib apps/app/utils apps/app/types
git mv apps/web/app/auth apps/app/app/auth
git mv apps/web/utils/supabase apps/app/utils/supabase
git mv apps/web/types/supabase.ts apps/app/types/supabase.ts
git mv apps/web/lib/auth.ts apps/app/lib/auth.ts
git mv apps/web/components/login-form.tsx apps/app/components/login-form.tsx
git mv apps/web/components/auth-form.tsx apps/app/components/auth-form.tsx
git mv apps/web/components/auth apps/app/components/auth
git mv apps/web/components/dev apps/app/components/dev
git mv apps/web/supabase apps/app/supabase
git mv apps/web/tests apps/app/tests
git mv apps/web/vitest.config.ts apps/app/vitest.config.ts
git mv "apps/web/app/[locale]/login" apps/app/app/login
mv apps/web/.env.test apps/app/.env.test 2>/dev/null
```

`components/auth-form.tsx` sits at the root of `components/`, not under `components/auth/`. Task 3 resolved a collision in which both copies were live: it kept the root-level one, deleted `components/auth/auth-form.tsx`, and repointed `auth-dialog.tsx` at the survivor. Missing this file strands a `@supabase` importer in the landing, which Task 6's boundary test then fails on.

`components/dev/token-alert.tsx` moves because it is a development aid for the authenticated surface. If grep shows the landing imports it, leave it in `apps/web` instead.

`utils/supabase/middleware.ts` imports `../../types/supabase`, which still resolves after the move because both moved together. Confirm with a grep for `types/supabase` under `apps/app`.

- [ ] **Step 3: Add cookie-based locale reading to packages/i18n**

The app has no `[locale]` segment, so `I18nProvider` cannot read the locale from `useParams()`. Create `packages/i18n/src/cookie-locale.ts`:

```ts
import { defaultLocale, isLocale, type Locale } from './locales';

export const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeFromCookie(value: string | undefined): Locale {
  if (value && isLocale(value)) return value;
  return defaultLocale;
}
```

Export both from `packages/i18n/src/index.ts`:

```ts
export { NEXT_LOCALE_COOKIE, localeFromCookie } from './cookie-locale';
```

- [ ] **Step 4: Write the app root layout**

Create `apps/app/app/layout.tsx`. It reads the locale from the cookie rather than from a route param, and unlike the landing it does mount the theme provider:

```tsx
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@goalspace/ui';
import { I18nProvider, NEXT_LOCALE_COOKIE, localeFromCookie } from '@goalspace/i18n';

import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = localeFromCookie(cookieStore.get(NEXT_LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```

Copy `apps/web/app/globals.css` to `apps/app/app/globals.css`.

- [ ] **Step 5: Teach I18nProvider to accept an explicit locale**

`packages/i18n/src/i18n-provider.tsx` currently derives the locale from `useParams()`, which returns nothing in the app. Add an optional prop that takes precedence, leaving the param path intact for the landing:

```tsx
interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
}

export default function I18nProvider({ children, locale: localeProp }: I18nProviderProps) {
  const params = useParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const locale = localeProp ?? (params?.locale as string | undefined);

    if (locale && i18n.language !== locale) {
      i18n
        .changeLanguage(locale)
        .then(() => setIsReady(true))
        .catch(() => setIsReady(true));
    } else {
      setIsReady(true);
    }
  }, [params, localeProp]);

  // ... rest of the component unchanged
}
```

- [ ] **Step 6: Write the app middleware**

Create `apps/app/middleware.ts`. Auth only, no locale handling:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from './utils/supabase/middleware';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname === `${p}/` || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabase, supabaseResponse } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

Use `getUser()` rather than `getSession()`. `getSession()` reads the cookie without verifying it against the auth server, which is what the old root middleware did.

- [ ] **Step 7: Write the app index route**

Create `apps/app/app/page.tsx` as a temporary redirect target. The Phase 1 plan builds the real `/projects` surface later:

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/projects');
}
```

Until `/projects` exists, point this at `/login` instead and leave a comment naming the Phase 1 task that replaces it.

- [ ] **Step 8: Fix the moved login page**

`apps/app/app/login/page.tsx` came from `app/[locale]/login/page.tsx`. Remove any `params.locale` usage and any locale-prefixed links. Its post-login redirect target is `returnUrl` from the query string, falling back to `/`.

- [ ] **Step 9: Strip auth from the landing middleware**

Replace `apps/web/middleware.ts` entirely. Locale only:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale, NEXT_LOCALE_COOKIE } from '@goalspace/i18n';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(NEXT_LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as never)) return cookieLocale;

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2))
      .find((lang) => locales.includes(lang as never));
    if (preferred) return preferred;
  }

  return defaultLocale;
}

function withLocaleCookie(response: NextResponse, locale: string): NextResponse {
  response.cookies.set(NEXT_LOCALE_COOKIE, locale, { maxAge: COOKIE_MAX_AGE, path: '/' });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? '';

  if (locales.includes(firstSegment as never)) {
    return withLocaleCookie(NextResponse.next(), firstSegment);
  }

  const locale = getLocale(request);
  const target = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
  return withLocaleCookie(NextResponse.redirect(target), locale);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

The Supabase client, the session check, the `isPublicPage` allowlist, the `isLocalePathPublic` list, the login-route special case, and every `console.log` are gone. The matcher's `.*\\..*` clause replaces the old hand-maintained file-extension checks.

- [ ] **Step 10: Rewrite the landing navigation**

`apps/web/components/main-nav.tsx` currently creates a Supabase client, subscribes to `onAuthStateChange`, renders a sign-out button, and mounts `AuthDialog`. None of that can work in an application with no Supabase dependency. Replace the auth section with a link:

```tsx
'use client';

import Link from 'next/link';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  cn,
} from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export function MainNav({
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, 'defaultValue' | 'dir'>) {
  const { t, currentLocale } = useAppTranslations();

  return (
    <>
      <NavigationMenu className={cn('hidden md:flex', className)} {...props}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href={`/${currentLocale}/blog`} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                {t('navigation.blog')}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex items-center gap-4">
        <a
          href={`${APP_URL}/login`}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          {t('auth.signIn')}
        </a>
        <a
          href={`${APP_URL}/auth`}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          {t('auth.signUp')}
        </a>
      </div>
    </>
  );
}
```

Use `<a>` rather than `<Link>`: these are cross-origin navigations and Next's client router cannot handle them.

Two links, not one. Sign in goes to `/login`, which handles password and OAuth sign-in; sign up goes to `/auth`, which is the only surface that currently creates an account. Consolidating the two into a single page is Phase 1 work, deliberately not done here. Add an `auth.signUp` key to the three locale files in `packages/i18n` if one does not already exist.

- [ ] **Step 11: Remove the remaining Supabase references from the landing**

```bash
grep -rn "@supabase\|utils/supabase\|AuthDialog\|auth-form" apps/web --include=*.ts --include=*.tsx
```

Every hit must be resolved by deleting the file or the import. Then remove `@supabase/ssr`, `@supabase/supabase-js`, and `@supabase/auth-helpers-nextjs` from `apps/web/package.json`.

`@supabase/auth-helpers-nextjs` is deprecated and was only used by the old root middleware. It should now appear in neither application's dependencies.

- [ ] **Step 12: Add the web env passthrough**

In `apps/web/next.config.js`, replace the `env` block:

```js
env: {
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
},
```

Add `transpilePackages` if Task 3 Step 11 has not already been carried into this file.

- [ ] **Step 13: Verify both applications build**

```bash
pnpm install && pnpm typecheck && pnpm build 2>&1 | tail -30
```

Expected: turbo reports two packages. `@goalspace/web` shows the marketing routes with no `/login`; `@goalspace/app` shows `/`, `/login`, and `/auth/callback`.

- [ ] **Step 14: Verify the tests still pass in their new home**

```bash
cd apps/app && pnpm db:start && pnpm test && pnpm test:rls; cd ../..
```

Expected: identical output to Task 4 Step 8. The RLS suite is the one that proves the move did not disturb the database work.

- [ ] **Step 15: Smoke-test both applications**

```bash
pnpm dev
```

Check, in order:

1. `http://localhost:3000/` redirects to `/en/`.
2. The landing renders with styles and the language selector still switches locale.
3. The nav's sign-in control navigates to `http://localhost:3001/login`.
4. `http://localhost:3001/projects` redirects to `/login?returnUrl=/projects` when signed out.
5. Signing in at `http://localhost:3001/login` succeeds and lands on the app.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "refactor: extract apps/app and strip auth from the landing

Two middlewares replace the interleaved one: the landing keeps locale
detection only, the app keeps auth only and verifies sessions with
getUser() rather than the unverified getSession(). The app drops the
[locale] segment and reads the locale from the NEXT_LOCALE cookie.
main-nav loses its session listener and links to the app instead."
```

---

### Task 6: Deployment, CI, and the boundary test

Lock the split in place so it cannot silently regress, and configure the two Vercel projects.

**Files:**
- Create: `apps/web/vercel.json`, `apps/app/vercel.json`
- Create: `apps/web/.env.example`, `apps/app/.env.example`
- Create: `apps/web/tests/unit/boundaries.test.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `.github/workflows/ci.yml`
- Delete: root `.env.example`

**Interfaces:**
- Consumes: both applications from Task 5.
- Produces: a failing test if `apps/web` ever gains a Supabase dependency; CI on every pull request.

- [ ] **Step 1: Write the failing boundary test**

`apps/web` lost its Vitest config when `vitest.config.ts` moved to `apps/app` in Task 5. Create `apps/web/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
```

Create `apps/web/tests/unit/boundaries.test.ts`. This test is the enforcement mechanism for the claim that the landing cannot read a session:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'tests') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('marketing site boundaries', () => {
  it('declares no supabase dependency', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const supabase = Object.keys(deps).filter((d) => d.startsWith('@supabase/') || d === 'supabase');
    expect(supabase).toEqual([]);
  });

  it('imports nothing from supabase in any source file', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const offenders = sourceFiles(root).filter((file) =>
      /@supabase\/|utils\/supabase/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it passes**

```bash
cd apps/web && pnpm test; cd ../..
```

Expected: PASS. If it fails, Task 5 Step 11 was incomplete, and the failure names the exact file still importing Supabase. This test is written after the fact rather than before because the behaviour it guards was produced by a move, not by new code; its job is to keep the boundary from eroding.

- [ ] **Step 3: Split the env example**

Create `apps/web/.env.example`:

```
# Environment
NEXT_PUBLIC_ENV=development

# Cross-application links
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

Create `apps/app/.env.example`:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Environment
NEXT_PUBLIC_ENV=development

# Cross-application links
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

```bash
git rm .env.example
```

Everything dropped belongs to the deleted product: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, the Upstash Redis and Vector credentials, the six AI provider keys, and the `NEXT_PUBLIC_ENABLE_CHAT` / `NEXT_PUBLIC_ENABLE_SKILL_TREE` / `NEXT_PUBLIC_SKIP_API_CALL` flags. Before deleting each one, confirm nothing reads it:

```bash
grep -rn "NEXTAUTH\|UPSTASH\|SKIP_API_CALL\|ENABLE_CHAT\|ENABLE_SKILL_TREE" apps packages
```

- [ ] **Step 4: Write the Vercel configs**

Create `apps/web/vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "regions": ["iad1"],
  "cleanUrls": true,
  "ignoreCommand": "npx turbo-ignore @goalspace/web"
}
```

Create `apps/app/vercel.json` with the same shape and `npx turbo-ignore @goalspace/app`.

Neither file sets `env`. Environment variables belong in the Vercel project settings, not in a committed file, which is also why the old root `vercel.json` hardcoding `NEXT_PUBLIC_URL` was wrong.

- [ ] **Step 5: Write the CI workflow**

Create `.github/workflows/ci.yml`. The RLS suite is excluded because it needs a live Supabase instance:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 10.2.1

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck

      - run: pnpm test

      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
          NEXT_PUBLIC_WEB_URL: https://goalspace.com
          NEXT_PUBLIC_APP_URL: https://app.goalspace.com
```

The placeholder Supabase values exist because the build must not require real credentials. If the build fails without them, something reads the database at build time, which is a bug worth fixing rather than working around.

- [ ] **Step 6: Verify the whole workspace one final time**

```bash
pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build 2>&1 | tail -30
```

Expected: all green, two applications built.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: per-app vercel config, split env examples, CI, boundary test

The boundary test fails if apps/web ever gains a Supabase dependency or
import, which is what keeps the landing statically renderable."
```

- [ ] **Step 8: Configure Vercel (manual, outside the repository)**

Not automatable from here. In the Vercel dashboard:

1. Create two projects from this repository.
2. Set root directories to `apps/web` and `apps/app`.
3. Enable "Include files outside root directory" on both, or the workspace packages will not resolve.
4. Set environment variables per `apps/*/env.example`, with `NEXT_PUBLIC_WEB_URL=https://goalspace.com` and `NEXT_PUBLIC_APP_URL=https://app.goalspace.com` in production.
5. Deploy both and verify by preview URL **before** pointing DNS at either.
6. Assign `goalspace.com` to the web project and `app.goalspace.com` to the app project.

- [ ] **Step 9: Amend the Phase 1 plan**

`docs/superpowers/plans/2026-07-30-phase1-foundation.md` references paths that no longer exist. Update Task 7 onward:

- `app/[locale]/(workspace)/projects/...` becomes `apps/app/app/projects/...`
- `lib/db/*`, `lib/schemas/*`, `lib/work-items/*` become `apps/app/lib/...`
- `supabase/migrations/*` becomes `apps/app/supabase/migrations/*`
- `tests/*` becomes `apps/app/tests/*`

Tasks 0 through 6 are complete; annotate them with a note that their paths are historical rather than rewriting them.

```bash
git add docs/superpowers/plans/2026-07-30-phase1-foundation.md
git commit -m "docs: repoint the phase 1 plan at the monorepo layout"
```

---

## Verification checklist

Run before considering the split done:

- [ ] `pnpm install --frozen-lockfile` succeeds from a clean `node_modules`
- [ ] `pnpm typecheck` passes for both applications and all three packages
- [ ] `pnpm build` produces two `.next` outputs
- [ ] `pnpm test` passes, including the boundary test
- [ ] `pnpm test:rls` passes against local Supabase, with the same result as before the split
- [ ] `grep -rn "@supabase" apps/web` returns nothing
- [ ] `grep -rn "\[locale\]" apps/app` returns nothing
- [ ] The landing sign-in control reaches the app's login page
- [ ] An anonymous request to an app route redirects to `/login?returnUrl=...`
- [ ] Both Vercel preview deployments render correctly before DNS is switched

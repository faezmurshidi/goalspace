# Workspace Dashboard — Slice B (Documents) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a person create, read, edit and roll back documents — closing the gap where an agent can propose edits to documents nobody can author.

**Architecture:** The write path already exists from phase 2b: `updateDocument` calls `apply_document_edit`, a Postgres function that takes a row lock, checks the version, records the body being replaced as a revision, and writes the new one. This slice adds authorship to those revisions, a read path for them, and three routes — list, editor, and a read-only revision view that carries the restore action. Every save is a compare-and-set on the version the editor loaded, so two tabs cannot silently overwrite each other.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres + RLS) · zod · Vitest.

**Spec:** [2026-08-26-workspace-dashboard-design.md](../specs/2026-08-26-workspace-dashboard-design.md) — slice B of §9, specified in §6.1.

## Global Constraints

- **Workshop Manual skin.** Hairline rules, no elevation, no rounded containers, no cards. Tokens: `paper` / `paper-shade` / `ink` / `ink-soft` / `rule` / `rule-strong`, `oxide` for the active or current state. Text labels, not icons.
- **Nothing is advertised that does not exist.** This slice adds exactly one destination — Documents. Agents and Settings arrive with slices C and D.
- **A count of zero renders nothing.** No streaks, no badges in the achievement sense, no progress celebration.
- **Strings are i18n keys, never prose**, and every new key lands in `en`, `ms` and `zh`. Layouts must survive strings roughly 40% longer than the English.
- **WCAG 2.1 AA.** Every form control has a label. Status is never colour alone. Body measure capped at 65–75 characters for document prose.
- **`apps/app` has no component-test infrastructure** — vitest runs `environment: 'node'` with `include: ['tests/**/*.test.ts']`, and there is no jsdom or testing-library. Do not add any. Test pure logic and the database layer; verify components with `pnpm typecheck && pnpm build`.
- **RLS is the boundary.** Every query is owner-scoped by policy. Do not add a service-role path.
- **Node 22+.** This machine defaults to Node 20; run `source ~/.nvm/nvm.sh && nvm use 22` first and invoke pnpm as `corepack pnpm`, or every command fails on `engines.node`.
- **`trailingSlash: true`** is set in `next.config.js`. Any path comparison must tolerate a trailing slash — this already bit slice A.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/app/supabase/migrations/20260827000100_revision_authorship.sql` | `document_revisions.agent_id`, and `apply_document_edit` recording it. |
| `apps/app/lib/db/documents.ts` | **Modify** — `listRevisions`, `getRevision`, and `DocumentRevision`. |
| `apps/app/lib/shell/destinations.ts` | **Modify** — the Documents destination. |
| `apps/app/lib/documents/authorship.ts` | Pure. Revision rows → who wrote each body. |
| `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx` | The list, and the control that creates one. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx` | The editor and its revision history. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/document-editor.tsx` | Client. Title and body fields, save, conflict reporting. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/page.tsx` | One revision, read-only. |
| `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/restore-button.tsx` | Client. The restore action on that view. |
| `apps/app/app/(workspace)/actions.ts` | **Modify** — create, update and restore actions. |
| `packages/i18n/src/locales/{en,ms,zh}.json` | **Modify** — the `app.documents` namespace. |
| `apps/app/tests/unit/document-authorship.test.ts` | Pure authorship logic. |
| `apps/app/tests/unit/shell-destinations.test.ts` | **Modify** — Documents joins the destination set. |
| `apps/app/tests/rls/documents-history.test.ts` | Revision authorship and the compare-and-set, against a real database. |

**Why a migration.** §6.1 says the history shows "when, and who — an `agent_id` or the owner". `document_revisions` has no `agent_id` (columns: `id`, `document_id`, `project_id`, `owner_id`, `title`, `body`, `created_at`). A revision stores the body being *replaced*, whose author was `documents.agent_id` at the moment of replacement — and that is currently discarded. Without Task 1 the spec's "who" is unimplementable.

**Why the database test.** Authorship and the compare-and-set are behaviours of a Postgres function holding a row lock. A stubbed client would only prove the stub agrees with the code, which is the same reasoning that put phase 2b's apply tests in `tests/rls/`.

---

## Task 1: Revision authorship

**Files:**
- Create: `apps/app/supabase/migrations/20260827000100_revision_authorship.sql`
- Modify: `apps/app/lib/db/documents.ts`
- Modify: `apps/app/types/supabase.ts` (regenerated, never hand-edited)

**Interfaces:**
- Produces: `type DocumentRevision`, `listRevisions(supabase, projectId, documentId): Promise<DocumentRevision[]>`, `getRevision(supabase, projectId, revisionId): Promise<DocumentRevision | null>`.

- [ ] **Step 1: Write the migration**

```sql
-- apps/app/supabase/migrations/20260827000100_revision_authorship.sql
--
-- Who wrote the body a revision preserves.
--
-- A revision records the body being *replaced*, so its author is whoever wrote
-- that body — `documents.agent_id` at the moment of replacement. That was
-- discarded, which left the history able to say when a body changed but never
-- who had written the one that went away.
--
-- Nullable, and null means human-authored, exactly as on documents, entries and
-- work_items. Existing rows stay null: we genuinely do not know, and inventing
-- an author would be worse than admitting it.
alter table document_revisions
  add column agent_id uuid references agents(id) on delete set null;

comment on column document_revisions.agent_id is
  'Author of the body this revision preserves. Null means human-authored.';

-- The function is replaced whole rather than patched, because a `create or
-- replace` of a plpgsql body is all-or-nothing and a partial edit is not a
-- thing Postgres offers. Only the revision insert changes: it now carries
-- v_current.agent_id, the author of the body being replaced.
create or replace function apply_document_edit(
  p_document_id         uuid,
  p_project_id          uuid,
  p_owner_id            uuid,
  p_agent_id            uuid,
  p_expected_updated_at timestamptz,
  p_title               text,
  p_body                text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.documents%rowtype;
begin
  -- The lock is the whole mechanism. A concurrent edit waits here rather than
  -- racing ahead to insert a revision it will not earn.
  select * into v_current
    from public.documents
   where id = p_document_id and project_id = p_project_id
     for update;

  if not found then return null; end if;

  if p_expected_updated_at is not null and v_current.updated_at <> p_expected_updated_at then
    return null;
  end if;

  insert into public.document_revisions
    (document_id, project_id, owner_id, title, body, agent_id)
  values
    (v_current.id, p_project_id, p_owner_id, v_current.title, v_current.body,
     v_current.agent_id);

  update public.documents
     set title      = coalesce(p_title, title),
         body       = coalesce(p_body, body),
         agent_id   = p_agent_id,
         updated_at = now()
   where id = p_document_id;

  return p_document_id;
end;
$$;
```

- [ ] **Step 2: Replay every migration from scratch**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd apps/app && corepack pnpm db:start && corepack pnpm db:reset
```

Expected: every migration applies in order, including this one, with no error.

- [ ] **Step 3: Regenerate types**

```bash
cd apps/app && corepack pnpm exec supabase gen types typescript --local > types/supabase.ts
```

Do not hand-edit the result. If a generated type is awkward at a call site, put the cast in a typed wrapper in `lib/db/`, the way `startAgentRun` does — a hand edit here is silently reverted by the next regeneration.

- [ ] **Step 4: Add the read path**

Append to `apps/app/lib/db/documents.ts`:

```typescript
export type DocumentRevision = Tables<'document_revisions'>;

const REVISION_COLUMNS = 'id, document_id, project_id, owner_id, title, body, agent_id, created_at';

/**
 * A document's history, newest first.
 *
 * Each row is a body that was replaced, so the list reads as "what it said
 * before" — the newest revision is the body immediately prior to the current
 * one, not the current one itself.
 */
export async function listRevisions(
  supabase: Client,
  projectId: string,
  documentId: string
): Promise<DocumentRevision[]> {
  const { data, error } = await supabase
    .from('document_revisions')
    .select(REVISION_COLUMNS)
    .eq('project_id', projectId)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRevision[];
}

export async function getRevision(
  supabase: Client,
  projectId: string,
  revisionId: string
): Promise<DocumentRevision | null> {
  const { data, error } = await supabase
    .from('document_revisions')
    .select(REVISION_COLUMNS)
    .eq('project_id', projectId)
    .eq('id', revisionId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DocumentRevision | null;
}
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: PASS, with the existing suite unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/app/supabase/migrations/20260827000100_revision_authorship.sql apps/app/lib/db/documents.ts apps/app/types/supabase.ts
git commit -m "feat(documents): record who wrote the body each revision preserves"
```

---

## Task 2: Authorship, as pure logic

**Files:**
- Create: `apps/app/lib/documents/authorship.ts`
- Test: `apps/app/tests/unit/document-authorship.test.ts`

**Interfaces:**
- Consumes: `DocumentRevision` (Task 1).
- Produces: `type Authorship = { by: 'agent'; agentId: string } | { by: 'owner' }`, `authorshipOf(row: { agent_id: string | null }): Authorship`.

Two states, not three. An earlier draft of this plan distinguished a third — "author not recorded" — for rows written before `agent_id` existed, keyed off a hardcoded migration timestamp. That was removed before execution: the constant encoded the migration's *filename* time rather than the instant it ran in any given environment, and production holds zero documents and zero revisions, so no such row can exist. A UI branch that can never render is dead surface.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/app/tests/unit/document-authorship.test.ts
import { describe, expect, it } from 'vitest';

import { authorshipOf } from '@/lib/documents/authorship';

const AGENT = '11111111-1111-4111-8111-111111111111';

describe('authorshipOf', () => {
  it('names the agent when one is recorded', () => {
    expect(authorshipOf({ agent_id: AGENT })).toEqual({ by: 'agent', agentId: AGENT });
  });

  it('reads a null agent as the owner', () => {
    // Null means human-authored, the same convention entries, work items and
    // documents all use for their own agent_id.
    expect(authorshipOf({ agent_id: null })).toEqual({ by: 'owner' });
  });

  it('does not treat an empty string as an agent', () => {
    // A blank id is not provenance. Rendering it as "by an agent" would name
    // an author that does not exist, and the id would render as an empty span.
    expect(authorshipOf({ agent_id: '' })).toEqual({ by: 'owner' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/document-authorship.test.ts`
Expected: FAIL — cannot resolve `@/lib/documents/authorship`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/app/lib/documents/authorship.ts

/**
 * Who wrote the body a revision preserves.
 *
 * A revision records the body being *replaced*, so its author is whoever wrote
 * that body — `documents.agent_id` at the moment of replacement, which the
 * migration in Task 1 now carries onto the revision.
 *
 * Null means human-authored, the same convention entries, work items and
 * documents already use. There is deliberately no third "unknown" state: the
 * column ships before any document can be authored, so a revision predating it
 * cannot exist.
 */

export type Authorship = { by: 'agent'; agentId: string } | { by: 'owner' };

export function authorshipOf(row: { agent_id: string | null }): Authorship {
  // A blank id is not provenance — treat it as unset rather than naming an
  // author that does not exist.
  return row.agent_id ? { by: 'agent', agentId: row.agent_id } : { by: 'owner' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/document-authorship.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/app/lib/documents/authorship.ts apps/app/tests/unit/document-authorship.test.ts
git commit -m "feat(documents): read a revision's author"
```

---

## Task 3: Documents joins the sidebar

**Files:**
- Modify: `apps/app/lib/shell/destinations.ts`
- Modify: `apps/app/tests/unit/shell-destinations.test.ts`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**Interfaces:**
- Consumes: `destinationsFor` (slice A).
- Produces: a fifth destination, key `documents`.

- [ ] **Step 1: Update the failing test**

In `apps/app/tests/unit/shell-destinations.test.ts`, the test named `ships exactly the four sections that exist` asserts `['resume', 'work', 'log', 'inbox']`. Documents now exists, so change that test to:

```typescript
  it('ships exactly the sections that exist', () => {
    // Nothing is advertised that cannot be opened. Agents and Settings arrive
    // with their own slices and must not appear before their routes do.
    const keys = destinationsFor('ev-bike', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox', 'documents']);
  });
```

Add one more, because Documents sits after a counted destination and ordering has meaning in a sidebar:

```typescript
  it('keeps Documents after Inbox, and gives it no count', () => {
    // Documents has no pending state to report. A count here would be a number
    // with nothing to mean.
    const documents = destinationsFor('ev-bike', { inbox: 3 }).find((d) => d.key === 'documents');
    expect(documents!.count).toBeUndefined();
    expect(documents!.href).toBe('/projects/ev-bike/documents');
    expect(documents!.exact).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: FAIL — the destination list has four entries, not five.

- [ ] **Step 3: Add the destination**

In `apps/app/lib/shell/destinations.ts`, append to the array returned by `destinationsFor`, after the `inbox` entry:

```typescript
    {
      key: 'documents',
      href: `${base}/documents`,
      labelKey: 'app.documents.title',
      exact: false,
    },
```

- [ ] **Step 4: Add the i18n keys**

Create an `app.documents` object in all three locale files. Every key below is used by Tasks 3–5; add them all now so no later task edits these files.

`en`:
```json
"documents": {
  "title": "Documents",
  "empty": "No documents yet.",
  "new": "New document",
  "titleLabel": "Title",
  "bodyLabel": "Body",
  "save": "Save",
  "saving": "Saving",
  "saved": "Saved",
  "conflict": "This document changed since you opened it. Reload to see the current version.",
  "untitled": "Untitled",
  "changedAt": "Last changed",
  "history": "History",
  "historyEmpty": "No earlier versions.",
  "byAgent": "By an agent",
  "byOwner": "By you",
  "viewingRevision": "An earlier version, read-only",
  "restore": "Restore this version",
  "restored": "Restored.",
  "backToDocument": "Back to the document"
}
```

`ms`:
```json
"documents": {
  "title": "Dokumen",
  "empty": "Belum ada dokumen.",
  "new": "Dokumen baharu",
  "titleLabel": "Tajuk",
  "bodyLabel": "Kandungan",
  "save": "Simpan",
  "saving": "Menyimpan",
  "saved": "Disimpan",
  "conflict": "Dokumen ini berubah sejak anda membukanya. Muat semula untuk melihat versi terkini.",
  "untitled": "Tanpa tajuk",
  "changedAt": "Kali terakhir berubah",
  "history": "Sejarah",
  "historyEmpty": "Tiada versi terdahulu.",
  "byAgent": "Oleh ejen",
  "byOwner": "Oleh anda",
  "viewingRevision": "Versi terdahulu, baca sahaja",
  "restore": "Pulihkan versi ini",
  "restored": "Dipulihkan.",
  "backToDocument": "Kembali ke dokumen"
}
```

`zh`:
```json
"documents": {
  "title": "文档",
  "empty": "尚无文档。",
  "new": "新建文档",
  "titleLabel": "标题",
  "bodyLabel": "正文",
  "save": "保存",
  "saving": "保存中",
  "saved": "已保存",
  "conflict": "自您打开后此文档已更改。请重新加载以查看当前版本。",
  "untitled": "无标题",
  "changedAt": "最后更改",
  "history": "历史版本",
  "historyEmpty": "没有更早的版本。",
  "byAgent": "由代理撰写",
  "byOwner": "由您撰写",
  "viewingRevision": "较早版本，只读",
  "restore": "恢复此版本",
  "restored": "已恢复。",
  "backToDocument": "返回文档"
}
```

Make targeted edits — running Prettier over these files rewrites unrelated arrays. Confirm with `git diff` that only the intended lines changed, and that all three files carry an identical key set.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @goalspace/app exec vitest run tests/unit/shell-destinations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/lib/shell/destinations.ts apps/app/tests/unit/shell-destinations.test.ts packages/i18n
git commit -m "feat(documents): add the Documents destination"
```

---

## Task 4: The list, and creating a document

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/new-document-form.tsx`
- Modify: `apps/app/app/(workspace)/actions.ts`

**Interfaces:**
- Consumes: `listDocuments` (phase 2b); `createDocumentSchema` (phase 2b); `requireSessionContext`, `getProjectBySlug`, `getFixedT`, `getLocale`, `formatDate`; `ActionResult`, `ok`, `fail`, `fromZodError`.
- Produces: `createDocumentAction(input: unknown): Promise<ActionResult<{ id: string }>>`.

- [ ] **Step 1: Add the server action**

Append to `apps/app/app/(workspace)/actions.ts`, and add `import { createDocument } from '@/lib/db/documents';` plus `import { createDocumentSchema } from '@/lib/schemas/document';` to the imports at the top:

The project slug is a separate argument, NOT part of the validated input.
`createDocumentSchema` is shared with the agent proposal path and must not grow
a routing field.

```typescript
export async function createDocumentAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const document = await createDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
    });

    revalidatePath('/', 'layout');
    return ok({ id: document.id });
  } catch (error) {
    console.error('createDocumentAction failed', error);
    return fail('app.errors.generic');
  }
}
```

- [ ] **Step 2: Write the list page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listDocuments } from '@/lib/db/documents';
import { formatDate, getLocale } from '@/lib/format';
import { NewDocumentForm } from './new-document-form';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.documents.title')} · ${slug}` };
}

/**
 * Documents are the project's living artifacts — the things entries refer to.
 * The list carries when each last changed, because for a document the useful
 * question on return is which of these moved while you were away.
 */
export default async function DocumentsPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const documents = await listDocuments(supabase, project.id);
  const locale = await getLocale();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h1 className="label text-ink-soft">{t('app.documents.title')}</h1>
          <NewDocumentForm slug={slug} />
        </div>

        {documents.length === 0 ? (
          <p className="py-6 text-ink-soft">{t('app.documents.empty')}</p>
        ) : (
          <ul>
            {documents.map((document) => (
              <li key={document.id} className="border-b border-rule">
                <Link
                  href={`/projects/${slug}/documents/${document.id}`}
                  className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                >
                  <span className="min-w-0 flex-1 text-body text-ink">
                    {document.title || t('app.documents.untitled')}
                  </span>
                  {document.agent_id ? (
                    <span className="label shrink-0 text-ink-soft">
                      {t('app.documents.byAgent')}
                    </span>
                  ) : null}
                  <span className="label shrink-0 tabular-nums text-ink-soft">
                    {formatDate(document.updated_at, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the create control**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/new-document-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { createDocumentAction } from '@/app/(workspace)/actions';

/**
 * Creating a document is one field, not a form page.
 *
 * A document earns its content by being written in; asking for a body up front
 * would put a blank page between the person and the thing they came to write.
 */
export function NewDocumentForm({ slug }: { slug: string }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await createDocumentAction(slug, { title, body: '' });
        if (!result.ok) {
          setError(result.message ?? 'app.errors.generic');
          return;
        }
        setTitle('');
        router.push(`/projects/${slug}/documents/${result.data.id}`);
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setError('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor="new-document-title" className="sr-only">
        {t('app.documents.titleLabel')}
      </label>
      <input
        id="new-document-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('app.documents.new')}
        className="label border border-rule bg-paper px-3 py-1.5 text-ink placeholder:text-ink-soft"
      />
      <Button type="submit" disabled={pending || !title.trim()} className="label rounded-none">
        {t('app.documents.new')}
      </Button>
      {error ? <span className="label text-danger">{t(error)}</span> : null}
    </form>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm test && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder pnpm build`
Expected: all pass; `/projects/[slug]/documents` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/\(workspace\)/projects/\[slug\]/documents apps/app/app/\(workspace\)/actions.ts
git commit -m "feat(documents): list documents and create one"
```

---

## Task 5: The editor and its history

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/document-editor.tsx`
- Modify: `apps/app/app/(workspace)/actions.ts`
- Test: `apps/app/tests/rls/documents-history.test.ts`

**Interfaces:**
- Consumes: `getDocument`, `updateDocument`, `listRevisions`, `getRevision` (Task 1); `authorshipOf` (Task 2); `updateDocumentSchema` (phase 2b).
- Produces: `updateDocumentAction(slug, input)`, `restoreRevisionAction(slug, documentId, revisionId, expectedUpdatedAt)`.

- [ ] **Step 1: Write the failing database test**

```typescript
// apps/app/tests/rls/documents-history.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser, deleteTestUser, type TestUser } from '../helpers/supabase';
import { listRevisions, updateDocument } from '@/lib/db/documents';

/**
 * Revision authorship and the compare-and-set, against a real database.
 *
 * Both are behaviours of `apply_document_edit`, a Postgres function holding a
 * row lock. A stubbed client would only prove the stub agrees with the code.
 */

let alice: TestUser | undefined;
let projectId: string;
let agentId: string;

const insert = async (user: TestUser, table: string, values: Record<string, unknown>) => {
  const { data, error } = await user.client.from(table).insert(values).select().single();
  if (error) throw error;
  return data as Record<string, unknown> & { id: string };
};

const client = () => alice!.client as never;

beforeAll(async () => {
  alice = await createTestUser(`docs-${Date.now()}@example.test`);

  projectId = (
    await insert(alice, 'projects', {
      owner_id: alice.id,
      slug: 'ev-bike',
      title: 'Custom EV bike',
      kind: 'build',
    })
  ).id;

  agentId = (
    await insert(alice, 'agents', {
      project_id: projectId,
      owner_id: alice.id,
      slug: 'tutor',
      name: 'Tutor',
      system_prompt: 'Draft things.',
      tools: ['read_document'],
    })
  ).id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(alice.id);
});

describe('revision authorship', () => {
  it('records the agent that wrote the body being replaced', async () => {
    // The document's current body was written by an agent; replacing it must
    // preserve that fact on the revision, not on the new body.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Build notes',
      body: 'Agent wrote this.',
      agent_id: agentId,
    });

    const updated = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'The owner rewrote it.' },
      agentId: null,
      expectedUpdatedAt: document.updated_at as string,
    });
    expect(updated).not.toBeNull();

    const revisions = await listRevisions(client(), projectId, document.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0].body).toBe('Agent wrote this.');
    expect(revisions[0].agent_id).toBe(agentId);

    // And the document itself is now human-authored.
    expect(updated!.agent_id).toBeNull();
  });

  it('records a null author when a person wrote the replaced body', async () => {
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Human notes',
      body: 'The owner wrote this.',
    });

    await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Rewritten.' },
      expectedUpdatedAt: document.updated_at as string,
    });

    const revisions = await listRevisions(client(), projectId, document.id);
    expect(revisions[0].agent_id).toBeNull();
  });
});

describe('the compare-and-set a human edit relies on', () => {
  it('refuses a save based on a version that has moved', async () => {
    // Two tabs, one stale. The loser must be told, not silently win.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Contended',
      body: 'Version one.',
    });
    const staleVersion = document.updated_at as string;

    const first = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Saved by the first tab.' },
      expectedUpdatedAt: staleVersion,
    });
    expect(first).not.toBeNull();

    const second = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Saved by the stale tab.' },
      expectedUpdatedAt: staleVersion,
    });
    expect(second).toBeNull();

    const { data: after } = await alice!.client
      .from('documents')
      .select('body')
      .eq('id', document.id)
      .single();
    expect(after!.body).toBe('Saved by the first tab.');
  });

  it('restoring an old body makes the current one a revision in turn', async () => {
    // This is what makes restore reversible by repeating it.
    const document = await insert(alice!, 'documents', {
      project_id: projectId,
      owner_id: alice!.id,
      title: 'Round trip',
      body: 'Original.',
    });

    const edited = await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: 'Edited.' },
      expectedUpdatedAt: document.updated_at as string,
    });

    const [original] = await listRevisions(client(), projectId, document.id);
    expect(original.body).toBe('Original.');

    await updateDocument(client(), {
      projectId,
      ownerId: alice!.id,
      values: { id: document.id, body: original.body },
      expectedUpdatedAt: edited!.updated_at,
    });

    const revisions = await listRevisions(client(), projectId, document.id);
    expect(revisions.map((r) => r.body)).toEqual(['Edited.', 'Original.']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:rls`
Expected: FAIL — `agent_id` is not selected or does not exist until Task 1's migration has reached the local stack. If Task 1 was completed, the authorship assertions pass and only the later ones need the code below; either way, read the failure before writing anything.

- [ ] **Step 3: Add the actions**

Append to `apps/app/app/(workspace)/actions.ts`, adding `import { getDocument, getRevision, updateDocument } from '@/lib/db/documents';` and `import { updateDocumentSchema } from '@/lib/schemas/document';`:

```typescript
export async function updateDocumentAction(
  slug: string,
  input: unknown,
  expectedUpdatedAt: string
): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const updated = await updateDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: parsed.data,
      // A person saving clears the agent stamp: the column describes who wrote
      // the body that is there now, and that is now them.
      agentId: null,
      expectedUpdatedAt,
    });

    // Null means the version moved under us — another tab, or an accepted
    // proposal. Refusing beats overwriting work the owner cannot see.
    if (!updated) return fail('app.documents.conflict');

    revalidatePath('/', 'layout');
    return ok({ updatedAt: updated.updated_at });
  } catch (error) {
    console.error('updateDocumentAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function restoreRevisionAction(
  slug: string,
  documentId: string,
  revisionId: string,
  expectedUpdatedAt: string
): Promise<ActionResult<{ updatedAt: string }>> {
  const { supabase, userId } = await requireSessionContext();

  try {
    const project = await getProjectBySlug(supabase, userId, slug);
    if (!project) return fail('app.errors.projectMissing');

    const revision = await getRevision(supabase, project.id, revisionId);
    if (!revision || revision.document_id !== documentId) return fail('app.errors.generic');

    const updated = await updateDocument(supabase, {
      projectId: project.id,
      ownerId: userId,
      values: { id: documentId, title: revision.title, body: revision.body },
      // A restore is the owner's decision, whoever originally wrote the words.
      // The revision keeps the original attribution; the current body is theirs.
      agentId: null,
      expectedUpdatedAt,
    });

    if (!updated) return fail('app.documents.conflict');

    revalidatePath('/', 'layout');
    return ok({ updatedAt: updated.updated_at });
  } catch (error) {
    console.error('restoreRevisionAction failed', error);
    return fail('app.errors.generic');
  }
}
```

- [ ] **Step 4: Write the editor page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/[docId]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getDocument, listRevisions } from '@/lib/db/documents';
import { authorshipOf } from '@/lib/documents/authorship';
import { formatDateTime, getLocale } from '@/lib/format';
import { DocumentEditor } from './document-editor';

type Params = { params: Promise<{ slug: string; docId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, docId } = await params;
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  const document = project ? await getDocument(supabase, project.id, docId) : null;
  const t = getFixedT(await getLocale());
  return { title: `${document?.title || t('app.documents.untitled')} · ${slug}` };
}

const AUTHOR_KEY = {
  agent: 'app.documents.byAgent',
  owner: 'app.documents.byOwner',
} as const;

export default async function DocumentPage({ params }: Params) {
  const { slug, docId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const document = await getDocument(supabase, project.id, docId);
  if (!document) notFound();

  const revisions = await listRevisions(supabase, project.id, document.id);
  const locale = await getLocale();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <DocumentEditor slug={slug} document={document} />

        <section className="pt-10">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.documents.history')}
          </h2>

          {revisions.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.documents.historyEmpty')}</p>
          ) : (
            <ul>
              {revisions.map((revision) => (
                <li key={revision.id} className="border-b border-rule">
                  <Link
                    href={`/projects/${slug}/documents/${document.id}/revisions/${revision.id}`}
                    className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                  >
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {formatDateTime(revision.created_at, locale)}
                    </span>
                    <span className="min-w-0 flex-1 text-body text-ink">
                      {revision.title || t('app.documents.untitled')}
                    </span>
                    <span className="label shrink-0 text-ink-soft">
                      {t(AUTHOR_KEY[authorshipOf(revision).by])}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write the editor component**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/[docId]/document-editor.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { updateDocumentAction } from '@/app/(workspace)/actions';
import type { Document } from '@/lib/db/documents';

/**
 * Every save is a compare-and-set against the version this editor loaded.
 *
 * Holding the version in state rather than re-reading it is the point: if an
 * accepted proposal or another tab moved the document while this one sat open,
 * the save is refused and the person is told, instead of their view of the
 * document silently replacing someone else's work.
 */
export function DocumentEditor({ slug, document }: { slug: string; document: Document }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [version, setVersion] = useState(document.updated_at);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);

    startTransition(async () => {
      try {
        const result = await updateDocumentAction(slug, { id: document.id, title, body }, version);

        if (!result.ok) {
          // The fields are deliberately left alone. Unsaved text is the most
          // valuable thing on this screen and a failed save must not cost it.
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          return;
        }

        // Adopt the new version so a second save from this same open editor is
        // not treated as stale.
        setVersion(result.data.updatedAt);
        setMessage('app.documents.saved');
        router.refresh();
      } catch {
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="document-title" className="label text-ink-soft">
          {t('app.documents.titleLabel')}
        </label>
        <input
          id="document-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="document-body" className="label text-ink-soft">
          {t('app.documents.bodyLabel')}
        </label>
        <textarea
          id="document-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={20}
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} className="label rounded-none">
          {t(pending ? 'app.documents.saving' : 'app.documents.save')}
        </Button>
        {message ? (
          <span className={cn('label', failed ? 'text-danger' : 'text-ink-soft')}>
            {t(message)}
          </span>
        ) : null}
      </div>
    </form>
  );
}
```

Add `cn` to the `@goalspace/ui` import — the message span picks its colour from
whether the save failed, so success and failure are not the same word in the
same colour.

- [ ] **Step 6: Verify the editor**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit the editor**

```bash
git add apps/app/app/\(workspace\)/projects/\[slug\]/documents/\[docId\] apps/app/app/\(workspace\)/actions.ts apps/app/tests/rls/documents-history.test.ts
git commit -m "feat(documents): edit a document, refusing a save built on a stale version"
```

---

## Task 6: The revision view, and restoring from it

**Files:**
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/page.tsx`
- Create: `apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/restore-button.tsx`

**Interfaces:**
- Consumes: `getRevision`, `getDocument` (Task 1); `authorshipOf` (Task 2); `restoreRevisionAction` (Task 5).

There is no confirmation dialog anywhere in this task. The body is on screen when
the restore action is available, which is a better guard than a dialog asking
whether you are sure about a body you cannot see.

- [ ] **Step 1: Write the revision page**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getDocument, getRevision } from '@/lib/db/documents';
import { authorshipOf } from '@/lib/documents/authorship';
import { formatDateTime, getLocale } from '@/lib/format';
import { RestoreButton } from './restore-button';

type Params = { params: Promise<{ slug: string; docId: string; revisionId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.documents.viewingRevision')} · ${slug}` };
}

const AUTHOR_KEY = {
  agent: 'app.documents.byAgent',
  owner: 'app.documents.byOwner',
} as const;

export default async function RevisionPage({ params }: Params) {
  const { slug, docId, revisionId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const [document, revision] = await Promise.all([
    getDocument(supabase, project.id, docId),
    getRevision(supabase, project.id, revisionId),
  ]);

  // The revision must belong to the document in the URL. Without this check a
  // guessed id would render one document's history under another's heading.
  if (!document || !revision || revision.document_id !== document.id) notFound();

  const locale = await getLocale();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        {/* Stated plainly and first, so this is never mistaken for the editor. */}
        <p className="label border-b border-rule pb-2 text-ink-soft">
          {t('app.documents.viewingRevision')}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <span className="label tabular-nums text-ink-soft">
            {formatDateTime(revision.created_at, locale)}
          </span>
          <span className="label text-ink-soft">
            {t(AUTHOR_KEY[authorshipOf(revision).by])}
          </span>
        </div>

        <h1 className="wdth-wide text-headline font-bold text-ink">
          {revision.title || t('app.documents.untitled')}
        </h1>

        <p className="mt-4 max-w-[70ch] whitespace-pre-wrap text-body text-ink">
          {revision.body}
        </p>

        <div className="mt-8 flex items-center gap-4 border-t border-rule pt-4">
          <RestoreButton
            slug={slug}
            documentId={document.id}
            revisionId={revision.id}
            expectedUpdatedAt={document.updated_at}
          />
          <Link
            href={`/projects/${slug}/documents/${document.id}`}
            className="label text-ink-soft transition-colors hover:text-ink"
          >
            {t('app.documents.backToDocument')}
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the restore control**

```tsx
// apps/app/app/(workspace)/projects/[slug]/documents/[docId]/revisions/[revisionId]/restore-button.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { restoreRevisionAction } from '@/app/(workspace)/actions';

/**
 * Restoring is an ordinary edit whose body is the old body.
 *
 * The current body becomes a revision in turn, so this is reversible by doing
 * it again — which is why it needs no confirmation beyond the body being
 * visible on the page that offers it.
 */
export function RestoreButton({
  slug,
  documentId,
  revisionId,
  expectedUpdatedAt,
}: {
  slug: string;
  documentId: string;
  revisionId: string;
  /** The document's version as this page loaded it; the restore is refused if it moved. */
  expectedUpdatedAt: string;
}) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await restoreRevisionAction(
          slug,
          documentId,
          revisionId,
          expectedUpdatedAt
        );
        if (!result.ok) {
          setError(result.message ?? 'app.errors.generic');
          return;
        }
        router.push(`/projects/${slug}/documents/${documentId}`);
      } catch {
        setError('app.errors.generic');
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Button type="button" onClick={restore} disabled={pending} className="label rounded-none">
        {t('app.documents.restore')}
      </Button>
      {error ? <span className="label text-danger">{t(error)}</span> : null}
    </div>
  );
}
```

- [ ] **Step 3: Verify everything**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd /Users/faez/Documents/goalspace
corepack pnpm typecheck && corepack pnpm test && corepack pnpm test:rls
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder corepack pnpm build
```

Expected: all pass. These three routes appear in the build's route list:
`/projects/[slug]/documents`, `/projects/[slug]/documents/[docId]`, and
`/projects/[slug]/documents/[docId]/revisions/[revisionId]`.

- [ ] **Step 4: Commit**

```bash
git add apps/app/app/\(workspace\)/projects/\[slug\]/documents/\[docId\]/revisions
git commit -m "feat(documents): view an earlier version and restore it"
```

---

## Done when

1. The sidebar shows Documents, and it opens a working list.
2. A person can create a document, write in it, and save.
3. Saving from a stale editor is refused with a message naming the reason, and the other tab's work survives.
4. Each document shows its history, with the author of each preserved body — the agent that wrote it, or the owner.
5. A revision opens read-only, in full, and can be restored from that view with no dialog.
6. Restoring makes the current body a revision in turn, so repeating it returns to where you were.
7. `pnpm typecheck`, `pnpm test`, `pnpm test:rls` and `pnpm build` all pass.

## Not in this plan

Attachments on documents; full-text search over document bodies from the UI (`search_repo` already indexes them for agents); the agents editor and run trace (slice C); settings (slice D); any change to how agents propose document edits.

## Before starting

- Slice A is merged to `main`. Branch from there.
- `pnpm test:rls` needs the local Supabase stack: `cd apps/app && corepack pnpm db:start`. It reads `apps/app/.env.test`, which already exists and points at that stack.
- Read the phase 2b plan's "As built" section for how `apply_document_edit` came to exist — Task 1 replaces that function and needs to preserve everything else it does.

# Co-partner Chat — Slice 2d-3: The Surface

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner talks to the Partner on the resume view, and everything built blind in 2d-1 and 2d-2 finally runs.

**Architecture:** A streaming route persists both turns and wires the run context with `delegate` and `conversationId`. One client component holds the transcript and the composer together, mounted where the capture bar is today and switching on the route so only the resume view is chat-capable.

**Tech Stack:** Next.js 16 · React 19 · `ai@7.0.66` · `@ai-sdk/react@4` · AI SDK Elements (`Conversation` only) · Vitest 4

**Spec:** [docs/superpowers/specs/2026-09-02-copartner-chat-design.md](../specs/2026-09-02-copartner-chat-design.md) — §7, §8, §9, §10, §11
**Builds on:** [2d-1](2026-09-02-copartner-slice-2d1-data-and-delegation.md), [2d-2](2026-09-02-copartner-slice-2d2-record-entry.md).

## Spike result — the §15 risk is closed

Resolved before planning rather than during Task 1.

**AI SDK Elements works on Tailwind 3.** The registry at `registry.ai-sdk.dev` is version-agnostic: components use standard utilities (`flex`, `gap-8`, `text-muted-foreground`), with no `@theme`, no `oklch()`, no CSS-first config. `ai-elements@1.9.0` declares no peer dependencies of its own.

**What is worth taking, and what is not.** Elements is a shadcn-style registry — components are copied into the repo and become ours to maintain. `Conversation` earns that: it wraps `use-stick-to-bottom`, which is the genuinely fiddly part of a transcript (auto-scroll that yields the moment the reader scrolls up). `Response` does not: it pulls `streamdown`, a second markdown renderer, when `components/docs/markdown.tsx` already exists with tested safety properties — dangerous URL protocols dropped, verified in `tests/unit/markdown.test.ts`. Two markdown stacks with different safety characteristics in one app is a liability, not a convenience.

So: `Conversation` from Elements, `useChat` from `@ai-sdk/react`, and everything else built on `packages/ui` and the existing `Markdown`.

## Global Constraints

- **Capture must survive a dead model layer.** `⌘⇧↵` writes through `captureEntryAction` with no run, and the composer falls back to record-only when the cap is reached or the gateway errors. Spec §7.2. This is the constraint most likely to be quietly dropped under UI pressure; it is criterion 5.
- **Only the resume view is chat-capable.** Every other project tab keeps the capture bar unchanged. Spec §7.1.
- **No chat-app chrome.** No avatars, no tailed bubbles, no animated ellipsis, no sparkles. Turns are distinguished by label and alignment in the paper/ink/rule system. PRODUCT.md names this register as the primary anti-reference, and a chat surface is where a product most easily drifts into it. Spec §7.3.
- **The user turn is written before the run starts** — `record_entry` validates against it, and an unwritten message is not a citable source. Spec §9.
- **Locale keys in `en`, `ms`, `zh`.**
- **Node ≥22** before `pnpm test:rls`. **Working directory `apps/app`** unless stated.

---

### Task 1: Dependencies and the Conversation component

**Files:**
- Modify: `apps/app/package.json`
- Create: `apps/app/components/chat/conversation.tsx`

- [ ] **Step 1: Add the two dependencies**

```bash
pnpm --filter @goalspace/app add @ai-sdk/react use-stick-to-bottom
```

`lucide-react` and `react-markdown` are already present. `streamdown` is deliberately **not** added — see the spike result.

- [ ] **Step 2: Vendor the Conversation component**

`apps/app` has no `components.json`, so the `ai-elements` CLI has nothing to write into, and creating one to fetch a single component is more setup than the component is worth. Elements is a copy-in registry by design; copy it in.

Create `apps/app/components/chat/conversation.tsx` holding `Conversation`, `ConversationContent` and `ConversationScrollButton`, adapted from `registry.ai-sdk.dev/conversation.json`:

```tsx
'use client';

import type { ComponentProps } from 'react';
import { ArrowDownIcon } from 'lucide-react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { Button, cn } from '@goalspace/ui';

/**
 * Adapted from AI SDK Elements (registry.ai-sdk.dev), which is a copy-in
 * registry rather than a package — these components are ours once taken.
 *
 * Only this one was taken. `Response` was not: it depends on `streamdown`,
 * and `components/docs/markdown.tsx` already renders markdown with safety
 * properties covered by tests/unit/markdown.test.ts. Two markdown renderers
 * with different escaping rules is a liability.
 *
 * What this is worth taking for is `use-stick-to-bottom`: a transcript must
 * follow a streaming reply and stop the instant the reader scrolls up to read
 * something earlier. Written by hand that is a scroll-position race; here it
 * is a dependency.
 *
 * Restyled to the paper/ink/rule system. The upstream look is the AI-startup
 * register PRODUCT.md names as its primary anti-reference.
 */
export function Conversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={cn('relative flex-1 overflow-y-auto', className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export function ConversationContent({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={cn('p-4', className)} {...props} />;
}

export function ConversationScrollButton({ className, ...props }: ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => scrollToBottom()}
      className={cn('absolute bottom-2 left-1/2 -translate-x-1/2', className)}
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck` (repository root)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/app/package.json pnpm-lock.yaml apps/app/components/chat/conversation.tsx
git commit -m "feat(chat): vendor the Elements Conversation, and only that"
```

---

### Task 2: The chat route

**Files:**
- Create: `apps/app/app/api/chat/[slug]/route.ts`
- Modify: `apps/app/lib/db/agents.ts` (link the run to its conversation)

**Interfaces:**
- Consumes: `getOrCreateConversation`, `appendMessage`, `listMessages`, `runTooled`, `buildToolSet`, `startAgentRun`, `getBudget`, `checkCaps`, `finishRun`, `recordRunUsage`, `buildSkeleton`.
- Produces: `POST /api/chat/[slug]` returning a UI message stream; `startAgentRun` accepts `conversationId`.

- [ ] **Step 1: Let a run record its conversation**

`start_agent_run` takes no conversation id — its signature is `(project_id, agent_id, work_item_id, trigger, reserved_usd)`, and changing a `security invoker` function to add a parameter is a migration for a link that needs no atomicity. The reservation is what must be atomic; the link is not.

In `apps/app/lib/db/agents.ts`, add to `StartRunInput`:

```ts
  /**
   * The conversation this run belongs to, linked immediately after the run
   * opens.
   *
   * Not a parameter of start_agent_run. That function exists to make the cap
   * check and the insert atomic under an advisory lock, and a foreign key that
   * nothing reads until the run ends does not need to be inside that lock.
   * Adding a parameter would mean migrating a security-invoker function for a
   * link a follow-up statement can set just as correctly.
   */
  conversationId?: string | null;
```

and after the verdict resolves to `started: true`:

```ts
  if (input.conversationId) {
    await supabase
      .from('agent_runs')
      .update({ conversation_id: input.conversationId })
      .eq('id', verdict.run_id as string);
  }
```

- [ ] **Step 2: Write the route**

Create `apps/app/app/api/chat/[slug]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

import { checkCaps } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import { buildToolSet, type RunContext } from '@/lib/agents/executor';
import { buildSkeleton, type SkeletonWorkItem } from '@/lib/agents/skeleton';
import { runTooled } from '@/lib/agents/tooled';
import { finishRun, recordRunUsage } from '@/lib/agents/usage';
import { startAgentRun } from '@/lib/db/agents';
import { getBudget } from '@/lib/db/budgets';
import { appendMessage, getOrCreateConversation } from '@/lib/db/conversations';
import { getProjectBySlug } from '@/lib/db/projects';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300;
const MAX_STEPS = 12;

/**
 * One turn of the conversation.
 *
 * Shaped like the ask route — the loop runs inside the stream, the per-run
 * token cap lives in stopWhen, and metering goes through lib/agents/usage.ts.
 * What it adds is persistence and two context fields the Partner needs.
 *
 * `delegate` closes over runTooled here rather than being imported by the
 * handlers, which would close a module cycle. This is the only place that
 * knows how to start a second run, and it is the only place that should.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const project = await getProjectBySlug(supabase, auth.user.id, slug);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const { data: agent } = await supabase
    .from('agents')
    .select('id, project_id, owner_id, system_prompt, tools, model, is_active')
    .eq('project_id', project.id)
    .eq('slug', 'partner')
    .maybeSingle();

  if (!agent || !agent.is_active) {
    // The composer falls back to record-only on this, rather than showing a
    // dead input. A project without a Partner is still a project.
    return NextResponse.json({ error: 'partner_missing' }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(supabase, {
    projectId: project.id,
    ownerId: auth.user.id,
    agentId: agent.id,
  });

  // The last turn is what the owner just sent. Written before the run starts:
  // record_entry validates its sources against this conversation's user turns,
  // and a message that is not yet stored is not a citable source.
  const latest = messages.at(-1);
  const text =
    latest?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? '';

  if (latest?.role === 'user' && text.trim()) {
    await appendMessage(supabase, {
      conversationId: conversation.id,
      projectId: project.id,
      ownerId: auth.user.id,
      role: 'user',
      content: text,
    });
  }

  const budget = await getBudget(supabase, project.id, auth.user.id);
  const start = await startAgentRun(supabase, {
    projectId: project.id,
    agentId: agent.id,
    workItemId: null,
    conversationId: conversation.id,
    trigger: 'conversation',
    reservedUsd: worstCaseUsd(agent.model, budget.per_run_token_cap),
  });

  if (!start.started) {
    const verdict = checkCaps({ budget, monthToDateUsd: start.monthToDateUsd, runTokens: 0 });
    // 402 is what the composer switches to record-only on. The user turn above
    // is already saved, so nothing they typed is lost to a refusal.
    return NextResponse.json(
      {
        error: verdict.allowed
          ? `Monthly cap of $${start.monthlyCapUsd.toFixed(2)} is fully committed to runs already in flight.`
          : verdict.message,
        cap: 'monthly',
      },
      { status: 402 }
    );
  }

  const runId = start.runId;
  let cappedByTokens = false;

  const context: RunContext = {
    supabase,
    projectId: project.id,
    ownerId: auth.user.id,
    agentId: agent.id,
    runId,
    allowlist: agent.tools,
    documentVersions: new Map<string, string>(),
    conversationId: conversation.id,
    delegate: async (agentSlug, question) => {
      const { data: sub } = await supabase
        .from('agents')
        .select('id, project_id, owner_id, system_prompt, tools, model, is_active')
        .eq('project_id', project.id)
        .eq('slug', agentSlug)
        .maybeSingle();

      if (!sub || !sub.is_active) {
        return { ok: false, message: `This project has no active ${agentSlug}.` };
      }

      // Under the sub-agent's own allowlist, in its own run. The Partner gains
      // nothing: buildToolSet is called with sub.tools, and any proposal
      // carries sub.id.
      const outcome = await runTooled({
        supabase,
        agent: sub,
        ownerId: auth.user.id,
        prompt: question,
        trigger: 'conversation',
      });

      return outcome.ok
        ? { ok: true, text: outcome.text }
        : { ok: false, message: outcome.message };
    },
  };

  const skeleton = await loadSkeleton(supabase, project.id);

  const result = streamText({
    model: agent.model,
    system: `${agent.system_prompt}\n\n---\n\nThe project as it stands:\n\n${skeleton}`,
    messages: convertToModelMessages(messages),
    tools: buildToolSet(context),
    stopWhen: [
      stepCountIs(MAX_STEPS),
      ({ steps }) => {
        const runTokens = steps.reduce((n, s) => n + (s.usage.totalTokens ?? 0), 0);
        const verdict = checkCaps({ budget, monthToDateUsd: 0, runTokens });
        if (!verdict.allowed) cappedByTokens = true;
        return !verdict.allowed;
      },
    ],
    maxRetries: 1,
    onStepEnd: async (step) => {
      await recordRunUsage(supabase, {
        projectId: project.id,
        ownerId: auth.user.id,
        agentId: agent.id,
        runId,
        workItemId: null,
        model: agent.model,
        usage: step.usage,
        providerMetadata: step.providerMetadata,
      });
    },
    onEnd: async ({ steps, text: answer }) => {
      if (answer.trim()) {
        await appendMessage(supabase, {
          conversationId: conversation.id,
          projectId: project.id,
          ownerId: auth.user.id,
          role: 'assistant',
          content: answer,
          runId,
        });
      }
      await finishRun(supabase, runId, {
        status: cappedByTokens ? 'capped' : 'succeeded',
        stepCount: steps.length,
      });
    },
    onError: async ({ error }) => {
      // The user turn stays. Losing what the owner typed is the worst failure
      // this product has, and a failed model call is not a reason to incur it.
      await finishRun(supabase, runId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return result.toUIMessageStreamResponse();
}

async function loadSkeleton(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<string> {
  const [{ data: project }, { data: workItems }, { data: decisions }] = await Promise.all([
    supabase.from('projects').select('title, kind, brief').eq('id', projectId).single(),
    supabase
      .from('work_items')
      .select('id, parent_id, title, status, kind')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
    supabase
      .from('entries')
      .select('id, title, occurred_at')
      .eq('project_id', projectId)
      .eq('kind', 'decision')
      .order('occurred_at', { ascending: false })
      .limit(200),
  ]);

  if (!project) return '(project not found)';
  return buildSkeleton({
    project,
    workItems: (workItems ?? []) as SkeletonWorkItem[],
    decisions: decisions ?? [],
  });
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck` (repository root) and `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/api/chat/[slug]/route.ts" apps/app/lib/db/agents.ts
git commit -m "feat(chat): the streaming chat route"
```

---

### Task 3: The composer and transcript

**Files:**
- Create: `apps/app/components/chat/partner-chat.tsx`
- Create: `apps/app/lib/chat/send-mode.ts`
- Test: `apps/app/tests/unit/chat-send-mode.test.ts`
- Modify: `packages/i18n/src/locales/{en,ms,zh}.json`

**Interfaces:**
- Produces: `sendModeFor(event, fallbackOnly)` → `'chat' | 'record' | null`, pure and tested.

- [ ] **Step 1: Write the failing test**

Create `apps/app/tests/unit/chat-send-mode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { sendModeFor } from '@/lib/chat/send-mode';

const key = (over: Partial<{ key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }>) =>
  ({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, ...over }) as KeyboardEvent;

describe('sendModeFor', () => {
  it('sends to the Partner on the plain modifier', () => {
    expect(sendModeFor(key({ metaKey: true }), false)).toBe('chat');
    expect(sendModeFor(key({ ctrlKey: true }), false)).toBe('chat');
  });

  it('records on the shifted modifier', () => {
    expect(sendModeFor(key({ metaKey: true, shiftKey: true }), false)).toBe('record');
  });

  it('does nothing on a bare Enter', () => {
    // A newline in a composer must stay a newline. The capture bar has always
    // required the modifier and the muscle memory is worth keeping.
    expect(sendModeFor(key({}), false)).toBeNull();
  });

  it('records even on the chat modifier when the model layer is unavailable', () => {
    // The fallback that keeps criterion 5 true. Out of budget, or a gateway
    // error, degrades the composer to a notebook rather than a dead input —
    // so the chat modifier must still write rather than silently do nothing.
    expect(sendModeFor(key({ metaKey: true }), true)).toBe('record');
    expect(sendModeFor(key({ metaKey: true, shiftKey: true }), true)).toBe('record');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- tests/unit/chat-send-mode.test.ts`
Expected: FAIL — cannot resolve `@/lib/chat/send-mode`.

- [ ] **Step 3: Write the module**

Create `apps/app/lib/chat/send-mode.ts`:

```ts
/**
 * Which of the composer's two sends a keystroke means.
 *
 * Pure, because it is the one piece of the composer that must not be wrong.
 * `⌘↵` talks to the Partner; `⌘⇧↵` writes straight to the log with no run, no
 * cost and no gateway. Bare Enter is a newline, as it has always been in the
 * capture bar.
 *
 * `fallbackOnly` collapses both to `record`. When the monthly cap is reached
 * or the gateway is erroring there is no chat to send to, and the honest
 * behaviour is a working notebook rather than an input that swallows
 * keystrokes. Losing what the owner typed is the worst failure this product
 * has.
 */
export function sendModeFor(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'>,
  fallbackOnly: boolean
): 'chat' | 'record' | null {
  if (event.key !== 'Enter') return null;
  if (!event.metaKey && !event.ctrlKey) return null;
  if (fallbackOnly) return 'record';
  return event.shiftKey ? 'record' : 'chat';
}
```

- [ ] **Step 4: Add the locale keys**

Under `app` in `en.json`:

```json
"chat": {
  "placeholder": "Ask about this project, or tell it what happened",
  "send": "Ask",
  "record": "Record",
  "hint": "⌘↵ to ask · ⌘⇧↵ to record straight to the log",
  "empty": "Nothing asked yet. It reads the same record you do.",
  "thinking": "Reading the record",
  "recordOnly": "Record-only: the Partner is unavailable, so ⌘↵ writes to the log.",
  "partnerMissing": "This project has no Partner. The composer records to the log.",
  "failed": "That did not reach the Partner. What you typed is still here."
}
```

Translate into `ms.json` and `zh.json`. `hint` and `recordOnly` are the long strings — check them against the composer width.

- [ ] **Step 5: Write the component**

Verified against the installed types: `useChat({ messages, transport, onError })` returns `{ messages, sendMessage, status, error }`, and `sendMessage` takes `{ text }`.

Create `apps/app/components/chat/partner-chat.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';

import { Markdown } from '@/components/docs/markdown';
import type { CaptureTarget } from '@/lib/capture/targets';
import { sendModeFor } from '@/lib/chat/send-mode';
import { entryKinds } from '@/lib/schemas/common';
import { captureEntryAction } from '@/app/(workspace)/actions';
import { Conversation, ConversationContent, ConversationScrollButton } from './conversation';

export interface SeedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The model layer is unavailable, and the composer should say so and keep
 * writing to the log.
 *
 * The transport throws with the response body in the message, so the markers
 * the route sends — a 402 carrying `cap`, or `partner_missing` — are what is
 * matched. Crude, and deliberately failing toward record-only: a false
 * positive costs the owner a chat turn, a false negative costs them the
 * ability to write anything down.
 */
function modelLayerDown(error: Error | undefined): boolean {
  if (!error) return false;
  return /partner_missing|"cap"|Monthly cap/i.test(error.message);
}

function textOf(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function PartnerChat({
  slug,
  targets,
  initialMessages,
}: {
  slug: string;
  targets: CaptureTarget[];
  initialMessages: SeedMessage[];
}) {
  const { t } = useAppTranslations();
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<string>('note');
  const [workItemId, setWorkItemId] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chat/${slug}` }),
    // The server-rendered transcript, so a reload does not start an empty
    // conversation over a stored one.
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.content }],
    })) as UIMessage[],
  });

  const fallbackOnly = modelLayerDown(error);
  const busy = status === 'submitted' || status === 'streaming' || recording;

  async function record() {
    const body = draft.trim();
    if (!body) return;

    setRecording(true);
    setNotice(null);
    const result = await captureEntryAction(slug, {
      kind,
      body,
      title: null,
      work_item_id: workItemId || null,
    });
    setRecording(false);

    // The draft is only cleared on success. Losing captured text is the worst
    // failure this product has, and a failed write must leave it recoverable.
    if (result.ok) setDraft('');
    else setNotice(t(result.message));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mode = sendModeFor(event.nativeEvent, fallbackOnly);
    if (!mode) return;
    event.preventDefault();

    if (mode === 'record') {
      void record();
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void sendMessage({ text });
  }

  return (
    <div className="border-rule flex max-h-[60svh] flex-col border-t">
      {messages.length === 0 ? (
        <p className="text-ink-soft px-4 py-6">{t('app.chat.empty')}</p>
      ) : (
        <Conversation className="border-rule border-b">
          <ConversationContent className="flex flex-col gap-6">
            {messages.map((message) => (
              <div key={message.id}>
                <p className="label text-ink-soft">
                  {message.role === 'user' ? t('app.chat.you') : t('app.chat.partner')}
                </p>
                {message.role === 'assistant' ? (
                  <Markdown className="mt-1">{textOf(message)}</Markdown>
                ) : (
                  // The owner's words are plain text everywhere else in this
                  // product — the log, the resume view — and must not suddenly
                  // render markdown here.
                  <p className="prose-measure text-ink mt-1 whitespace-pre-line">
                    {textOf(message)}
                  </p>
                )}
              </div>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {/* Text, never a spinner alone: a streaming reply must be announced to a
          reader who cannot see it move. */}
      <p role="status" aria-live="polite" className="label text-ink-soft px-4 pt-2">
        {status === 'streaming' || status === 'submitted' ? t('app.chat.thinking') : null}
        {fallbackOnly ? t('app.chat.recordOnly') : null}
        {notice}
      </p>

      <div className="flex flex-col gap-2 p-4 pt-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('app.chat.placeholder')}
          aria-label={t('app.chat.placeholder')}
          className="bg-paper text-body text-ink placeholder:text-ink-soft"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label={t('app.capture.kindLabel')}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="label border-input bg-paper text-ink h-9 border px-2"
          >
            {entryKinds.map((value) => (
              <option key={value} value={value}>
                {t(`app.entryKind.${value}`)}
              </option>
            ))}
          </select>
          {targets.length > 0 ? (
            <select
              aria-label={t('app.capture.targetLabel')}
              value={workItemId}
              onChange={(event) => setWorkItemId(event.target.value)}
              className="label border-input bg-paper text-ink h-9 max-w-[16rem] border px-2"
            >
              <option value="">{t('app.capture.targetNone')}</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.title}
                </option>
              ))}
            </select>
          ) : null}
          <span className="label text-ink-soft ml-auto">{t('app.chat.hint')}</span>
          <Button
            type="button"
            disabled={busy || draft.trim().length === 0}
            onClick={() => (fallbackOnly ? void record() : void sendMessage({ text: draft.trim() }))}
            className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-9 px-4 disabled:opacity-60"
          >
            {fallbackOnly ? t('app.chat.record') : t('app.chat.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

The locale block in Step 4 gains `you` and `partner` for the turn labels. No avatars, no bubbles, no ellipsis animation — turns are a label and a body in the paper/ink/rule system.

- [ ] **Step 6: Verify**

Run: `pnpm test`, `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/app/components/chat/ apps/app/lib/chat/ apps/app/tests/unit/chat-send-mode.test.ts packages/i18n/src/locales/
git commit -m "feat(chat): the composer and transcript"
```

---

### Task 4: Mount it on the resume view only

**Files:**
- Modify: `apps/app/app/(workspace)/projects/[slug]/layout.tsx`
- Create: `apps/app/components/chat/project-composer.tsx`

- [ ] **Step 1: Write the switch**

`CaptureBar` is mounted in the project layout, so it renders on every tab. A layout cannot see which child route is active, so the decision is made client-side.

Create `apps/app/components/chat/project-composer.tsx`:

```tsx
'use client';

import { usePathname } from 'next/navigation';

import { CaptureBar } from '@/components/capture/capture-bar';
import type { CaptureTarget } from '@/lib/capture/targets';
import { PartnerChat } from './partner-chat';

/**
 * One composer, switching on the route.
 *
 * The chat is chat-capable only where the transcript is. A composer on the log
 * page would send messages into a conversation the owner cannot see, which is
 * why "replace the capture bar" could not mean everywhere — spec §7.1.
 *
 * Decided from the pathname rather than a prop because the layout renders this
 * and a layout does not know its active child route. The resume view is the
 * project root, so the test is an exact match on the project path.
 */
export function ProjectComposer(props: {
  slug: string;
  targets: CaptureTarget[];
  initialMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  hasPartner: boolean;
}) {
  const pathname = usePathname();
  const root = `/projects/${props.slug}`;
  const onResume = pathname === root || pathname === `${root}/`;

  if (!onResume || !props.hasPartner) {
    return <CaptureBar slug={props.slug} targets={props.targets} />;
  }
  return <PartnerChat {...props} />;
}
```

- [ ] **Step 2: Feed it from the layout**

In `apps/app/app/(workspace)/projects/[slug]/layout.tsx`, replace the `CaptureBar` import and element. The layout already resolves the project and its work items; it additionally resolves the Partner and, if there is one, the stored transcript:

```tsx
import { getOrCreateConversation, listMessages } from '@/lib/db/conversations';
import { ProjectComposer } from '@/components/chat/project-composer';
```

```tsx
  const { data: partner } = await supabase
    .from('agents')
    .select('id, is_active')
    .eq('project_id', project.id)
    .eq('slug', 'partner')
    .maybeSingle();

  // Resolved server-side so a reload shows the stored transcript rather than
  // an empty conversation over the top of one. A project with no Partner —
  // deleted, or created before this shipped — gets the capture bar unchanged,
  // which is the §10 row for exactly that case.
  const hasPartner = Boolean(partner?.is_active);
  const seed = hasPartner
    ? await listMessages(
        supabase,
        (
          await getOrCreateConversation(supabase, {
            projectId: project.id,
            ownerId: userId,
            agentId: partner!.id,
          })
        ).id
      )
    : [];
```

```tsx
        <ProjectComposer
          slug={slug}
          targets={captureTargetsFrom(workItems)}
          hasPartner={hasPartner}
          initialMessages={seed.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        />
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`, `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(workspace)/projects/[slug]/layout.tsx" apps/app/components/chat/project-composer.tsx
git commit -m "feat(chat): chat on the resume view, capture bar everywhere else"
```

---

### Task 5: Live verification

The deferred work from 2d-1 and 2d-2 lands here. Both slices built capabilities with no caller; this is the first time either runs.

- [ ] **Step 1: Create a project and talk to the Partner**

Confirm, in order:

1. The composer on the resume view is the chat; the log and work tabs still show the capture bar.
2. A question gets an answer grounded in the record.
3. `⌘⇧↵` records an entry with no run — check `agent_runs` gains no row.
4. Telling it something it should write down produces an entry with `agent_id` set to the Partner.
5. Asking it to break the project down produces a **second** run for the Planner, and any proposal carries the Planner's `agent_id`.

- [ ] **Step 2: Verify in SQL**

```sql
select a.slug, r.trigger, r.status, r.step_count, r.conversation_id is not null as linked,
       (select count(*) from proposals p where p.run_id = r.id) as proposals
from agent_runs r join agents a on a.id = r.agent_id
where r.project_id = '<id>' order by r.started_at;

select role, left(content, 60) as content, run_id is not null as has_run
from messages where project_id = '<id>' order by created_at;

select kind, agent_id is not null as by_agent, left(body, 60) from entries where project_id = '<id>';
```

Expected: Partner runs carry `trigger = 'conversation'` and a non-null `conversation_id`; a delegated run carries the sub-agent's id; assistant messages carry a `run_id` and user messages do not; a recorded entry carries the Partner's `agent_id`.

- [ ] **Step 3: Verify the refusal paths**

Set the project's monthly cap to `0` in settings, then send a message. Expected: the composer says record-only and `⌘↵` writes to the log. Restore the cap afterwards.

- [ ] **Step 4: Fix what this finds, delete the throwaway project, and finish**

Use superpowers:finishing-a-development-branch.

---

## Deferred

- **Multiple conversations and a picker.** `unique (project_id, agent_id)` enforces one thread; dropping it is the first step.
- **In-conversation spend signal.** Spec §15 — a thread's cost is unbounded where the intake's was two runs. The monthly cap is the only backstop.
- **The inline "ask about this work item" affordance** phase 2 §8 describes, which would set `work_item_id` on the run and let `record_entry` file against an item.

## Done when

- Talking to the Partner on the resume view answers from the record, and the run appears in the trace with its conversation linked.
- `⌘⇧↵` records with no run, and remains available when the cap is reached.
- A delegated question produces two runs with two agent ids.
- A recorded entry carries the Partner's `agent_id`; an entry it tried to invent is refused.
- `pnpm test`, `pnpm typecheck`, `pnpm test:rls` pass.

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, cn, Input, Textarea } from '@goalspace/ui';

import type { WorkItem } from '@/lib/db/work-items';
import { workItemStatuses, type WorkItemStatus } from '@/lib/schemas/common';
import { computeProgress } from '@/lib/work-items/progress';
import { buildTree, flattenTree, type TreeNode } from '@/lib/work-items/tree';
import { changeStatusAction, createWorkItemAction } from '@/app/(workspace)/actions';

/**
 * Visual indent stops here. Beyond four levels the rows are narrower than the
 * text in them, and a project nested that deep has an organisation problem the
 * interface should not spend horizontal space pretending is fine. Depth is
 * still correct in the data; only the indentation saturates.
 */
const MAX_INDENT_DEPTH = 4;

export function WorkTree({ slug, items }: { slug: string; items: WorkItem[] }) {
  const { t } = useAppTranslations();
  const router = useRouter();
  const [, startRefresh] = useTransition();

  // Derived here rather than passed in: these are the same pure functions the
  // server uses, so running them on the client costs nothing and avoids
  // serialising a Map across the RSC boundary.
  const { roots, orphans, cyclic } = useMemo(() => buildTree(items), [items]);
  const progress = useMemo(() => computeProgress(items), [items]);
  const ordered = useMemo(() => flattenTree(roots), [roots]);

  const [closing, setClosing] = useState<{ id: string; title: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyStatus(id: string, status: WorkItemStatus, closingEntryBody?: string) {
    setBusyId(id);
    setError(null);

    try {
      const result = await changeStatusAction(slug, {
        id,
        status,
        ...(closingEntryBody ? { closingEntryBody } : {}),
      });

      if (!result.ok) {
        setError(t(result.message));
        return;
      }

      setClosing(null);
      startRefresh(() => router.refresh());
    } catch (caught) {
      // A rejected action would otherwise leave the row disabled forever.
      console.error('changeStatusAction rejected', caught);
      setError(t('app.errors.generic'));
    } finally {
      setBusyId(null);
    }
  }

  function onStatusPicked(item: WorkItem, next: WorkItemStatus) {
    if (next === item.status) return;

    // Closing prompts for the entry that closed it. That prompt is the engine
    // of the product: nobody sits down to write documentation, they just
    // finish things, and the record accrues as a by-product.
    if (next === 'done') {
      setClosing({ id: item.id, title: item.title });
      return;
    }

    void applyStatus(item.id, next);
  }

  return (
    <div className="pb-10">
      {error ? (
        <p role="alert" className="label border-oxide text-oxide mb-4 border p-3">
          {error}
        </p>
      ) : null}

      {ordered.length === 0 ? (
        <div className="py-10">
          <h2 className="text-title text-ink">{t('app.work.empty')}</h2>
          <p className="prose-measure text-ink-soft mt-2">{t('app.work.emptyBody')}</p>
        </div>
      ) : (
        <ul className="border-rule border-t">
          {ordered.map((node) => (
            <WorkRow
              key={node.id}
              node={node}
              done={progress.get(node.id)}
              busy={busyId === node.id}
              onPick={onStatusPicked}
              t={t}
            >
              {/* Rendered inside the row it belongs to, not at the foot of the
                  tree. Appended at the bottom it was both detached from its
                  subject and hidden behind the sticky capture bar. */}
              {closing?.id === node.id ? (
                <CloseWithEntry
                  title={closing.title}
                  busy={busyId === closing.id}
                  onCancel={() => setClosing(null)}
                  onSubmit={(body) => applyStatus(closing.id, 'done', body || undefined)}
                  t={t}
                />
              ) : null}
            </WorkRow>
          ))}
        </ul>
      )}

      <AddItem slug={slug} onAdded={() => startRefresh(() => router.refresh())} t={t} />

      {orphans.length + cyclic.length > 0 ? (
        <p className="label border-oxide text-oxide mt-8 border p-3">
          {t('app.resume.anomalyBody', { count: orphans.length + cyclic.length })}
        </p>
      ) : null}
    </div>
  );
}

type T = (key: string, vars?: Record<string, unknown>) => string;

function WorkRow({
  node,
  done,
  busy,
  onPick,
  t,
  children,
}: {
  node: TreeNode<WorkItem>;
  done?: { done: number; total: number };
  busy: boolean;
  onPick: (item: WorkItem, next: WorkItemStatus) => void;
  t: T;
  children?: React.ReactNode;
}) {
  const indent = Math.min(node.depth, MAX_INDENT_DEPTH) * 20;
  const closed = node.status === 'done' || node.status === 'dropped';

  return (
    <li id={node.id} className="border-rule border-b">
      <div
        className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3"
        style={{ paddingLeft: indent }}
      >
        <select
          aria-label={t('app.work.setStatus')}
          value={node.status}
          disabled={busy}
          onChange={(event) => onPick(node, event.target.value as WorkItemStatus)}
          className={cn(
            'label border-input bg-paper shrink-0 border px-2 py-1',
            node.status === 'blocked' && 'text-waiting',
            node.status === 'doing' && 'text-oxide',
            node.status !== 'blocked' && node.status !== 'doing' && 'text-ink-soft'
          )}
        >
          {workItemStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`app.status.${status}`)}
            </option>
          ))}
        </select>

        {node.kind === 'question' ? (
          <span className="label text-oxide shrink-0">{t('app.kind.question')}</span>
        ) : null}

        <span
          className={cn(
            'text-body min-w-0 flex-1',
            // A closed item stays legible rather than being greyed into
            // illegibility: the record of what was finished is the point.
            closed ? 'text-ink-soft decoration-rule-strong line-through' : 'text-ink'
          )}
        >
          {node.title}
        </span>

        {done && done.total > 0 ? (
          <span className="label text-ink-soft shrink-0 tabular-nums">
            {done.done}/{done.total}
          </span>
        ) : null}
      </div>
      {children ? <div style={{ paddingLeft: indent }}>{children}</div> : null}
    </li>
  );
}

function CloseWithEntry({
  title,
  busy,
  onCancel,
  onSubmit,
  t,
}: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (body: string) => void;
  t: T;
}) {
  const [body, setBody] = useState('');

  return (
    <div className="border-rule-strong mb-4 border p-5">
      <p className="label text-ink-soft">{t('app.work.closeWithEntry')}</p>
      <p className="text-title text-ink mt-1">{title}</p>

      <Textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="border-input bg-paper text-body text-ink mt-4"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={() => onSubmit(body.trim())}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-10 px-5"
        >
          {t('app.work.closeSubmit')}
        </Button>
        {/* The note is optional on purpose. Requiring it would turn every
            status change into a writing task, and the predictable result is
            that people stop marking things done at all. */}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onSubmit('')}
          className="label border-rule-strong bg-paper text-ink hover:bg-paper-shade h-10 px-5"
        >
          {t('app.work.closeSkip')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onCancel}
          className="label text-ink-soft hover:bg-paper-shade hover:text-ink h-10 px-3"
        >
          {t('app.common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function AddItem({ slug, onAdded, t }: { slug: string; onAdded: () => void; t: T }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'task' | 'question'>('task');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;

    setBusy(true);
    setError(null);

    try {
      const result = await createWorkItemAction(slug, { title: value, kind });

      if (!result.ok) {
        setError(t(result.message));
        return;
      }

      setTitle('');
      onAdded();
    } catch (caught) {
      console.error('createWorkItemAction rejected', caught);
      setError(t('app.errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-wrap items-center gap-3">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('app.work.addItem')}
        aria-label={t('app.work.addItem')}
        className="border-input bg-paper text-body text-ink placeholder:text-ink-soft h-10 min-w-0 flex-1"
      />
      <select
        aria-label={t('app.capture.kindLabel')}
        value={kind}
        onChange={(event) => setKind(event.target.value as 'task' | 'question')}
        className="label border-input bg-paper text-ink border px-2 py-2"
      >
        <option value="task">{t('app.kind.task')}</option>
        <option value="question">{t('app.kind.question')}</option>
      </select>
      <Button
        type="submit"
        disabled={busy || title.trim().length === 0}
        className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-10 px-5 disabled:opacity-50"
      >
        {t('app.work.addItem')}
      </Button>
      {error ? (
        <p role="alert" className="label text-oxide w-full">
          {error}
        </p>
      ) : null}
    </form>
  );
}

'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Textarea } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { captureEntryAction } from '@/app/(workspace)/actions';
import { entryKinds, type EntryKind } from '@/lib/schemas/common';
import type { CaptureTarget } from '@/lib/capture/targets';

interface PendingEntry {
  tempId: string;
  body: string;
  kind: EntryKind;
}

/**
 * Quick capture, always mounted.
 *
 * Capture friction is the whole bet: if writing something down is more than a
 * keystroke away, the record never accumulates and every later phase of the
 * product has nothing to stand on. So this lives in the project layout rather
 * than on one page, which also means typed text survives navigating between
 * Resume, Work, and Log.
 */
export function CaptureBar({ slug, targets }: { slug: string; targets: CaptureTarget[] }) {
  const { t } = useAppTranslations();
  const router = useRouter();

  const [body, setBody] = useState('');
  const [kind, setKind] = useState<EntryKind>('note');
  const [workItemId, setWorkItemId] = useState<string>('');
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const awaitingRefresh = useRef(false);

  /**
   * The modifier glyph, resolved after mount.
   *
   * The server cannot know the platform, so rendering a guess would either
   * mismatch during hydration or tell a Mac user to press the wrong key. Null
   * until mounted; the slot below reserves its width so nothing shifts when
   * the text appears.
   */
  const [modifierKey, setModifierKey] = useState<string | null>(null);
  useEffect(() => {
    const isApple = /Mac|iPhone|iPad|iPod/.test(
      navigator.userAgent + ' ' + (navigator.platform ?? '')
    );
    setModifierKey(isApple ? '⌘ ↵' : 'Ctrl ↵');
  }, []);
  const bodyId = useId();
  const kindId = useId();
  const targetId = useId();
  const errorId = useId();

  // Optimistic rows are held until the refreshed server data actually lands,
  // rather than being dropped the moment the action resolves. Dropping them
  // early leaves a gap where the entry exists in neither list and appears to
  // have been lost, which is precisely the anxiety this feature must avoid.
  useEffect(() => {
    if (awaitingRefresh.current && !isRefreshing) {
      awaitingRefresh.current = false;
      setPending([]);
    }
  }, [isRefreshing]);

  async function submit() {
    const draft = body.trim();
    if (draft.length === 0 || saving) return;

    const tempId = crypto.randomUUID();
    const optimistic: PendingEntry = { tempId, body: draft, kind };

    // Clear the field first so the next thought can be typed immediately. The
    // text is still held in `draft`, and restored on failure below.
    setBody('');
    setError(null);
    setPending((rows) => [optimistic, ...rows]);
    setSaving(true);

    const result = await captureEntryAction(slug, {
      kind,
      body: draft,
      work_item_id: workItemId === '' ? null : workItemId,
    });

    setSaving(false);

    if (!result.ok) {
      setPending((rows) => rows.filter((r) => r.tempId !== tempId));
      // Losing captured text is the worst failure this product has, so the
      // draft goes back in the box exactly as typed and the user can retry
      // without retyping a word.
      setBody(draft);
      setError(t(result.message));
      textareaRef.current?.focus();
      return;
    }

    awaitingRefresh.current = true;
    startRefresh(() => router.refresh());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Enter on Apple keyboards, Ctrl+Enter elsewhere. Enter alone inserts
    // a newline, because entries are frequently more than one line.
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="sticky bottom-0 z-20 -mx-5 border-t border-rule bg-paper px-5 pb-4 pt-3">
      {/* Optimistic rows sit directly above the composer, so what was just
          written is visible without looking anywhere else. */}
      {pending.length > 0 ? (
        <ul aria-live="polite" className="mb-3">
          {pending.map((row) => (
            <li
              key={row.tempId}
              className="flex items-baseline gap-3 border-b border-rule py-2 opacity-60"
            >
              <span className="label shrink-0 text-ink-soft">{t(`app.entryKind.${row.kind}`)}</span>
              <span className="min-w-0 flex-1 truncate text-body text-ink">{row.body}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={bodyId} className="sr-only">
          {t('app.capture.placeholder')}
        </label>
        <Textarea
          id={bodyId}
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={t('app.capture.placeholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-[4.5rem] resize-y border-input bg-paper text-body text-ink placeholder:text-ink-soft"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor={kindId} className="label text-ink-soft">
              {t('app.capture.kindLabel')}
            </label>
            {/* A native select, not a custom listbox. Four options, and the
                platform control is keyboard- and screen-reader-correct for
                free on every device this has to work on. */}
            <select
              id={kindId}
              value={kind}
              onChange={(event) => setKind(event.target.value as EntryKind)}
              className="label border border-input bg-paper px-2 py-1.5 text-ink"
            >
              {entryKinds.map((value) => (
                <option key={value} value={value}>
                  {t(`app.entryKind.${value}`)}
                </option>
              ))}
            </select>
          </div>

          {targets.length > 0 ? (
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor={targetId} className="label shrink-0 text-ink-soft">
                {t('app.capture.attachTo')}
              </label>
              <select
                id={targetId}
                value={workItemId}
                onChange={(event) => setWorkItemId(event.target.value)}
                className="label min-w-0 max-w-56 truncate border border-input bg-paper px-2 py-1.5 text-ink"
              >
                <option value="">{t('app.capture.attachNone')}</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-4">
            {/* Fixed width so the Record button does not jump sideways when
                the platform-specific text arrives after mount. */}
            <span
              aria-hidden="true"
              className="label hidden min-w-[7rem] text-right text-ink-soft sm:inline"
            >
              {modifierKey ? t('app.capture.hint', { keys: modifierKey }) : ''}
            </span>
            <Button
              type="submit"
              disabled={saving || body.trim().length === 0}
              className="label h-10 bg-primary px-5 text-primary-foreground hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {saving ? t('app.capture.submitting') : t('app.capture.submit')}
            </Button>
          </div>
        </div>

        {error ? (
          <p id={errorId} role="alert" className="label mt-3 text-oxide">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}


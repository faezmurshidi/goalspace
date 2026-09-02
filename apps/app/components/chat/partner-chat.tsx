'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';

import { Markdown } from '@/components/docs/markdown';
import type { CaptureTarget } from '@/lib/capture/targets';
import { approvalOutcomesFrom, approvalRequestsFrom } from '@/lib/chat/approvals';
import { proposalNoticesFrom } from '@/lib/chat/proposal-notices';
import { sendModeFor } from '@/lib/chat/send-mode';
import { entryKinds } from '@/lib/schemas/common';
import { captureEntryAction } from '@/app/(workspace)/actions';
import { EntryConfirmation } from './confirmation';
import { Conversation, ConversationContent, ConversationScrollButton } from './conversation';

export interface SeedMessage {
  id: string;
  role: 'user' | 'assistant';
  /**
   * The turn as stored, tool calls and approval state included.
   *
   * Seeded rather than rebuilt from text: an approval the owner has not
   * answered lives in an assistant turn's parts, and reconstructing the turn as
   * one text part discarded the question along with the entry behind it.
   */
  parts: unknown[];
}

/**
 * The model layer is unavailable, and the composer should say so and keep
 * writing to the log.
 *
 * The transport throws with the response body in the message, so the markers
 * the route sends — a 402 carrying `cap`, or `partner_missing` — are what is
 * matched. Crude, and deliberately failing toward record-only: a false positive
 * costs the owner a chat turn, a false negative costs them the ability to write
 * anything down.
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

  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chat/${slug}` }),
    /**
     * Resume the run once every pending approval has an answer.
     *
     * Without this, `addToolApprovalResponse` writes the decision into local
     * state and stops: the send is guarded by `this.sendAutomaticallyWhen`
     * inside the SDK, so with no predicate configured nothing is ever sent and
     * the approved tool never executes. The owner sees the decision recorded in
     * the transcript and no entry in the log — which is worse than the direct
     * write it replaced, because the interface agrees with an outcome that did
     * not happen.
     */
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    // The server-rendered transcript, so a reload does not start an empty
    // conversation over the top of a stored one.
    messages: initialMessages as UIMessage[],
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

    // The draft is cleared only on success. Losing captured text is the worst
    // failure this product has, and a failed write must leave it recoverable.
    if (result.ok) setDraft('');
    else setNotice(t(result.message));
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void sendMessage({ text });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mode = sendModeFor(event.nativeEvent, fallbackOnly);
    if (!mode) return;
    event.preventDefault();
    if (mode === 'record') void record();
    else send();
  }

  return (
    // Fills whatever it is given. The shell decides whether that is a column
    // down the right or a band across the bottom; this only has to keep the
    // transcript scrolling and the composer in view. min-h-0 is what lets the
    // transcript shrink inside a flex parent rather than overflowing it.
    <div className="flex min-h-0 flex-1 flex-col">
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
                  <>
                    <Markdown className="mt-1">{textOf(message)}</Markdown>
                    {/* Drawn from the delegated run's own rows, never from what
                        the Partner says about them. When it claims a proposal
                        and none was filed, nothing renders here and the claim
                        stands alone. */}
                    {proposalNoticesFrom(message.parts).map((notice, index) => (
                      <Link
                        key={`${notice.agent}-${index}`}
                        href={`/projects/${slug}/inbox`}
                        className="label text-oxide mt-2 inline-block underline"
                      >
                        {t('app.chat.proposals', { count: notice.count, agent: notice.agent })}
                      </Link>
                    ))}

                    {/* Nothing is written until one of these is answered. */}
                    {approvalRequestsFrom(message.parts).map((entry) => (
                      <EntryConfirmation
                        key={entry.approvalId}
                        entry={entry}
                        busy={busy}
                        onDecide={(approved) =>
                          addToolApprovalResponse({ id: entry.approvalId, approved })
                        }
                      />
                    ))}

                    {approvalOutcomesFrom(message.parts).map((outcome) => (
                      <p key={outcome.approvalId} className="label text-ink-soft mt-2">
                        {t(
                          outcome.approved ? 'app.chat.confirmAccepted' : 'app.chat.confirmRejected'
                        )}
                      </p>
                    ))}
                  </>
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
      <p role="status" aria-live="polite" className="label text-ink-soft min-h-5 px-4 pt-2">
        {busy && !recording ? t('app.chat.thinking') : null}
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
              aria-label={t('app.capture.attachTo')}
              value={workItemId}
              onChange={(event) => setWorkItemId(event.target.value)}
              className="label border-input bg-paper text-ink h-9 max-w-[16rem] border px-2"
            >
              <option value="">{t('app.capture.attachNone')}</option>
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
            onClick={() => (fallbackOnly ? void record() : send())}
            className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper h-9 px-4 disabled:opacity-60"
          >
            {fallbackOnly ? t('app.chat.record') : t('app.chat.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}

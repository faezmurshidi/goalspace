'use client';

import { useAppTranslations } from '@goalspace/i18n';

/**
 * What the agent worked through, folded away.
 *
 * Shaped after AI SDK Elements' Reasoning, built on a native `<details>` rather
 * than vendored. The upstream component manages open state, auto-expands while
 * streaming and collapses on finish; a disclosure element does the same job
 * with no state, correct keyboard behaviour for free, and nothing to animate.
 *
 * Closed by default, including while streaming. Reasoning that unfurls on its
 * own is the register PRODUCT.md names as the anti-reference — the point here
 * is that the owner can check the working when a claim looks wrong, not that
 * the interface performs thinking at them.
 */
export function Reasoning({ text, streaming }: { text: string; streaming: boolean }) {
  const { t } = useAppTranslations();
  if (!text) return null;

  return (
    <details className="mt-2">
      <summary className="label text-ink-soft cursor-pointer select-none">
        {streaming ? t('app.chat.reasoningLive') : t('app.chat.reasoning')}
      </summary>
      <p className="prose-measure text-ink-soft border-rule mt-2 whitespace-pre-line border-l pl-3">
        {text}
      </p>
    </details>
  );
}

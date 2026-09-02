/**
 * Which of the composer's two sends a keystroke means.
 *
 * Pure, because it is the one piece of the composer that must not be wrong.
 * `⌘↵` talks to the Partner; `⌘⇧↵` writes straight to the log with no run, no
 * cost and no gateway. Bare Enter is a newline, as it has always been in the
 * capture bar.
 *
 * `fallbackOnly` collapses both to `record`. When the monthly cap is reached or
 * the gateway is erroring there is no chat to send to, and the honest behaviour
 * is a working notebook rather than an input that swallows keystrokes. Losing
 * what the owner typed is the worst failure this product has.
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

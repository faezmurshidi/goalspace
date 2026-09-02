/**
 * Hand a work item to the Partner without leaving the resume view.
 *
 * A browser event rather than shared state, because the two ends are siblings:
 * the resume regions are rendered by the page and the composer by the shell
 * around it, so neither can hold the other's state without lifting it to a
 * provider that exists for this one message.
 *
 * The caller passes finished text rather than a title to phrase here. The draft
 * is user-visible and this app ships three locales; composing it in a plain
 * module would have hard-coded English into the composer.
 *
 * The composer fills its draft and takes focus. It deliberately does not send —
 * what to ask about an open item is the owner's to phrase, and a question fired
 * off unread gets an answer to the wrong thing.
 */
export const ASK_ABOUT_EVENT = 'goalspace:ask-about';

export function askPartnerAbout(draft: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ASK_ABOUT_EVENT, { detail: { draft } }));
}

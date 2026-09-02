/**
 * Hand a work item to the Partner without leaving the resume view.
 *
 * A browser event rather than shared state, because the two ends are siblings:
 * the resume regions are rendered by the page and the composer by the shell
 * around it, so neither can hold the other's state without lifting it to a
 * provider that exists for this one message.
 *
 * The composer fills its draft and takes focus. It deliberately does not send
 * — what to ask about an open question is the owner's to phrase, and a question
 * fired off unread is how you get an answer to the wrong thing.
 */
export const ASK_ABOUT_EVENT = 'goalspace:ask-about';

export function askPartnerAbout(title: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ASK_ABOUT_EVENT, { detail: { title } }));
}

export function askAboutDraft(title: string): string {
  return `About this open question — "${title}" — `;
}

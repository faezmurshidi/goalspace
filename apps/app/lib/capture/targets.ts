/**
 * Shared by the server layout that computes the list and the client capture
 * bar that renders it.
 *
 * Deliberately its own module with no 'use client' directive. It previously
 * lived beside the CaptureBar component, which made it part of a client
 * module, and a Server Component calling into one of those fails at runtime:
 * client exports can be rendered or passed as props, never invoked from the
 * server.
 */
export interface CaptureTarget {
  id: string;
  title: string;
}

/**
 * Only live work is offered as an attachment target. Filing a note against
 * something finished or abandoned is nearly always a mis-click, and a select
 * holding every item a long project ever had is unusable.
 */
export function captureTargetsFrom(
  items: readonly { id: string; title: string; status: string }[]
): CaptureTarget[] {
  return items
    .filter((item) => item.status !== 'done' && item.status !== 'dropped')
    .map(({ id, title }) => ({ id, title }));
}

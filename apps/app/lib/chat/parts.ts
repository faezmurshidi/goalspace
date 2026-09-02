/**
 * The text of a turn, flattened out of its parts.
 *
 * `messages.content` holds this. The parts are the record of what the turn
 * actually was; the text is what anything reading a message as prose wants —
 * the citable-turn index the Partner is given, and any search over the
 * conversation later.
 *
 * Only text parts contribute. A turn whose whole content was a tool call has no
 * prose, and inventing some for it would put a description of a tool call into
 * a column that is supposed to hold what was said.
 */
export function textFromParts(parts: readonly unknown[] | undefined): string {
  return (parts ?? [])
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string'
    )
    .map((part) => part.text)
    .join('');
}

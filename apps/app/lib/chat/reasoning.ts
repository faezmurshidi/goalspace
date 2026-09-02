/**
 * What the model worked through before answering, as one block.
 *
 * A model can emit several reasoning segments in a turn. They are joined rather
 * than rendered separately, so a turn shows one "thought about this" rather
 * than a row of indicators that say nothing individually.
 *
 * Only some models produce this at all: `zai/glm-5.3-flash` does,
 * `openai/gpt-4o-mini` does not. Returning empty for the latter is the whole
 * handling that case needs — the caller renders nothing.
 */
export function reasoningFrom(parts: readonly unknown[] | undefined): string {
  return (parts ?? [])
    .filter(
      (part): part is { type: 'reasoning'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        (part as { type?: unknown }).type === 'reasoning' &&
        typeof (part as { text?: unknown }).text === 'string'
    )
    .map((part) => part.text.trim())
    .filter((text) => text.length > 0)
    .join('\n\n');
}

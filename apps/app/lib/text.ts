/**
 * Truncate to a number of user-perceived characters.
 *
 * Three notions of "length" are in play and only one of them is the reader's.
 * `String.length` counts UTF-16 code units, so an astral character costs two
 * and can be cut in half, leaving a lone surrogate that renders as a
 * replacement glyph. Iterating with `for...of` fixes the splitting but still
 * counts by code point, which breaks a combining mark away from its base
 * letter and shreds a ZWJ emoji sequence into unrelated people.
 *
 * Segmenting by grapheme is the only one that matches what somebody sees, so a
 * limit of 80 means 80 characters as read, whatever they are made of.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function previewText(text: string, limit: number): string {
  if (text.length <= limit) return text;

  // Intl.Segmenter is in every runtime this targets (Node 18+, and every
  // browser the app supports). The fallback iterates code points, which still
  // never splits a surrogate pair, so the worst case is a slightly awkward cut
  // rather than broken output.
  const units: string[] = segmenter
    ? Array.from(segmenter.segment(text), (part) => part.segment)
    : Array.from(text);

  if (units.length <= limit) return text;

  return `${units.slice(0, limit).join('')}…`;
}

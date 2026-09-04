/**
 * How far the log has moved past each document.
 *
 * Pure, and over plain data, because this is the piece that can be wrong in a
 * way nobody notices: an off-by-one or a string comparison produces a number
 * that looks entirely plausible on the page.
 *
 * A document with no mark is absent from the result rather than present with
 * zero. Null means hand-written — it never claimed to synthesise the record —
 * and "0 entries since this was written" is a claim about a document that was
 * never written from the log. Absent and zero mean different things here, so
 * they are represented differently.
 *
 * The count is a fact and not a judgement. It cannot know whether those entries
 * matter to this document, and a note about ordering bearings counts against a
 * dial-design document. That noise is the accepted cost: the alternative is a
 * model call per document per render, producing an answer the owner cannot
 * check without doing the reading themselves.
 */
export function staleCounts(
  documents: readonly { id: string; synthesised_through: string | null }[],
  entryTimes: readonly string[]
): Map<string, number> {
  // Parsed once, not once per document. Compared as instants because Postgres
  // renders timestamptz as `2026-08-10 00:00:00+00` while an ISO string carries
  // a `Z`; compared as text every mark looks older than every entry.
  const times = entryTimes.map((time) => Date.parse(time)).filter((time) => !Number.isNaN(time));

  const counts = new Map<string, number>();

  for (const document of documents) {
    // A type check rather than a null check: PostgREST yields `undefined`,
    // not `null`, if this column is ever dropped from the explicit column
    // list a query selects. Today that distinction is invisible — Date.parse
    // of either is NaN, and the guard below catches it — but this is the
    // function this plan calls the piece that can be wrong in a way nobody
    // notices, so it says what is meant instead of relying on the next guard
    // to paper over a case this one should have named.
    if (typeof document.synthesised_through !== 'string') continue;

    const mark = Date.parse(document.synthesised_through);
    // A mark that will not parse is not evidence that the whole log is unread.
    // Saying nothing beats saying "412 entries since this was written".
    if (Number.isNaN(mark)) continue;

    // Strictly after: an entry exactly on the mark is the entry the document
    // was written from, so it has been read.
    counts.set(document.id, times.filter((time) => time > mark).length);
  }

  return counts;
}

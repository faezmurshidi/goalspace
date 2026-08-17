/**
 * Matches the work tree's row rhythm, including the indent steps, so the
 * hierarchy is legible before the data arrives and nothing shifts when it
 * does. Same reasoning as the resume skeleton: shaped, still, no pulse.
 */
const INDENTS = [0, 20, 20, 20, 0, 20, 20, 0, 0];

export default function WorkLoading() {
  return (
    <div aria-hidden="true" className="pt-8">
      <div className="h-3 w-16 bg-paper-shade" />
      <div className="mt-4 border-t border-rule">
        {INDENTS.map((indent, row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-rule py-4"
            style={{ paddingLeft: indent }}
          >
            <div className="h-6 w-24 shrink-0 bg-paper-shade" />
            <div className="h-3 flex-1 bg-paper-shade" />
            <div className="h-3 w-8 shrink-0 bg-paper-shade" />
          </div>
        ))}
      </div>
    </div>
  );
}

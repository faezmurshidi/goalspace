/**
 * The log's entries are prose, so the skeleton uses two-line text blocks
 * rather than the single bars the work tree uses. Matching the shape of what
 * is coming is the entire point of a skeleton.
 */
export default function LogLoading() {
  return (
    <div aria-hidden="true" className="pb-10 pt-8">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <div className="h-3 w-12 bg-paper-shade" />
        <div className="flex gap-4">
          {[0, 1, 2, 3, 4].map((chip) => (
            <div key={chip} className="h-3 w-14 bg-paper-shade" />
          ))}
        </div>
      </div>

      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="border-b border-rule py-4">
          <div className="flex gap-4">
            <div className="h-3 w-24 bg-paper-shade" />
            <div className="h-3 w-16 bg-paper-shade" />
            <div className="h-3 w-56 max-w-full bg-paper-shade" />
          </div>
          <div className="mt-3 h-3 w-full max-w-xl bg-paper-shade" />
          <div className="mt-2 h-3 w-2/3 max-w-md bg-paper-shade" />
        </div>
      ))}
    </div>
  );
}

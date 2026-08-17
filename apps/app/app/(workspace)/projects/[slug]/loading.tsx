/**
 * Shaped skeleton, not a spinner.
 *
 * A spinner says "something is happening"; this says "a masthead, then a
 * duration, then rows are coming", so the page does not jump when they
 * arrive. Rows use the same heights and hairline rules as the real content.
 *
 * Deliberately no pulse animation: the whole system is flat and still, and a
 * shimmering placeholder would be the only moving thing in the product.
 */
export default function ResumeLoading() {
  return (
    <div aria-hidden="true" className="pb-10">
      <div className="border-b border-ink pb-5 pt-8">
        <div className="h-7 w-72 max-w-full bg-paper-shade" />
        <div className="mt-4 h-4 w-full max-w-lg bg-paper-shade" />
        <div className="mt-5 h-3 w-64 max-w-full bg-paper-shade" />
      </div>

      <div className="pt-10">
        <div className="h-12 w-80 max-w-full bg-paper-shade" />
        <div className="mt-4 h-3 w-48 bg-paper-shade" />
      </div>

      <div className="pt-10">
        <div className="border-b border-rule pb-2">
          <div className="h-3 w-32 bg-paper-shade" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 border-b border-rule py-4">
            <div className="h-3 w-16 shrink-0 bg-paper-shade" />
            <div className="h-3 flex-1 bg-paper-shade" />
            <div className="h-3 w-8 shrink-0 bg-paper-shade" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

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
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="pb-10">
        <div className="border-ink border-b pb-5 pt-8">
          <div className="bg-paper-shade h-7 w-72 max-w-full" />
          <div className="bg-paper-shade mt-4 h-4 w-full max-w-lg" />
          <div className="bg-paper-shade mt-5 h-3 w-64 max-w-full" />
        </div>

        <div className="pt-10">
          <div className="bg-paper-shade h-12 w-80 max-w-full" />
          <div className="bg-paper-shade mt-4 h-3 w-48" />
        </div>

        <div className="pt-10">
          <div className="border-rule border-b pb-2">
            <div className="bg-paper-shade h-3 w-32" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="border-rule flex items-center gap-4 border-b py-4">
              <div className="bg-paper-shade h-3 w-16 shrink-0" />
              <div className="bg-paper-shade h-3 flex-1" />
              <div className="bg-paper-shade h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

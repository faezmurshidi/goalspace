import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * A document row is a title, an optional agent label, and a date, so the
 * skeleton is a single bar per row rather than the log's two-line entry
 * bodies. Matching the shape of what is coming is the entire point of a
 * skeleton.
 */
export default function DocumentsLoading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="mx-auto w-full max-w-4xl px-6 pt-8">
        <div className="border-rule flex items-baseline justify-between border-b pb-2">
          <div className="bg-paper-shade h-3 w-20" />
          <div className="bg-paper-shade h-8 w-40" />
        </div>

        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="border-rule flex items-baseline gap-4 border-b py-3">
            <div className="bg-paper-shade h-3 flex-1" />
            <div className="bg-paper-shade h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}

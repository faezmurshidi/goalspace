import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * The log's entries are prose, so the skeleton uses two-line text blocks
 * rather than the single bars the work tree uses. Matching the shape of what
 * is coming is the entire point of a skeleton.
 */
export default function LogLoading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="pb-10 pt-8">
        <div className="border-rule flex items-baseline justify-between border-b pb-2">
          <div className="bg-paper-shade h-3 w-12" />
          <div className="flex gap-4">
            {[0, 1, 2, 3, 4].map((chip) => (
              <div key={chip} className="bg-paper-shade h-3 w-14" />
            ))}
          </div>
        </div>

        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="border-rule border-b py-4">
            <div className="flex gap-4">
              <div className="bg-paper-shade h-3 w-24" />
              <div className="bg-paper-shade h-3 w-16" />
              <div className="bg-paper-shade h-3 w-56 max-w-full" />
            </div>
            <div className="bg-paper-shade mt-3 h-3 w-full max-w-xl" />
            <div className="bg-paper-shade mt-2 h-3 w-2/3 max-w-md" />
          </div>
        ))}
      </div>
    </>
  );
}

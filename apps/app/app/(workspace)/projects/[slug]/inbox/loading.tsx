import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * A proposal is a paragraph of rationale above a block of payload, so the
 * skeleton is a text line above a slab. Matching the shape of what is coming
 * is the entire point of a skeleton.
 */
export default function InboxLoading() {
  return (
    <>
      <LoadingAnnouncement />
      <div aria-hidden="true" className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="bg-paper-shade h-4 w-20" />
        {[0, 1].map((card) => (
          <div key={card} className="border-rule mt-6 border p-4">
            <div className="bg-paper-shade h-3 w-3/4 max-w-md" />
            <div className="bg-paper-shade mt-4 h-24 w-full" />
            <div className="mt-4 flex gap-2">
              <div className="bg-paper-shade h-9 w-20" />
              <div className="bg-paper-shade h-9 w-20" />
              <div className="bg-paper-shade h-9 w-20" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

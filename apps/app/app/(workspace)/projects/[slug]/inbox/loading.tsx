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
        <div className="h-4 w-20 bg-paper-shade" />
        {[0, 1].map((card) => (
          <div key={card} className="mt-6 border border-rule p-4">
            <div className="h-3 w-3/4 max-w-md bg-paper-shade" />
            <div className="mt-4 h-24 w-full bg-paper-shade" />
            <div className="mt-4 flex gap-2">
              <div className="h-9 w-20 bg-paper-shade" />
              <div className="h-9 w-20 bg-paper-shade" />
              <div className="h-9 w-20 bg-paper-shade" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

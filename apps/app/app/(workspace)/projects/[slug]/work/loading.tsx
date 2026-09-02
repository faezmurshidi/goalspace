import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * Matches the work tree's row rhythm, including the indent steps, so the
 * hierarchy is legible before the data arrives and nothing shifts when it
 * does. Same reasoning as the resume skeleton: shaped, still, no pulse.
 */
const INDENTS = [0, 20, 20, 20, 0, 20, 20, 0, 0];

export default function WorkLoading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="pt-8">
        <div className="bg-paper-shade h-3 w-16" />
        <div className="border-rule mt-4 border-t">
          {INDENTS.map((indent, row) => (
            <div
              key={row}
              className="border-rule flex items-center gap-4 border-b py-4"
              style={{ paddingLeft: indent }}
            >
              <div className="bg-paper-shade h-6 w-24 shrink-0" />
              <div className="bg-paper-shade h-3 flex-1" />
              <div className="bg-paper-shade h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

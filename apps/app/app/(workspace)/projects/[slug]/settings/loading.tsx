import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * Three sections — project, spend, danger zone — each behind its own hairline
 * rule, matching the page's own heading rhythm so the swap does not jump. The
 * spend section gets three label/value rows because that is what it renders:
 * spent this month, the monthly cap, and the worst-case reservation.
 */
export default function SettingsLoading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="mx-auto w-full max-w-4xl px-6">
        <div className="flex flex-col gap-10 pb-10 pt-8">
          <div className="border-rule bg-paper-shade h-3 w-20 border-b pb-2" />

          <div className="flex flex-col gap-4">
            <div className="border-rule bg-paper-shade h-3 w-16 border-b pb-2" />
            <div className="bg-paper-shade h-9 w-full max-w-md" />
            <div className="bg-paper-shade h-24 w-full max-w-2xl" />
            <div className="bg-paper-shade h-9 w-40" />
          </div>

          <div className="border-rule flex flex-col gap-4 border-t pt-10">
            <div className="border-rule bg-paper-shade h-3 w-28 border-b pb-2" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-baseline justify-between gap-4">
                <div className="bg-paper-shade h-3 w-40" />
                <div className="bg-paper-shade h-4 w-20" />
              </div>
            ))}
            <div className="bg-paper-shade h-9 w-full max-w-md" />
          </div>

          <div className="border-rule border-t pt-10">
            <div className="border-rule bg-paper-shade h-3 w-24 border-b pb-2" />
            <div className="bg-paper-shade mt-4 h-9 w-40" />
          </div>
        </div>
      </div>
    </>
  );
}

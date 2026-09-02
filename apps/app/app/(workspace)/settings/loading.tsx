import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/**
 * One section, matching the page's own heading rhythm: a label, then the
 * theme/language pair side by side, then a wider time-zone field, then a
 * checkbox row, then the save control. Matches all seven sibling
 * `loading.tsx` files: `LoadingAnnouncement` first, then a flat, still,
 * `aria-hidden` skeleton shaped like what is coming — no pulse animation.
 */
export default function AccountSettingsLoading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="mx-auto w-full max-w-4xl px-6">
        <div className="flex flex-col gap-10 pb-10 pt-8">
          <div className="border-rule bg-paper-shade h-3 w-32 border-b pb-2" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-6">
              <div className="bg-paper-shade h-9 w-40" />
              <div className="bg-paper-shade h-9 w-40" />
            </div>
            <div className="bg-paper-shade h-9 w-full max-w-md" />
            <div className="bg-paper-shade h-5 w-48" />
            <div className="bg-paper-shade h-9 w-40" />
          </div>
        </div>
      </div>
    </>
  );
}

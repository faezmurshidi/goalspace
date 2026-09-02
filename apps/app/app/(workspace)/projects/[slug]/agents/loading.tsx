import { LoadingAnnouncement } from '@/components/shell/loading-announcement';

/** Matches the list's row rhythm so the swap does not jump. */
export default function Loading() {
  return (
    <>
      {/* The bars stay out of the accessibility tree, but something has to
          announce the wait: with aria-hidden on the root and no text, a screen
          reader heard silence between navigation and content. */}
      <LoadingAnnouncement />
      <div aria-hidden="true" className="mx-auto w-full max-w-4xl px-6 pt-8">
        <div className="border-rule bg-paper-shade h-4 w-24 border-b" />
        <ul>
          {[0, 1, 2].map((i) => (
            <li key={i} className="border-rule border-b py-3">
              <div className="bg-paper-shade h-4 w-48" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

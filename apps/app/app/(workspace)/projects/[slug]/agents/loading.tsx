/** Matches the list's row rhythm so the swap does not jump. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <div className="h-4 w-24 border-b border-rule bg-paper-shade" />
        <ul aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="border-b border-rule py-3">
              <div className="h-4 w-48 bg-paper-shade" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

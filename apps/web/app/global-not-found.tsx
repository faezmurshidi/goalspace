// `global-not-found.tsx` bypasses the app's normal rendering entirely (see
// the Next.js docs bundled with this version: "the root layout is defined
// using top-level dynamic segments" — this app's root layout is
// `app/[locale]/layout.tsx`, so there is no single layout Next can compose
// a global 404 from). It must therefore import its own global styles and
// fonts rather than inherit them, and it must render a complete `<html>`
// document itself.
import type { Metadata } from 'next';
import Link from 'next/link';
import { archivo, azeret } from '@/lib/fonts';
import { defaultLocale } from '@goalspace/i18n';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: '404 | Goalspace',
  description: 'The page you are looking for does not exist.',
};

/**
 * The true global 404: it only renders for a URL that matches no route at
 * all, not for `notFound()` calls inside a matched `[locale]` subtree
 * (those hit `app/[locale]/not-found.tsx` instead, and stay fully
 * localized). In practice `middleware.ts` redirects almost everything into
 * a `/en`, `/ms`, or `/zh` prefix before Next's router runs, so this page
 * is the backstop for the small remainder that never gets that far — a
 * request with a dotted extension that isn't a real static asset, for
 * instance, since the middleware matcher exempts those.
 *
 * No locale is known here by definition (nothing matched, so there's no
 * `[locale]` segment to read), and this file renders outside any
 * `I18nProvider`, so the copy below is plain English rather than routed
 * through `useAppTranslations()` — a deliberate choice for this one page,
 * not an oversight. It mirrors `app/[locale]/not-found.tsx`'s English
 * strings (`notFound.label` / `.title` / `.description` / `.cta` in
 * `packages/i18n/src/locales/en.json`) so the two pages read as the same
 * design, just not wired to the translation system.
 */
export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} className={`${archivo.variable} ${azeret.variable}`}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-24 text-center text-ink">
        <span className="label mb-6 block text-oxide">404</span>
        <h1 className="text-display wdth-expanded">Nothing at this address</h1>
        <p className="mt-6 max-w-[52ch] text-body text-ink-soft">
          The page you&apos;re looking for doesn&apos;t exist. It may have moved, or it was never
          here.
        </p>
        <Link
          href={`/${defaultLocale}`}
          className="label mt-12 inline-flex items-center gap-2 bg-oxide-deep px-8 py-4 text-paper transition-colors duration-150 ease-out-expo hover:bg-ink"
        >
          <span aria-hidden="true">&larr;</span>
          Back to plate 00
        </Link>
      </body>
    </html>
  );
}

// `global-not-found.tsx` bypasses the app's normal rendering entirely (see
// the Next.js docs bundled with this version: "the root layout is defined
// using top-level dynamic segments" — this app's root layout is
// `app/[locale]/layout.tsx`, so there is no single layout Next can compose
// a global 404 from). It must therefore import its own global styles and
// fonts rather than inherit them, and it must render a complete `<html>`
// document itself.
import type { Metadata } from 'next';
import Link from 'next/link';
import { defaultLocale } from '@goalspace/i18n';

import { archivo, azeret } from '@/lib/fonts';

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
      <body className="bg-paper text-ink flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
        <span className="label text-oxide mb-6 block">404</span>
        <h1 className="text-display wdth-expanded">Nothing at this address</h1>
        <p className="text-body text-ink-soft mt-6 max-w-[52ch]">
          The page you&apos;re looking for doesn&apos;t exist. It may have moved, or it was never
          here.
        </p>
        <Link
          href={`/${defaultLocale}`}
          className="label bg-oxide-deep text-paper ease-out-expo hover:bg-ink mt-12 inline-flex items-center gap-2 px-8 py-4 transition-colors duration-150"
        >
          <span aria-hidden="true">&larr;</span>
          Back to plate 00
        </Link>
      </body>
    </html>
  );
}

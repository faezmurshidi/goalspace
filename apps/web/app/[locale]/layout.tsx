import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { I18nProvider } from '@goalspace/i18n';
import { Toaster } from '@goalspace/ui';
import { SiteHeader } from '@/components/site-header';
import { Colophon } from '@/components/manual/colophon';
import AnalyticsProvider from '@/app/providers/analytics-provider';
import { archivo, azeret } from '@/lib/fonts';
import '@/app/globals.css';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ms' }, { locale: 'zh' }];
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

// This metadata is a server-side export: Next's metadata API cannot use the
// client i18n hook, so the copy below is plain English only. Per-locale
// metadata is a later concern (see the i18n regeneration in Task 10).
//
// The copy is drawn from PRODUCT.md and the landing plates' own copy
// (packages/i18n/src/locales/en.json, "landing.hero" / "landing.agent" /
// "landing.start"): Goalspace is a repository for one long project. What
// ships today is the record; the agent that reads it back is next and not
// built yet, so this metadata does not claim a shipping AI product.
export const metadata: Metadata = {
  metadataBase: new URL('https://goalspace.com'),
  title: {
    default: 'Goalspace: a repository for one long project',
    template: '%s | Goalspace',
  },
  description:
    'Goalspace is a repository for one long project: a log of decisions and blockers, work items with real states, and documents, so coming back after weeks away is cheap. Start the record today.',
  keywords: [
    'project record',
    'long-term project tracker',
    'decision log',
    'work item tracker',
    'blocked and waiting items',
    'resume view',
    'personal project journal',
    'coming back to a project',
  ],
  authors: [{ name: 'Goalspace' }],
  creator: 'Goalspace',
  publisher: 'Goalspace',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://goalspace.com',
    title: 'Goalspace: a repository for one long project',
    description:
      'A log of decisions and blockers, work items with real states, and documents, so coming back to a long project after weeks away is cheap. The record ships today.',
    siteName: 'Goalspace',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Goalspace: a repository for one long project',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goalspace: a repository for one long project',
    description:
      'A log of decisions and blockers, work items with real states, and documents, so coming back to a long project after weeks away is cheap. The record ships today.',
    images: ['/images/twitter-image.jpg'],
    creator: '@goalspace',
    site: '@goalspace',
  },
  applicationName: 'Goalspace',
  alternates: {
    canonical: 'https://goalspace.com',
  },
  manifest: '/site.webmanifest',
  category: 'productivity',
};

/**
 * This is the app's true root layout, even though it lives under the
 * `[locale]` segment rather than directly in `app/`. `app/page.tsx` (a
 * bare-`/` redirect) and a top-level `app/layout.tsx` used to exist
 * alongside it, but `middleware.ts` already redirects every request
 * without a `/en`, `/ms`, or `/zh` prefix into one before Next's router
 * ever sees it (see its matcher, which only exempts `_next/*`,
 * `favicon.ico`, and dotted static-asset paths). That made the bare `/`
 * route dead code, and it also meant the single `<html>` element the
 * whole app renders could never see which locale it was serving: the
 * true root layout sat above `[locale]`, structurally unable to read that
 * segment's param, so `<html lang>` was hardcoded to "en" and corrected
 * after the fact by a client component (`HtmlLangSync`). `app/page.tsx`
 * and the top-level `app/layout.tsx` were removed and their content
 * (metadata, fonts, `AnalyticsProvider`, `Toaster`) folded in here, so
 * this layout can set `<html lang={locale}>` correctly in the
 * server-rendered HTML for `/en`, `/ms`, and `/zh` alike, with no client
 * correction needed.
 *
 * (An alternative that was tried and abandoned: `next/root-params`, which
 * exists specifically to let an ancestor-of-`[locale]` layout read the
 * `locale` segment while keeping `generateStaticParams`-driven static
 * rendering. It fails under Turbopack in this Next.js version — the
 * compiler never generates the module's named export, only a placeholder
 * that throws "has no exports at all" — a confirmed upstream bug,
 * https://github.com/vercel/next.js/issues/92742. Restructuring the route
 * tree, as done here, sidesteps it entirely instead of depending on an
 * experimental flag with a known compiler bug.)
 *
 * `app/not-found.tsx` moved to `[locale]/not-found.tsx` for the same
 * reason: it's the only other route that used to sit outside `[locale]`,
 * and Next requires exactly one `<html>`-owning root layout for the whole
 * route tree it belongs to. As a result it now renders inside this
 * layout's `SiteHeader`/`Colophon` chrome and reads the locale from
 * context like every other page, instead of the module-level i18next
 * singleton it fell back to before. `robots.ts` and `sitemap.ts` are
 * metadata route handlers, not pages, so they need no root layout and are
 * unaffected.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} className={`${archivo.variable} ${azeret.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AnalyticsProvider>
          <I18nProvider locale={locale}>
            <div className="flex min-h-screen flex-col bg-paper">
              <SiteHeader />
              <div className="flex-1">{children}</div>
              <Colophon />
            </div>
          </I18nProvider>
        </AnalyticsProvider>
        <Toaster />
      </body>
    </html>
  );
}

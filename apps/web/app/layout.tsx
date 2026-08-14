import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Toaster } from '@goalspace/ui';

import AnalyticsProvider from './providers/analytics-provider';
import { archivo, azeret } from '@/lib/fonts';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${azeret.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AnalyticsProvider>{children}</AnalyticsProvider>
        <Toaster />
      </body>
    </html>
  );
}

import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import AnalyticsProvider from './providers/analytics-provider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://goalspace.com'),
  title: {
    default: 'GoalSpace - AI-Powered Goal Achievement Platform',
    template: '%s | GoalSpace'
  },
  description: 'Achieve your goals with personalized AI mentorship, structured learning spaces, and progress tracking. Transform your learning journey today.',
  keywords: [
    'goal achievement',
    'AI mentorship',
    'learning platform',
    'personal development',
    'structured learning',
    'progress tracking',
    'AI learning assistant',
    'educational technology'
  ],
  authors: [{ name: 'GoalSpace Team' }],
  creator: 'GoalSpace',
  publisher: 'GoalSpace',
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
    title: 'GoalSpace - AI-Powered Goal Achievement Platform',
    description: 'Achieve your goals with personalized AI mentorship, structured learning spaces, and progress tracking.',
    siteName: 'GoalSpace',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GoalSpace - AI-Powered Goal Achievement Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GoalSpace - AI-Powered Goal Achievement Platform',
    description: 'Achieve your goals with personalized AI mentorship, structured learning spaces, and progress tracking.',
    images: ['/images/twitter-image.jpg'],
    creator: '@goalspace',
    site: '@goalspace',
  },
  applicationName: 'GoalSpace',
  alternates: {
    canonical: 'https://goalspace.com',
  },
  manifest: '/site.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    minimumScale: 1,
  },
  category: 'education',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

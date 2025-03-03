import { SiteHeader } from '@/components/site-header';
import { FooterSection } from '@/components/sections/footer-section';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GoalSpace - AI-Powered Goal Achievement',
  description: 'Achieve your goals with personalized AI mentorship and structured learning spaces.',
  keywords: ['AI mentorship', 'goal setting', 'personal development', 'learning', 'productivity'],
  authors: [{ name: 'GoalSpace Team' }],
  openGraph: {
    title: 'GoalSpace - AI-Powered Goal Achievement',
    description: 'Achieve your goals with personalized AI mentorship and structured learning spaces.',
    images: ['/og-image.png'],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/50 to-background/80 backdrop-blur-[2px]" />

      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-500/30 blur-[100px]" />
        <div className="absolute -right-20 top-1/3 h-[500px] w-[500px] animate-pulse rounded-full bg-cyan-500/30 blur-[100px] delay-1000" />
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] animate-pulse rounded-full bg-rose-500/30 blur-[100px] delay-500" />
      </div>

      <div className="relative">
        <SiteHeader />
        <main>{children}</main>
        <FooterSection />
      </div>
    </div>
  );
}
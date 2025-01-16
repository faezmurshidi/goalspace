'use client';

import { GeneratedSpaces } from '@/components/generated-spaces';
import { CTASection } from '@/components/sections/cta-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { FooterSection } from '@/components/sections/footer-section';
import { HowItWorksSection } from '@/components/sections/how-it-works-section';
import { TestimonialsSection } from '@/components/sections/testimonials-section';
import { SiteHeader } from '@/components/site-header';
import { Hero } from '@/components/ui/animated-hero';
import { FAQ } from '@/components/ui/faq-section';
import PricingPage from './pricing/page';

export default function Home() {
  return (
    <>
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

          <div className="container mx-auto px-4 py-16 md:py-24">
            {/* Hero Section */}
            <Hero />
          </div>

          {/* Generated Spaces */}
          <GeneratedSpaces />

          {/* Features Section */}
          <FeaturesSection />

          {/* Testimonials */}
          <TestimonialsSection />

          {/* How It Works */}
          <HowItWorksSection />

          {/* Pricing */}
          <PricingPage />

          {/* CTA Section */}
          <CTASection />

          {/* FAQ */}
          <FAQ />

          {/* Footer */}
          <FooterSection />
        </div>
      </div>
    </>
  );
}

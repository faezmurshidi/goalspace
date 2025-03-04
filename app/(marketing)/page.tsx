'use client';

import { GeneratedSpaces } from '@/components/generated-spaces';
import { CTASection } from '@/components/sections/cta-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { HowItWorksSection } from '@/components/sections/how-it-works-section';
import { TestimonialsSection } from '@/components/sections/testimonials-section';
import { Hero } from '@/components/ui/animated-hero';
import { FAQ } from '@/components/ui/faq-section';
import PricingPage from '../pricing/page';

export default function Home() {
  return (
    <>
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
    </>
  );
}
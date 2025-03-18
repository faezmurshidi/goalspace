'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { GeneratedSpaces } from '@/components/generated-spaces';
import { CTASection } from '@/components/sections/cta-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { FooterSection } from '@/components/sections/footer-section';
import { HowItWorksSection } from '@/components/sections/how-it-works-section';
import { TestimonialsSection } from '@/components/sections/testimonials-section';
import { SiteHeader } from '@/components/site-header';
import { Hero } from '@/components/ui/animated-hero';
import { FAQ } from '@/components/ui/faq-section';
import { useToast } from '@/components/ui/use-toast';
import Script from 'next/script';
import Link from 'next/link';

// Content component to be wrapped in Suspense
function LocalizedHomeContent() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useToast();
  
  // For simplicity, reuse the original home page structure
  // JSON-LD structured data for better SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": t('common.appName'),
    "description": t('common.description'),
    "applicationCategory": "EducationalApplication, ProductivityApplication",
    "offers": {
      "@type": "Offer",
      "price": "9.99",
      "priceCurrency": "USD"
    },
    "operatingSystem": "All",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "Personalized AI mentorship",
      "Structured learning paths",
      "Progress tracking",
      "Community support",
      "Regular content updates"
    ]
  };

  return (
    <>
      {/* Add structured data for search engines */}
      <Script id="schema-structured-data" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>
      
      <div className="relative min-h-screen overflow-hidden">
        {/* Enhanced Gradient Overlay with better performance */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/50 to-background/80 backdrop-blur-[2px]" 
          style={{ willChange: 'transform' }} 
        />

        {/* Optimized Animated Gradient Orbs with reduced repaints */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[100px]"
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.03, 1],
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute -right-20 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[100px]"
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 12, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div 
            className="absolute -top-20 left-1/2 h-[500px] w-[500px] rounded-full bg-rose-500/20 blur-[100px]"
            animate={{ 
              opacity: [0.25, 0.55, 0.25],
              scale: [1, 1.04, 1],
            }}
            transition={{ 
              duration: 11, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </div>

        <div className="relative">
          <SiteHeader />

          {/* Hero Section */}
          <div className="container mx-auto px-4 md:px-6 max-w-7xl py-12 md:py-16 lg:py-20">
            <Hero />
          </div>

          {/* Generated Spaces Section */}
          <div className="py-12 md:py-16 lg:py-20 bg-gray-50/30 dark:bg-gray-900/20">
            <GeneratedSpaces />
          </div>

          {/* Features Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t">
            <FeaturesSection />
          </div>

          {/* Testimonials Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-white dark:bg-black">
            <TestimonialsSection />
          </div>

          {/* How It Works Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-gray-50/30 dark:bg-gray-900/20">
            <HowItWorksSection />
          </div>

          {/* CTA Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-white dark:bg-black">
            <CTASection />
          </div>

          {/* FAQ Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-gray-50/30 dark:bg-gray-900/20">
            <FAQ />
          </div>

          {/* Footer Section */}
          <FooterSection />
        </div>
      </div>
    </>
  );
}

// Main component with Suspense boundary
export default function LocalizedHome({ params }: { params: { locale: string }}) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LocalizedHomeContent />
    </Suspense>
  );
} 
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { useToast } from '@/components/ui/use-toast';
import Script from 'next/script';

// Create custom placeholders for sections that will be implemented
const TrustsignalsSection = () => (
  <section className="w-full border-t border-b border-gray-100 py-12 md:py-16 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
    <div className="container mx-auto px-4 md:px-6 max-w-7xl">
      <div className="flex flex-col items-center justify-center gap-8">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Trusted by leading organizations and featured in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {['TechCrunch', 'Forbes', 'Harvard', 'MIT', 'FastCompany', 'Y Combinator'].map((partner) => (
            <div key={partner} className="flex items-center opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0">
              <div className="flex h-10 w-32 items-center justify-center font-semibold text-muted-foreground/80">
                {partner}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const StatisticsSection = () => (
  <section className="w-full py-12 md:py-16 lg:py-20 bg-white dark:bg-black">
    <div className="container mx-auto px-4 md:px-6 max-w-7xl">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Transforming the way people learn and achieve
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
          Our AI-powered platform has helped thousands of people achieve their goals through structured learning paths and personalized mentorship.
        </p>
        
        <div className="grid grid-cols-1 gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: '10,000+', label: 'Active Users', description: 'Learning and growing daily' },
            { value: '40,000+', label: 'Spaces Created', description: 'Organized learning paths' },
            { value: '98%', label: 'Completion Rate', description: 'For users with AI mentors' },
            { value: '85%', label: 'Success Rate', description: 'Users achieve their goals' },
          ].map((stat, index) => (
            <div key={index} className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                <span className="text-xl">📊</span>
              </div>
              <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                {stat.value}
              </div>
              <h3 className="text-lg font-medium mb-2">{stat.label}</h3>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const CaseStudiesSection = () => (
  <section className="w-full border-t py-12 md:py-16 lg:py-20 bg-gray-50/30 dark:bg-gray-900/20">
    <div className="container mx-auto px-4 md:px-6 max-w-7xl">
      <div className="mb-16 flex flex-col items-center text-center">
        <div className="mb-4 inline-flex rounded-full border border-gray-200 px-4 py-1.5 text-sm dark:border-gray-700">Success Stories</div>
        <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Real people, real results
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Discover how Goalspace has transformed learning journeys and helped people achieve extraordinary results.
        </p>
      </div>
      
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:bg-gray-800/80">
          <h3 className="mb-4 text-2xl font-bold">From Novice to Full-Stack Developer in 6 Months</h3>
          <p className="mb-6 text-muted-foreground">
            Alex had zero coding experience but wanted to switch careers. Using Goalspace&apos;s structured learning paths and AI mentorship, he went from complete beginner to landing a junior developer role in just 6 months.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="rounded-lg bg-gray-50 p-4 text-center shadow-sm dark:bg-gray-900/50">
              <p className="text-xl font-bold">4 months</p>
              <p className="text-sm text-muted-foreground">Time Saved</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center shadow-sm dark:bg-gray-900/50">
              <p className="text-xl font-bold">100%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center shadow-sm dark:bg-gray-900/50">
              <p className="text-xl font-bold">$12,000</p>
              <p className="text-sm text-muted-foreground">Cost Savings</p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
              <div className="flex h-full w-full items-center justify-center text-gray-500">AC</div>
            </div>
            <div>
              <p className="font-medium">Alex Chen</p>
              <p className="text-sm text-muted-foreground">Software Developer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const IntegrationSection = () => (
  <section className="w-full border-t py-12 md:py-16 lg:py-20 bg-white dark:bg-black">
    <div className="container mx-auto px-4 md:px-6 max-w-7xl">
      <div className="text-center mb-16">
        <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Seamless Integrations</h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Connect Goalspace with your favorite apps and services to enhance your learning experience.
        </p>
      </div>
      
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 'Google Calendar', description: 'Schedule study sessions and track progress', icon: '📅' },
          { name: 'Slack', description: 'Collaborate with study groups', icon: '💬' },
          { name: 'GitHub', description: 'Connect your code projects directly', icon: '💻' },
          { name: 'YouTube', description: 'Embed video tutorials in learning spaces', icon: '▶️' },
          { name: 'Notion', description: 'Import notes and documentation', icon: '📝' },
          { name: 'Spotify', description: 'Focus playlists for productive study', icon: '🎵' },
        ].map((integration, index) => (
          <div
            key={index}
            className="flex cursor-pointer flex-col items-center rounded-xl border bg-white/80 p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20 dark:bg-gray-800/70 dark:hover:bg-gray-800/90"
          >
            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
              <span className="text-2xl">{integration.icon}</span>
            </div>
            <h3 className="mb-2 text-lg font-medium">{integration.name}</h3>
            <p className="text-center text-sm text-muted-foreground">
              {integration.description}
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          More integrations coming soon. Suggest an integration you&apos;d like to see.
        </p>
      </div>
    </div>
  </section>
);

export default function Home() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user came from a specific referral or campaign
    const urlParams = new URLSearchParams(window.location.search);
    const referral = urlParams.get('ref');
    
    if (referral === 'launch') {
      toast({
        title: "Welcome to Goalspace!",
        description: "We're excited to have you join us for our launch. Enjoy special access to all premium features.",
        duration: 5000,
      });
    }
  }, [toast]);

  // JSON-LD structured data for better SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "GoalSpace",
    "description": "AI-Powered Goal Achievement Platform",
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

          {/* Trust Signals Section */}
          <TrustsignalsSection />
          
          {/* Generated Spaces Section */}
          <div className="py-12 md:py-16 lg:py-20 bg-gray-50/30 dark:bg-gray-900/20">
            <GeneratedSpaces />
          </div>

          {/* Statistics Section */}
          <StatisticsSection />

          {/* Features Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t">
            <FeaturesSection />
          </div>

          {/* Case Studies Section */}
          <CaseStudiesSection />

          {/* Testimonials Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-white dark:bg-black">
            <TestimonialsSection />
          </div>

          {/* How It Works Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-gray-50/30 dark:bg-gray-900/20">
            <HowItWorksSection />
          </div>

          {/* Integrations Section */}
          <IntegrationSection />

          {/* Pricing Section - Wrapping with consistent padding */}
          <div className="py-12 md:py-16 lg:py-20 border-t bg-gray-50/30 dark:bg-gray-900/20">
            <PricingPage />
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

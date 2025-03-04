'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  const benefits = [
    'Personalized AI mentorship',
    'Structured learning paths',
    'Progress tracking',
    'Community support',
    'Lifetime access',
    'Regular content updates',
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Decorative background elements - subtle and less distracting */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-50">
        <div className="absolute -left-10 -top-10 h-[250px] w-[250px] rounded-full bg-purple-500/10 blur-[80px]" />
        <div className="absolute -right-10 bottom-20 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute right-1/3 top-1/3 h-[180px] w-[180px] rounded-full bg-rose-500/10 blur-[60px]" />
      </div>

      {/* Foreground content */}
      <div className="container relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-2xl border bg-white/90 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-900/90 md:p-10 lg:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Start your learning journey today
                </h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Transform your goals into achievements with personalized AI mentorship and structured learning paths.
                </p>
                
                <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {benefits.map((benefit, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-5 sm:space-y-0">
                  <Button className="px-6 py-3 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-white">
                    Get started for free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button className="px-6 py-3 text-base font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200">
                    View pricing
                  </Button>
                </div>
              </motion.div>
            </div>
            
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative h-full w-full max-w-sm"
              >
                <div className="flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>
                  <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl"></div>
                  
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7 text-primary"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="relative z-10 text-center">
                    <h3 className="mb-1 text-2xl font-bold">Launch Offer</h3>
                    <p className="mb-5 text-sm text-muted-foreground">
                      For a limited time only
                    </p>
                    <div className="mb-5 flex justify-center">
                      <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">50%</span>
                      <span className="ml-1 text-xl self-end mb-1"> OFF</span>
                    </div>
                    <p className="mb-6 text-sm text-muted-foreground">
                      All premium features included
                    </p>
                    
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Regular price</span>
                        <span className="line-through">$19.99/mo</span>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span>Your price</span>
                        <span className="text-lg text-primary">$9.99/mo</span>
                      </div>
                    </div>
                    
                    <Button className="w-full px-6 py-3 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-white">
                      Claim Discount
                    </Button>
                    
                    <p className="mt-4 text-xs text-muted-foreground">
                      No credit card required to start
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

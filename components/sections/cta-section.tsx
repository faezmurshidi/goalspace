import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="border-t">
      <div className="container mx-auto px-4 py-24">
        <div className="relative rounded-3xl bg-gradient-to-r from-purple-600 via-primary to-cyan-600 p-8 shadow-xl dark:from-purple-400 dark:via-primary dark:to-cyan-400 sm:p-16">
          <div className="relative z-10 mx-auto max-w-2xl text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your learning?
            </h2>
            <p className="mx-auto mt-4 max-w-xl">
              Join now and get started with your personalized learning journey. No credit card
              required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/goal">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 dark:bg-white dark:text-primary dark:hover:bg-white/90"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

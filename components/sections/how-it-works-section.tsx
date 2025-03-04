'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, BrainCircuit, Layout, Lightbulb, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';

const steps = [
  {
    number: '01',
    title: 'Define your goal',
    description:
      'Start by sharing your learning objective or personal goal. Our AI analyzes it to understand what you want to achieve.',
    icon: Target,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    number: '02',
    title: 'Get your learning spaces',
    description:
      'Our AI breaks down your goal into organized learning spaces, each with clear objectives, resources, and progression paths.',
    icon: Layout,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    number: '03',
    title: 'Learn with AI mentorship',
    description:
      'Each space comes with a specialized AI mentor that adapts to your learning style, answers questions, and provides guidance.',
    icon: BrainCircuit,
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    number: '04',
    title: 'Track progress & achieve',
    description:
      'Monitor your advancement with detailed progress tracking, celebrate milestones, and ultimately accomplish your goals.',
    icon: Lightbulb,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 50,
      },
    },
  };

  return (
    <section ref={sectionRef} className="border-t bg-white py-24 dark:bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <div className="mb-3 inline-flex rounded-full border px-3 py-1 text-sm">How It Works</div>
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Achieve your goals in 4 simple steps
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Our AI-powered platform makes learning and achieving goals simple, personalized, and effective.
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Connector Line (Desktop) */}
          <div className="absolute left-1/2 top-0 hidden h-full w-[2px] -translate-x-1/2 transform bg-gradient-to-b from-transparent via-gray-200 to-transparent lg:block dark:via-gray-700" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative z-10 space-y-12 lg:space-y-24"
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`relative grid grid-cols-1 gap-8 lg:grid-cols-2 ${
                  i % 2 === 1 ? 'lg:grid-flow-dense' : ''
                }`}
              >
                {/* Content Side */}
                <div
                  className={`flex flex-col justify-center ${
                    i % 2 === 1 ? 'lg:order-2' : ''
                  }`}
                >
                  <span className="mb-1 text-sm font-medium text-primary">Step {step.number}</span>
                  <h3 className="mb-4 text-2xl font-bold">{step.title}</h3>
                  <p className="mb-6 text-muted-foreground">{step.description}</p>
                  
                  <div className="flex">
                    <div className={`mr-4 rounded-full p-3 ${step.color}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {i === 0 && (
                        <p>Our AI analyzes your goal to understand what success looks like for you.</p>
                      )}
                      {i === 1 && (
                        <p>Spaces are tailored to your knowledge level and learning preferences.</p>
                      )}
                      {i === 2 && (
                        <p>Your AI mentor adjusts to your pace and provides personalized feedback.</p>
                      )}
                      {i === 3 && (
                        <p>Visualize your progression and see how close you are to mastery.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image/Visual Side */}
                <div
                  className={`relative flex items-center justify-center rounded-xl border bg-gray-50 p-6 dark:bg-gray-800/50 ${
                    i % 2 === 1 ? 'lg:order-1' : ''
                  }`}
                >
                  <div className="relative h-60 w-full max-w-md rounded-lg bg-gray-200 dark:bg-gray-700">
                    <div className="flex h-full w-full items-center justify-center text-center text-lg text-gray-500 dark:text-gray-400">
                      {/* Placeholder for actual screenshots/illustrations */}
                      <p className="px-6">
                        {i === 0 && "Goal setting & analysis interface"}
                        {i === 1 && "AI-generated learning spaces visualization"}
                        {i === 2 && "AI mentorship conversation example"}
                        {i === 3 && "Progress tracking & milestones dashboard"}
                      </p>
                    </div>
                  </div>

                  {/* Connector Dot for Desktop */}
                  <div className="absolute left-1/2 top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-4 border-white bg-primary lg:block dark:border-black" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-16 flex justify-center">
          <Button size="lg" className="gap-2">
            Get started now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

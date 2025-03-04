'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const caseStudies = [
  {
    title: 'From Novice to Full-Stack Developer in 6 Months',
    category: 'Programming',
    description:
      'Alex had zero coding experience but wanted to switch careers. Using Goalspace\'s structured learning paths and AI mentorship, he went from complete beginner to landing a junior developer role in just 6 months.',
    metrics: [
      { label: 'Time Saved', value: '4 months' },
      { label: 'Completion Rate', value: '100%' },
      { label: 'Cost Savings', value: '$12,000' },
    ],
    image: '/images/case-studies/programming.jpg',
    placeholder: 'https://placehold.co/600x400?text=Programming',
    userName: 'Alex Chen',
    userRole: 'Software Developer',
    userImage: '/images/avatars/alex.jpg',
    userPlaceholder: 'https://placehold.co/50x50?text=AC',
  },
  {
    title: 'Mastering Machine Learning While Working Full-Time',
    category: 'Data Science',
    description:
      'Sarah balanced a demanding job with her goal to master machine learning. Goalspace\'s personalized study schedule and AI mentor helped her complete advanced certifications while maintaining work-life balance.',
    metrics: [
      { label: 'Study Efficiency', value: '+65%' },
      { label: 'Skills Acquired', value: '12' },
      { label: 'Certifications', value: '3' },
    ],
    image: '/images/case-studies/machine-learning.jpg',
    placeholder: 'https://placehold.co/600x400?text=Machine+Learning',
    userName: 'Sarah Patel',
    userRole: 'Data Scientist',
    userImage: '/images/avatars/sarah.jpg',
    userPlaceholder: 'https://placehold.co/50x50?text=SP',
  },
  {
    title: 'Learning Japanese for an International Assignment',
    category: 'Language',
    description:
      'Michael needed to learn Japanese quickly for a work assignment in Tokyo. With Goalspace\'s immersive language learning spaces and cultural context integration, he achieved professional proficiency in just 9 months.',
    metrics: [
      { label: 'Vocabulary', value: '3,200+ words' },
      { label: 'JLPT Level', value: 'N3' },
      { label: 'Conversation', value: 'Business Fluent' },
    ],
    image: '/images/case-studies/language.jpg',
    placeholder: 'https://placehold.co/600x400?text=Language',
    userName: 'Michael Brown',
    userRole: 'Marketing Director',
    userImage: '/images/avatars/michael.jpg',
    userPlaceholder: 'https://placehold.co/50x50?text=MB',
  },
];

export function CaseStudiesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const nextCase = () => {
    setActiveIndex((prev) => (prev === caseStudies.length - 1 ? 0 : prev + 1));
  };
  
  const prevCase = () => {
    setActiveIndex((prev) => (prev === 0 ? caseStudies.length - 1 : prev - 1));
  };
  
  const activeCase = caseStudies[activeIndex];
  
  return (
    <section className="w-full border-t bg-gray-50/50 py-24 dark:bg-gray-900/30">
      <div className="container mx-auto px-4">
        <div className="mb-16 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-4">Success Stories</Badge>
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Real people, real results
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Discover how Goalspace has transformed learning journeys and helped people achieve extraordinary results.
          </p>
        </div>
        
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Image Section */}
            <div className="relative order-2 flex items-center justify-center overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 lg:order-1">
              <div className="relative h-[400px] w-full">
                {/* Using a placeholder for example purposes */}
                <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xl text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <img 
                    src={activeCase.placeholder}
                    alt={activeCase.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 flex w-full items-center gap-4 p-6">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-300">
                    <img 
                      src={activeCase.userPlaceholder}
                      alt={activeCase.userName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-white">
                    <p className="font-medium">{activeCase.userName}</p>
                    <p className="text-sm opacity-80">{activeCase.userRole}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="order-1 flex flex-col justify-center lg:order-2">
              <Badge className="mb-4 w-fit">{activeCase.category}</Badge>
              <h3 className="mb-6 text-2xl font-bold sm:text-3xl">{activeCase.title}</h3>
              
              <p className="mb-8 text-lg text-muted-foreground">{activeCase.description}</p>
              
              <div className="mb-10 grid grid-cols-3 gap-4">
                {activeCase.metrics.map((metric, i) => (
                  <div key={i} className="rounded-lg bg-background p-4 text-center shadow-sm">
                    <p className="text-xl font-bold">{metric.value}</p>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={prevCase} aria-label="Previous case study">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex space-x-2">
                  {caseStudies.map((_, i) => (
                    <button
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i === activeIndex ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to case study ${i + 1}`}
                    />
                  ))}
                </div>
                
                <Button variant="outline" size="icon" onClick={nextCase} aria-label="Next case study">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 
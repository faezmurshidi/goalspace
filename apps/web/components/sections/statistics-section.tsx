'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Bookmark, Code, UserCheck, Users } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: 10000,
    unit: '+',
    label: 'Active Users',
    description: 'Learning and growing daily',
  },
  {
    icon: Bookmark,
    value: 40000,
    unit: '+',
    label: 'Spaces Created',
    description: 'Organized learning paths',
  },
  {
    icon: Code,
    value: 98,
    unit: '%',
    label: 'Completion Rate',
    description: 'For users with AI mentors',
  },
  {
    icon: UserCheck,
    value: 85,
    unit: '%',
    label: 'Success Rate',
    description: 'Users achieve their goals',
  },
];

export function StatisticsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  
  return (
    <section 
      ref={sectionRef}
      className="w-full bg-white py-24 dark:bg-black"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Transforming the way people learn and achieve
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            Our AI-powered platform has helped thousands of people achieve their goals through structured learning paths and personalized mentorship.
          </p>
          
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <CounterCard 
                key={index}
                icon={stat.icon}
                value={stat.value}
                unit={stat.unit}
                label={stat.label}
                description={stat.description}
                delay={index * 0.1}
                isInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface CounterCardProps {
  icon: React.ElementType;
  value: number;
  unit: string;
  label: string;
  description: string;
  delay: number;
  isInView: boolean;
}

function CounterCard({ icon: Icon, value, unit, label, description, delay, isInView }: CounterCardProps) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    
    let start = 0;
    const end = value;
    const duration = 2000; // 2 seconds
    const increment = end / (duration / 16); // Update every ~16ms for 60fps
    
    // Don't start immediately to respect the staggered animation
    const timer = setTimeout(() => {
      const counter = setInterval(() => {
        start += increment;
        setCount(Math.floor(start));
        
        if (start >= end) {
          clearInterval(counter);
          setCount(end);
        }
      }, 16);
      
      return () => clearInterval(counter);
    }, delay * 1000);
    
    return () => clearTimeout(timer);
  }, [isInView, value, delay]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col items-center justify-center"
    >
      <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
        <Icon size={24} />
      </div>
      <div className="flex items-baseline gap-1 text-4xl font-bold">
        <span>{count}</span>
        <span>{unit}</span>
      </div>
      <h3 className="mt-2 text-lg font-medium">{label}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
} 
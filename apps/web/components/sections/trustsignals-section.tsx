'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const partners = [
  {
    name: 'TechCrunch',
    logo: '/images/logos/techcrunch.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 160,
    height: 40,
  },
  {
    name: 'Forbes',
    logo: '/images/logos/forbes.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 120,
    height: 40,
  },
  {
    name: 'Harvard',
    logo: '/images/logos/harvard.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 140,
    height: 40,
  },
  {
    name: 'MIT',
    logo: '/images/logos/mit.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 110,
    height: 40,
  },
  {
    name: 'FastCompany',
    logo: '/images/logos/fastcompany.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 150,
    height: 40,
  },
  {
    name: 'Y Combinator',
    logo: '/images/logos/ycombinator.svg',
    placeholder: '/images/logos/placeholder.svg',
    width: 130,
    height: 40,
  },
];

export function TrustsignalsSection() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 70 } },
  };

  return (
    <section className="w-full border-t border-b border-gray-100 bg-gray-50/50 py-8 dark:border-gray-800 dark:bg-gray-900/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-6">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Trusted by leading organizations and featured in
          </p>
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {partners.map((partner) => (
              <motion.div
                key={partner.name}
                variants={item}
                className="flex items-center opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
              >
                <div style={{ width: partner.width, height: partner.height }} className="relative">
                  {/* Using a placeholder for example purposes - replace with actual images */}
                  <div className="flex h-full items-center justify-center font-semibold text-muted-foreground/80">
                    {partner.name}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
} 
'use client';

import React, { useEffect } from 'react';
import { animate, motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export interface AnimatedCardProps {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icons?: Array<{
    icon: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }>;
  size?: 'sm' | 'md' | 'lg' | '2xl';
  variant?: 'default' | 'feature';
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const containerSizeMap = {
  sm: 'h-[15rem]',
  md: 'h-[20rem]',
  lg: 'h-[25rem]',
  '2xl': 'h-[30rem]',
};

export function AnimatedCard({
  className,
  title,
  description,
  icons = [],
  size = 'md',
  variant = 'default',
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.10)] bg-gray-100 p-8 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] transition-all duration-300 hover:shadow-lg dark:bg-[rgba(40,40,40,0.70)]',
        variant === 'feature' && 'flex flex-col justify-between',
        containerSizeMap[size],
        className
      )}
    >
      <div className="relative z-10">
        {title && (
          <h3
            className={cn(
              'font-semibold text-gray-800 dark:text-white',
              size === '2xl' ? 'text-2xl' : 'text-lg'
            )}
          >
            {title}
          </h3>
        )}
        {description && (
          <p
            className={cn(
              'mt-2 font-normal text-neutral-600 dark:text-neutral-400',
              size === '2xl' ? 'text-lg' : 'text-sm'
            )}
          >
            {description}
          </p>
        )}
      </div>

      <div
        className={cn(
          'relative mt-4 flex h-full items-center justify-center overflow-hidden',
          '[mask-image:radial-gradient(50%_50%_at_50%_50%,white_0%,transparent_100%)]'
        )}
      >
        <div className="flex flex-shrink-0 flex-row items-center justify-center gap-2">
          {icons.map((icon, index) => (
            <Container
              key={index}
              className={cn(sizeMap[icon.size || 'lg'], `circle-${index + 1}`, icon.className)}
            >
              {icon.icon}
            </Container>
          ))}
        </div>
        <AnimatedSparkles />
      </div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:to-primary/10" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent dark:via-primary/20"
          animate={{
            x: ['0%', '100%', '0%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    </div>
  );
}

const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center rounded-full bg-[rgba(248,248,248,0.01)] shadow-[0px_0px_8px_0px_rgba(248,248,248,0.25)_inset,0px_32px_24px_-16px_rgba(0,0,0,0.40)]',
        className
      )}
      {...props}
    />
  )
);
Container.displayName = 'Container';

const AnimatedSparkles = () => (
  <div className="animate-move absolute top-20 z-40 m-auto h-40 w-px bg-gradient-to-b from-transparent via-cyan-500 to-transparent">
    <div className="absolute -left-10 top-1/2 h-32 w-10 -translate-y-1/2">
      <Sparkles />
    </div>
  </div>
);

const Sparkles = () => {
  const randomMove = () => Math.random() * 2 - 1;
  const randomOpacity = () => Math.random();
  const random = () => Math.random();

  return (
    <div className="absolute inset-0">
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={`star-${i}`}
          animate={{
            top: `calc(${random() * 100}% + ${randomMove()}px)`,
            left: `calc(${random() * 100}% + ${randomMove()}px)`,
            opacity: randomOpacity(),
            scale: [1, 1.2, 0],
          }}
          transition={{
            duration: random() * 2 + 4,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            top: `${random() * 100}%`,
            left: `${random() * 100}%`,
            width: `2px`,
            height: `2px`,
            borderRadius: '50%',
            zIndex: 1,
          }}
          className="inline-block bg-black dark:bg-white"
        />
      ))}
    </div>
  );
};

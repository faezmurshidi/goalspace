'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after component is mounted
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Animation states
  const [isAnimating, setIsAnimating] = React.useState(false);

  const toggleTheme = () => {
    setIsAnimating(true);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  if (!isMounted) {
    return (
      <Button variant="ghost" size="icon" className={cn('transition-opacity opacity-0', className)}>
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all" />
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* Animated background burst effect */}
      {isAnimating && (
        <div 
          className={cn(
            "absolute inset-0 rounded-full animate-ping",
            theme === 'dark' 
              ? "bg-yellow-300/40" 
              : "bg-indigo-400/40"
          )}
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative overflow-hidden transition-all duration-300 hover:bg-transparent",
          theme === 'dark' ? 'text-yellow-300 hover:text-yellow-200' : 'text-indigo-500 hover:text-indigo-600',
          className
        )}
        onClick={toggleTheme}
        aria-label={`Change to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <Sun 
          className={cn(
            "absolute h-5 w-5 transition-all duration-500",
            theme === 'dark' 
              ? "rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100",
            isAnimating && theme !== 'dark' && "animate-spin"
          )} 
        />
        <Moon 
          className={cn(
            "absolute h-5 w-5 transition-all duration-500",
            theme === 'dark' 
              ? "rotate-0 scale-100 opacity-100" 
              : "rotate-90 scale-0 opacity-0",
            isAnimating && theme === 'dark' && "animate-spin"
          )} 
        />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
} 
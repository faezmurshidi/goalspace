'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Color category and samples
interface ColorCategory {
  title: string;
  description: string;
  colors: {
    name: string;
    variable: string;
    className?: string;
    textClass?: string;
  }[];
}

export function ColorSystemDemo() {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Handle hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const colorCategories: ColorCategory[] = [
    {
      title: 'Brand Colors',
      description: 'Core colors representing our brand identity',
      colors: [
        { name: 'Primary', variable: '--primary', className: 'bg-primary', textClass: 'text-primary-foreground' },
        { name: 'Primary Muted', variable: '--primary-muted', className: 'bg-[hsl(var(--primary-muted))]', textClass: 'text-[hsl(var(--foreground))]' },
      ]
    },
    {
      title: 'UI Colors',
      description: 'Colors for various interface elements',
      colors: [
        { name: 'Secondary', variable: '--secondary', className: 'bg-secondary', textClass: 'text-secondary-foreground' },
        { name: 'Accent', variable: '--accent', className: 'bg-accent', textClass: 'text-accent-foreground' },
        { name: 'Muted', variable: '--muted', className: 'bg-muted', textClass: 'text-muted-foreground' },
      ]
    },
    {
      title: 'Feedback Colors',
      description: 'Colors for status and feedback',
      colors: [
        { name: 'Success', variable: '--success', className: 'bg-[hsl(var(--success))]', textClass: 'text-[hsl(var(--success-foreground))]' },
        { name: 'Warning', variable: '--warning', className: 'bg-[hsl(var(--warning))]', textClass: 'text-[hsl(var(--warning-foreground))]' },
        { name: 'Destructive', variable: '--destructive', className: 'bg-destructive', textClass: 'text-destructive-foreground' },
        { name: 'Info', variable: '--info', className: 'bg-[hsl(var(--info))]', textClass: 'text-[hsl(var(--info-foreground))]' },
      ]
    },
    {
      title: 'Surface Colors',
      description: 'Background colors for different surfaces',
      colors: [
        { name: 'Background', variable: '--background', className: 'bg-background', textClass: 'text-foreground border border-border' },
        { name: 'Card', variable: '--card', className: 'bg-card', textClass: 'text-card-foreground border border-border' },
        { name: 'Popover', variable: '--popover', className: 'bg-popover', textClass: 'text-popover-foreground border border-border' },
      ]
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full space-y-8 px-4 py-8">
      <div className="mb-12 text-center">
        <h2 className="mb-2 text-3xl font-bold tracking-tight">Color System</h2>
        <p className="text-lg text-muted-foreground">
          Our color system is designed for accessibility and visual harmony in both light and dark modes
        </p>
      </div>

      {/* Current Theme Display */}
      <div className="mb-8 flex justify-center">
        <div className="rounded-lg bg-secondary px-4 py-2 font-medium">
          Current Theme: <span className="font-bold">{theme}</span>
        </div>
      </div>

      {/* Gradient Demo */}
      <div className="mb-12">
        <h3 className="mb-4 text-xl font-semibold">Gradient Effects</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div 
            className="flex h-32 items-center justify-center rounded-lg p-4 text-center"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
          >
            <span className="text-xl font-bold text-white drop-shadow-sm">Primary Gradient</span>
          </div>
          <div 
            className="flex h-32 items-center justify-center rounded-lg p-4 text-center"
            style={{ backgroundImage: 'var(--gradient-background)' }}
          >
            <span className="text-xl font-bold drop-shadow-sm">Background Gradient</span>
          </div>
        </div>
      </div>

      {/* Color Categories */}
      <div className="grid gap-8 md:grid-cols-2">
        {colorCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <div className="mb-2">
              <h3 className="text-xl font-semibold">{category.title}</h3>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            
            <div className="grid gap-4">
              {category.colors.map((color) => (
                <div
                  key={color.name}
                  className={cn(
                    "group relative flex h-20 items-center justify-between rounded-lg p-4 transition-all hover:scale-[1.02]",
                    color.className
                  )}
                >
                  <div className={cn("font-medium", color.textClass)}>
                    <div className="text-lg font-bold">{color.name}</div>
                    <div className="text-sm opacity-90">var({color.variable})</div>
                  </div>
                  
                  <button
                    className={cn(
                      "rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100",
                      color.textClass,
                      "hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                    onClick={() => copyToClipboard(`var(${color.variable})`)}
                    aria-label={`Copy ${color.name} variable`}
                  >
                    {copied === `var(${color.variable})` ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Effects & Shadows Demo */}
      <div className="mt-12">
        <h3 className="mb-4 text-xl font-semibold">Shadows & Effects</h3>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-full rounded-lg bg-card p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="font-medium">Small Shadow</div>
              <div className="text-xs text-muted-foreground">var(--shadow-sm)</div>
            </div>
            <span className="text-sm text-muted-foreground">Subtle elevation</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-full rounded-lg bg-card p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="font-medium">Medium Shadow</div>
              <div className="text-xs text-muted-foreground">var(--shadow-md)</div>
            </div>
            <span className="text-sm text-muted-foreground">Medium elevation</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-full rounded-lg bg-card p-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <div className="font-medium">Large Shadow</div>
              <div className="text-xs text-muted-foreground">var(--shadow-lg)</div>
            </div>
            <span className="text-sm text-muted-foreground">High elevation</span>
          </div>
        </div>
      </div>
      
      {/* Glass Effect Demo */}
      <div className="relative mt-12 overflow-hidden rounded-xl p-8">
        {/* Background decoration */}
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl"></div>
        
        <h3 className="mb-4 text-xl font-semibold relative z-10">Glass Effect</h3>
        <div className="relative z-10 grid gap-6 sm:grid-cols-2">
          <div className="glass-effect rounded-lg p-6">
            <h4 className="mb-2 font-semibold">Glass Card</h4>
            <p className="text-sm text-muted-foreground">The glass-effect utility class adds a modern frosted glass appearance to elements.</p>
          </div>
          
          <div className="glass-effect rounded-lg p-6">
            <h4 className="mb-2 font-semibold">How to Use</h4>
            <div className="rounded bg-secondary/80 p-2 text-sm font-mono">
              &lt;div className="glass-effect"&gt;
                <br />
                &nbsp;&nbsp;Content here
                <br />
              &lt;/div&gt;
            </div>
          </div>
        </div>
      </div>
      
      {/* Gradient Text Demo */}
      <div className="mt-12 text-center">
        <h3 className="mb-4 text-xl font-semibold">Gradient Text</h3>
        <p className="gradient-text text-4xl font-bold">Beautiful Gradient Typography</p>
        <p className="mt-2 text-sm text-muted-foreground">Use the 'gradient-text' utility class for eye-catching headlines</p>
      </div>
    </div>
  );
} 
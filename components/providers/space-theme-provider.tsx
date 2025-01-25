'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';
import type { SpaceColor } from '@/lib/store';

interface SpaceThemeContextType {
  colors: SpaceColor | null;
  setColors: (colors: SpaceColor | null) => void;
}

const SpaceThemeContext = createContext<SpaceThemeContextType | undefined>(undefined);

export function SpaceThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [colors, setColors] = React.useState<SpaceColor | null>(null);

  React.useEffect(() => {
    if (colors) {
      const root = document.documentElement;
      root.style.setProperty('--space-primary', colors.main);
      root.style.setProperty('--space-secondary', colors.secondary);
      root.style.setProperty('--space-accent', colors.accent);

      // Add CSS variables for different opacity levels
      root.style.setProperty('--space-primary-50', `${colors.main}80`);
      root.style.setProperty('--space-accent-50', `${colors.accent}80`);
    }

    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--space-primary');
      root.style.removeProperty('--space-secondary');
      root.style.removeProperty('--space-accent');
      root.style.removeProperty('--space-primary-50');
      root.style.removeProperty('--space-accent-50');
    };
  }, [colors]);

  return (
    <SpaceThemeContext.Provider value={{ colors, setColors }}>
      {children}
    </SpaceThemeContext.Provider>
  );
}

export function useSpaceTheme() {
  const context = useContext(SpaceThemeContext);
  if (context === undefined) {
    throw new Error('useSpaceTheme must be used within a SpaceThemeProvider');
  }
  return context;
} 
'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { collectSiteInfo } from '@/lib/services/siteInfoService';
import { useSiteInfoStore } from '@/lib/stores/siteInfoStore';
import { type SiteInfo } from '@/lib/services/siteInfoService';

// Create context with type safety
interface SiteInfoContextValue {
  siteInfo: SiteInfo | null;
  hasConsented: boolean;
  setConsent: (hasConsented: boolean) => void;
}

const SiteInfoContext = createContext<SiteInfoContextValue | null>(null);

/**
 * Debounce helper to limit frequency of function calls
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Provider component that initializes and manages site information
 */
export function SiteInfoProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { 
    siteInfo, 
    hasConsented,
    setSiteInfo, 
    updateSiteInfo,
    setConsent
  } = useSiteInfoStore();
  
  // Create a ref to prevent double initialization
  const initialized = useRef(false);
  
  useEffect(() => {
    // Skip initialization during SSR and if already initialized
    if (typeof window === 'undefined' || initialized.current) return;
    
    // Initial collection on first client render
    const info = collectSiteInfo();
    setSiteInfo(info);
    initialized.current = true;
    
    // Update screen size on resize (debounced)
    const handleResize = debounce(() => {
      if (typeof window !== 'undefined') {
        updateSiteInfo({
          screenSize: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        });
      }
    }, 500);
    
    // Network status change (if supported)
    const handleConnectionChange = () => {
      if (
        typeof navigator !== 'undefined' && 
        'connection' in navigator
      ) {
        const conn = (navigator as any).connection;
        updateSiteInfo({
          connectionType: conn?.type,
          connectionEffectiveType: conn?.effectiveType
        });
      }
    };
    
    // Set up event listeners
    window.addEventListener('resize', handleResize);
    
    // Network status change listener (if supported)
    if (
      typeof navigator !== 'undefined' && 
      'connection' in navigator &&
      (navigator as any).connection?.addEventListener
    ) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (
        typeof navigator !== 'undefined' && 
        'connection' in navigator &&
        (navigator as any).connection?.removeEventListener
      ) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [setSiteInfo, updateSiteInfo]);
  
  // Provide the site info context
  return (
    <SiteInfoContext.Provider 
      value={{ 
        siteInfo,
        hasConsented,
        setConsent
      }}
    >
      {children}
    </SiteInfoContext.Provider>
  );
}

/**
 * Hook to access site information
 * Throws an error if used outside of SiteInfoProvider
 */
export function useSiteInfo(): SiteInfoContextValue {
  const context = useContext(SiteInfoContext);
  
  if (!context) {
    throw new Error('useSiteInfo must be used within a SiteInfoProvider');
  }
  
  return context;
}
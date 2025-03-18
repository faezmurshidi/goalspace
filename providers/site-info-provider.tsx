'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collectSiteInfo } from '@/lib/services/siteInfoService';
import { useSiteInfoStore } from '@/lib/stores/siteInfoStore';
import { type SiteInfo } from '@/lib/services/siteInfoService';
import { createClient } from '@/utils/supabase/client';

// Create context with type safety
interface SiteInfoContextValue {
  siteInfo: SiteInfo | null;
  hasConsented: boolean;
  setConsent: (hasConsented: boolean) => void;
  isSyncing: boolean;
  lastSynced: Date | null;
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
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Create a ref to prevent double initialization
  const initialized = useRef(false);
  // Create a ref for debounced sync function
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  // Load user's site info from server if authenticated
  useEffect(() => {
    if (!user) return;
    
    const fetchSiteInfo = async () => {
      try {
        const response = await fetch('/api/user-site-info');
        if (!response.ok) {
          throw new Error(`Failed to fetch site info: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.siteInfo && Object.keys(data.siteInfo).length > 0) {
          // Merge with existing site info, preferring server data for overlapping fields
          setSiteInfo({
            ...collectSiteInfo(), // Base info (ensures all fields are present)
            ...data.siteInfo, // Override with server data
          });
          
          setLastSynced(new Date());
        }
      } catch (error) {
        console.error('Error fetching site info from server:', error);
      }
    };
    
    fetchSiteInfo();
  }, [user, setSiteInfo]);
  
  // Initialize and update site information
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
      
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [setSiteInfo, updateSiteInfo]);
  
  // Sync site information with server when it changes (if user is authenticated and has consented)
  useEffect(() => {
    if (!user || !siteInfo || !hasConsented) return;
    
    // Debounce sync to server (only sync after 5 seconds of no changes)
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        
        const response = await fetch('/api/user-site-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(siteInfo)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to sync site info: ${response.statusText}`);
        }
        
        setLastSynced(new Date());
      } catch (error) {
        console.error('Error syncing site info to server:', error);
      } finally {
        setIsSyncing(false);
      }
    }, 5000);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [user, siteInfo, hasConsented]);
  
  // Provide the site info context
  return (
    <SiteInfoContext.Provider 
      value={{ 
        siteInfo,
        hasConsented,
        setConsent,
        isSyncing,
        lastSynced
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
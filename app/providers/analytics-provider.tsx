'use client';

import { ReactNode, useEffect } from 'react';
import { usePageViewTracking, trackEvent } from '@/app/_lib/analytics';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Initialize page view tracking
  usePageViewTracking();
  
  // Track application lifecycle events
  useEffect(() => {
    // Track application start
    trackEvent('app_started', { timestamp: new Date().toISOString() });
    
    // Track application exit/close
    const handleBeforeUnload = () => {
      trackEvent('app_exited', { timestamp: new Date().toISOString() });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  return <>{children}</>;
} 
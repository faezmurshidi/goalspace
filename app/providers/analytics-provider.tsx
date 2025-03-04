'use client';

import { ReactNode } from 'react';
import { usePageViewTracking } from '@/app/_lib/analytics';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Initialize page view tracking
  usePageViewTracking();
  
  return <>{children}</>;
} 
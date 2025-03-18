'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSiteInfo } from '@/providers/site-info-provider';
import { getPreferredLocale } from '@/lib/stores/siteInfoStore';

/**
 * Component that automatically redirects users to their preferred language route
 * when they land on the root path. Only redirects if no locale is already in the URL.
 */
export function LanguageDetection() {
  const { siteInfo } = useSiteInfo();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Only redirect from root path and when we have site info
    if (pathname === '/' && siteInfo) {
      // Get the preferred locale based on browser language
      const locale = getPreferredLocale(siteInfo);
      
      // Redirect to the localized root page
      router.replace(`/${locale}`);
    }
  }, [siteInfo, pathname, router]);
  
  // This is a utility component with no UI
  return null;
}
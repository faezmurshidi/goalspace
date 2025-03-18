'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Check if analytics is enabled
const isAnalyticsEnabled = typeof window !== 'undefined' && 
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

// PostHog configuration
const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Initialize PostHog
const initPostHog = () => {
  if (isAnalyticsEnabled && postHogKey && typeof window !== 'undefined' && !(window as any).posthog) {
    import('posthog-js').then((posthog) => {
      posthog.default.init(postHogKey as string, {
        api_host: postHogHost,
        capture_pageview: false, // We'll handle this manually
        capture_pageleave: true,
        autocapture: true,
      });
      (window as any).posthog = posthog.default;
    }).catch(err => {
      console.error('Error initializing PostHog:', err);
    });
  }
};

// Custom hook to track page views
export function usePageViewTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Initialize analytics if not already done
    initPostHog();

    if (typeof window !== 'undefined') {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      // For development environments, log to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`Page view: ${url}`);
      }
      
      // PostHog tracking
      if (isAnalyticsEnabled && (window as any).posthog) {
        (window as any).posthog.capture('$pageview', { url, pathname });
      }
    }
  }, [pathname, searchParams]);
}

// Function to track specific events
export function trackEvent(eventName: string, eventParams: Record<string, any> = {}) {
  if (typeof window !== 'undefined') {
    // For development environments, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`Event: ${eventName}`, eventParams);
    }
    
    // PostHog tracking
    if (isAnalyticsEnabled && (window as any).posthog) {
      (window as any).posthog.capture(eventName, eventParams);
    }
  }
}

// Track user identification
export function identifyUser(userId: string, traits: Record<string, any> = {}) {
  if (typeof window !== 'undefined') {
    // For development environments, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`User identified: ${userId}`, traits);
    }
    
    // PostHog user identification
    if ((window as any).posthog) {
      (window as any).posthog.identify(userId, traits);
    }
  }
}

// Track feature usage
export function trackFeatureUsage(featureName: string, metadata: Record<string, any> = {}) {
  trackEvent('feature_used', { feature: featureName, ...metadata });
}

// Track errors
export function trackError(errorName: string, errorMessage: string, metadata: Record<string, any> = {}) {
  trackEvent('error_occurred', { 
    error_name: errorName, 
    error_message: errorMessage,
    ...metadata
  });
}

// Track user engagement
export function trackEngagement(engagementType: string, metadata: Record<string, any> = {}) {
  trackEvent('user_engagement', { 
    engagement_type: engagementType,
    ...metadata 
  });
}

// SEO helper functions
export function generateCanonicalUrl(path: string): string {
  return `https://goalspace.com${path}`;
}

// Generate structured data for different content types
export function generateStructuredData(type: 'WebApplication' | 'FAQPage' | 'Course' | 'Article', data: any) {
  let structuredData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": type,
  };
  
  switch(type) {
    case 'WebApplication':
      structuredData = {
        ...structuredData,
        name: data.name || 'GoalSpace',
        description: data.description || 'AI-Powered Goal Achievement Platform',
        applicationCategory: data.category || 'EducationalApplication',
        operatingSystem: 'All',
        ...data
      };
      break;
    
    case 'FAQPage':
      structuredData = {
        ...structuredData,
        mainEntity: data.questions.map((q: any) => ({
          "@type": "Question",
          "name": q.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": q.answer
          }
        }))
      };
      break;
      
    case 'Course':
      structuredData = {
        ...structuredData,
        name: data.name,
        description: data.description,
        provider: {
          "@type": "Organization",
          name: "GoalSpace",
          sameAs: "https://goalspace.com"
        },
        ...data
      };
      break;
      
    case 'Article':
      structuredData = {
        ...structuredData,
        headline: data.title,
        description: data.description,
        datePublished: data.publishDate,
        dateModified: data.modifiedDate,
        ...data
      };
      break;
  }
  
  return structuredData;
} 
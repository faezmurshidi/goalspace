'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Custom hook to track page views
export function usePageViewTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // This would connect to your analytics service
    // Example: Google Analytics, Plausible, etc.
    if (typeof window !== 'undefined') {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      // Here you would call your analytics service
      console.log(`Page view: ${url}`);
      
      // Example for Google Analytics
      // if (window.gtag) {
      //   window.gtag('config', 'G-YOUR-MEASUREMENT-ID', {
      //     page_path: url,
      //   });
      // }
    }
  }, [pathname, searchParams]);
}

// Function to track specific events
export function trackEvent(eventName: string, eventParams: Record<string, any> = {}) {
  if (typeof window !== 'undefined') {
    // Log the event for debugging
    console.log(`Event: ${eventName}`, eventParams);
    
    // Example for Google Analytics
    // if (window.gtag) {
    //   window.gtag('event', eventName, eventParams);
    // }
  }
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
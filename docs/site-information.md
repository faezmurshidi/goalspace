# Site Information Collection & Usage

This document outlines the strategy for collecting and leveraging site information from users to enhance the GoalSpace experience.

## Overview

The `feat/siteinfo` feature enables the collection of non-sensitive contextual information about user sessions to improve personalization, localization, and overall user experience. This implementation follows a privacy-first approach, collecting only essential information with transparent user consent.

## Implementation Phases

### Phase 1: Basic Collection Layer (Current)

In this initial phase, we focus on collecting readily available information through browser APIs without additional external services:

- Device information (type, screen size)
- Time context (timezone, visit time)
- Language preferences
- Session context (referrer, entry page)
- Basic network information

### Phase 2: Enhanced Collection (Future)

Future phases may incorporate:

- IP-based geolocation (country, region)
- More detailed network analysis
- Usage patterns and preferences
- Custom opt-in information

### Phase 3: Advanced Personalization (Future)

- AI-driven personalization based on collected data
- Regional content adaptation
- Time and context-aware features

## Data Collection Implementation

```typescript
// lib/services/siteInfoService.ts
export interface SiteInfo {
  // Basic device info
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  browserInfo: { name: string; version: string };
  
  // Time context
  visitTime: Date;
  timezone: string;
  
  // Language
  preferredLanguage: string;
  
  // Session context
  referrer: string;
  entryPath: string;
  
  // Connection (basic)
  connectionType?: string;
  connectionEffectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
}

export function collectSiteInfo(): SiteInfo {
  // Device detection
  const deviceType = detectDeviceType();
  
  // Browser detection
  const browserInfo = detectBrowser();
  
  return {
    // Device info
    deviceType,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    browserInfo,
    
    // Time context
    visitTime: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Language preferences
    preferredLanguage: navigator.language || 'en',
    
    // Session context
    referrer: document.referrer,
    entryPath: window.location.pathname,
    
    // Network (if available)
    connectionType: getConnectionType(),
    connectionEffectiveType: getConnectionEffectiveType()
  };
}
```

## Storage Architecture

We'll store site information in both client-side storage (for persistence) and the database (for logged-in users):

### Client Storage (Zustand)

```typescript
// lib/stores/siteInfoStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSiteInfoStore = create(
  persist(
    (set) => ({
      siteInfo: null,
      setSiteInfo: (info) => set({ siteInfo: info }),
      updateSiteInfo: (partialInfo) => 
        set((state) => ({ 
          siteInfo: { ...state.siteInfo, ...partialInfo } 
        })),
      clearSiteInfo: () => set({ siteInfo: null }),
    }),
    { name: 'goalspace-site-info' }
  )
);
```

### Database Storage (Supabase)

```sql
-- Future migration (Phase 2)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS site_info JSONB DEFAULT '{}'::jsonb;
```

## Initialization Process

Site information is collected once at initial page load and updated on significant changes:

```tsx
// providers/site-info-provider.tsx
'use client';

import { createContext, useContext, useEffect } from 'react';
import { collectSiteInfo } from '@/lib/services/siteInfoService';
import { useSiteInfoStore } from '@/lib/stores/siteInfoStore';

const SiteInfoContext = createContext(null);

export function SiteInfoProvider({ children }) {
  const { siteInfo, setSiteInfo, updateSiteInfo } = useSiteInfoStore();
  
  useEffect(() => {
    // Initial collection on page load
    if (!siteInfo) {
      const info = collectSiteInfo();
      setSiteInfo(info);
    }
    
    // Update on window resize (debounced)
    const handleResize = debounce(() => {
      updateSiteInfo({
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    }, 500);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <SiteInfoContext.Provider value={{ siteInfo }}>
      {children}
    </SiteInfoContext.Provider>
  );
}

export const useSiteInfo = () => useContext(SiteInfoContext);
```

## Usage Examples

### Automatic Language Detection

```tsx
// components/language-detection.tsx
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSiteInfo } from '@/providers/site-info-provider';

export function LanguageDetection() {
  const { siteInfo } = useSiteInfo();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Check if path already has locale
    if (pathname === '/' && siteInfo?.preferredLanguage) {
      const locale = siteInfo.preferredLanguage.split('-')[0];
      if (['en', 'ms', 'zh'].includes(locale)) {
        router.push(`/${locale}`);
      }
    }
  }, [siteInfo, pathname]);
  
  return null; // This is a utility component with no UI
}
```

### Device-Optimized UI

```tsx
// components/device-aware-component.tsx
import { useSiteInfo } from '@/providers/site-info-provider';

export function DeviceAwareComponent() {
  const { siteInfo } = useSiteInfo();
  
  if (!siteInfo) return <DefaultLayout />;
  
  // Responsive UI based on device type and screen size
  if (siteInfo.deviceType === 'mobile') {
    return <MobileOptimizedLayout />;
  } else if (siteInfo.screenSize.width < 768) {
    return <CompactLayout />;
  }
  
  return <FullLayout />;
}
```

### Timezone-Aware Displays

```tsx
// components/time-aware-component.tsx
import { useSiteInfo } from '@/providers/site-info-provider';
import { formatInTimeZone } from 'date-fns-tz';

export function TimeAwareComponent({ utcTime }) {
  const { siteInfo } = useSiteInfo();
  
  const localTime = siteInfo?.timezone 
    ? formatInTimeZone(new Date(utcTime), siteInfo.timezone, 'PPpp')
    : new Date(utcTime).toLocaleString();
    
  return (
    <div>
      <h3>Your Local Time</h3>
      <p>{localTime}</p>
    </div>
  );
}
```

## Privacy Considerations

- All collected information is non-sensitive and used only for improving user experience
- No personal identifiers are collected without explicit consent
- Users can view and clear their stored site information
- A privacy banner will inform users about data collection with clear opt-out options

## Future Considerations

- Regional content recommendations
- Time-of-day optimized suggestions
- Connection-quality adaptive content
- Device capability-aware features

## Next Steps

1. Implement basic collection layer (deviceType, screenSize, timezone, preferredLanguage)
2. Create the site info store with Zustand
3. Build the provider component
4. Implement first localization enhancements using the collected data
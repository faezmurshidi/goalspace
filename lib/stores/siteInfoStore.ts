/**
 * Site Information Store
 * 
 * Manages and persists site information using Zustand with persist middleware.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type SiteInfo } from '@/lib/services/siteInfoService';

interface SiteInfoState {
  // The collected site information
  siteInfo: SiteInfo | null;
  
  // Consent status for data collection (default to false for privacy)
  hasConsented: boolean;
  
  // Functions to manage the state
  setSiteInfo: (info: SiteInfo) => void;
  updateSiteInfo: (partialInfo: Partial<SiteInfo>) => void;
  clearSiteInfo: () => void;
  setConsent: (hasConsented: boolean) => void;
}

/**
 * Creates a Zustand store for site information with persistence
 */
export const useSiteInfoStore = create<SiteInfoState>()(
  persist(
    (set) => ({
      siteInfo: null,
      hasConsented: false,
      
      setSiteInfo: (info) => set({ siteInfo: info }),
      
      updateSiteInfo: (partialInfo) => 
        set((state) => ({
          siteInfo: state.siteInfo 
            ? { ...state.siteInfo, ...partialInfo } 
            : null
        })),
      
      clearSiteInfo: () => set({ siteInfo: null }),
      
      setConsent: (hasConsented) => set({ hasConsented }),
    }),
    {
      name: 'goalspace-site-info',
      // Use localStorage for persistence
      storage: createJSONStorage(() => localStorage),
      // Only persist these keys
      partialize: (state) => ({
        siteInfo: state.siteInfo,
        hasConsented: state.hasConsented,
      }),
    }
  )
);

/**
 * Helper function to extract locale from site info
 */
export function getPreferredLocale(siteInfo: SiteInfo | null): string {
  if (!siteInfo) return 'en';
  
  // Extract language code from full locale (e.g., "en-US" -> "en")
  const languageCode = siteInfo.preferredLanguage.split('-')[0].toLowerCase();
  
  // Return supported locale or default to English
  return ['en', 'ms', 'zh'].includes(languageCode) ? languageCode : 'en';
}
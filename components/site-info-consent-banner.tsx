'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteInfo } from '@/providers/site-info-provider';
import { useTranslations } from 'next-intl';

export function SiteInfoConsentBanner() {
  const { hasConsented, setConsent } = useSiteInfo();
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('siteInfo');

  // Only show banner after initial render and if consent hasn't been given
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(hasConsented === false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [hasConsented]);

  const handleAccept = () => {
    setConsent(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsent(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md bg-card rounded-lg shadow-lg p-4 z-50 border border-border animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-foreground mb-1">
            {t('enhanceExperience')}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t('dataCollectionMessage')}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAccept}
            >
              {t('accept')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDecline}
            >
              {t('decline')}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  );
}
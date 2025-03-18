'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteInfo } from '@/providers/site-info-provider';

export function SiteInfoConsentBanner() {
  const { hasConsented, setConsent } = useSiteInfo();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle mounting safely for hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only show banner after initial render and if consent hasn't been given
  useEffect(() => {
    if (!isMounted) return;
    
    const timer = setTimeout(() => {
      if (hasConsented === false) {
        setIsVisible(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [hasConsented, isMounted]);

  const handleAccept = () => {
    setConsent(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsent(false);
    setIsVisible(false);
  };

  // Don't render anything during SSR or initial hydration
  if (!isMounted) return null;
  
  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md bg-card rounded-lg shadow-lg p-4 z-50 border border-border animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-foreground mb-1">
            Enhance Your Experience
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            We collect anonymous usage data to improve your experience. Your privacy is important to us.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAccept}
            >
              Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDecline}
            >
              Decline
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
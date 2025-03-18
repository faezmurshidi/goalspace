'use client';

import { useState } from 'react';
import { useSiteInfo } from '@/providers/site-info-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, LayoutDashboard, Smartphone, Tablet, Monitor } from 'lucide-react';

/**
 * Debug component that displays site information.
 * Only use this in development environments.
 */
export function SiteInfoDebug() {
  const { siteInfo, hasConsented, setConsent, isSyncing, lastSynced } = useSiteInfo();
  const [isExpanded, setIsExpanded] = useState(false);

  // Safeguard to prevent rendering in production
  if (process.env.NODE_ENV === 'production') {
    console.warn('SiteInfoDebug should not be used in production environments');
    return null;
  }
  
  // Rest of the component logic...
}
  
  if (!siteInfo) {
    return (
      <Card className="max-w-md mx-auto my-4">
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No site information available.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Icon for device type
  const DeviceIcon = () => {
    switch (siteInfo.deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      default:
        return <LayoutDashboard className="h-5 w-5" />;
    }
  };

  return (
    <Card className="max-w-md mx-auto my-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DeviceIcon />
            Site Information
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium">Device Type:</div>
            <div className="text-sm">{siteInfo.deviceType}</div>
            
            <div className="text-sm font-medium">Screen Size:</div>
            <div className="text-sm">{siteInfo.screenSize.width} × {siteInfo.screenSize.height}</div>
            
            <div className="text-sm font-medium">Browser:</div>
            <div className="text-sm">{siteInfo.browserInfo.name} {siteInfo.browserInfo.version}</div>
            
            <div className="text-sm font-medium">Language:</div>
            <div className="text-sm">{siteInfo.preferredLanguage}</div>
            
            <div className="text-sm font-medium">Timezone:</div>
            <div className="text-sm">{siteInfo.timezone}</div>
            
            <div className="text-sm font-medium">Connection:</div>
            <div className="text-sm">{siteInfo.connectionEffectiveType || 'Unknown'}</div>
            
            <div className="text-sm font-medium">Consent Status:</div>
            <div className="text-sm">{hasConsented ? 'Granted' : 'Not granted'}</div>
            
            <div className="text-sm font-medium">Server Sync:</div>
            <div className="text-sm flex items-center gap-1">
              {isSyncing && (
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse mr-1"></span>
              )}
              {lastSynced 
                ? `Last synced: ${new Date(lastSynced).toLocaleTimeString()}`
                : 'Not synced with server'}
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1 mb-2 text-xs font-medium text-muted-foreground">
                <Code className="h-3 w-3" /> Raw Data
              </div>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48">
                {JSON.stringify(siteInfo, null, 2)}
              </pre>
              <div className="flex gap-2 mt-4">
                <Button
                  variant={hasConsented ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConsent(true)}
                >
                  Grant Consent
                </Button>
                <Button
                  variant={!hasConsented ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConsent(false)}
                >
                  Revoke Consent
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
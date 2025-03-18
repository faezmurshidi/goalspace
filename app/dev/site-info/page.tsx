'use client';

import { SiteInfoDebug } from '@/components/dev/site-info-debug';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SiteInfoDebugPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Site Information Debug</h1>
        
        <p className="text-muted-foreground mb-8">
          This page displays the site information collected by the application to improve user experience. 
          This information is only used for personalization and is not shared with third parties.
        </p>
        
        {/* Debug card */}
        <SiteInfoDebug />
        
        {/* Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About Site Information</CardTitle>
            <CardDescription>
              How we use site information to improve your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The GoalSpace app collects non-sensitive information about your device and preferences
              to provide a better user experience. This includes:
            </p>
            
            <ul className="list-disc pl-5 space-y-2">
              <li>Device type (mobile, tablet, desktop) for responsive layouts</li>
              <li>Screen size for optimized content presentation</li>
              <li>Language preference for automatic translation</li>
              <li>Timezone for scheduling and time-aware features</li>
              <li>Connection quality for adaptive content loading</li>
            </ul>
            
            <p>
              This information is stored locally on your device and is not sent to our servers
              unless you explicitly consent. You can revoke consent at any time using the banner
              or this debug page.
            </p>
            
            <div className="flex justify-end mt-4">
              <Link 
                href="/"
                className="text-sm text-primary hover:underline"
              >
                Return to homepage
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
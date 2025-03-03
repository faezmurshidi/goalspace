'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="container flex h-[80vh] w-full max-w-4xl flex-col items-center justify-center space-y-4 text-center">
      <Alert variant="destructive" className="max-w-2xl border-red-600">
        <ExclamationTriangleIcon className="h-5 w-5" />
        <AlertTitle className="text-lg">Something went wrong</AlertTitle>
        <AlertDescription className="mt-2 text-sm">
          {error.message || 'An unexpected error occurred while loading the dashboard.'}
          {error.digest && (
            <div className="mt-2 text-xs opacity-80">
              Error ID: {error.digest}
            </div>
          )}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <Button onClick={reset} variant="default" className="gap-2">
          <ReloadIcon className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Back to dashboard
        </Button>
      </div>
      
      <div className="max-w-md text-sm text-muted-foreground">
        <p>If this problem persists, please contact support or try refreshing the page.</p>
      </div>
    </div>
  );
}
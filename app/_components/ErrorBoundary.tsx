'use client'

import { useEffect } from 'react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-background text-foreground">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        We apologize for the inconvenience. Our team has been notified.
      </p>
      <Button
        onClick={reset}
        variant="default"
      >
        Try again
      </Button>
    </div>
  )
} 
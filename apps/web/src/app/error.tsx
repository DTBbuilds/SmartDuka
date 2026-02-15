'use client';

import { useEffect } from 'react';
import { Button } from '@smartduka/ui';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          We apologize for the inconvenience. An unexpected error has occurred.
          Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-muted-foreground">
          If this problem persists, please{' '}
          <Link href="/support" className="text-primary hover:underline font-medium">
            contact our support team
          </Link>
          {' '}or use our{' '}
          <Link href="/inbox" className="text-primary hover:underline font-medium">
            in-app messaging
          </Link>
        </p>
      </div>
    </div>
  );
}

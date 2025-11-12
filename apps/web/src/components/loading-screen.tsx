'use client';

import { Loader2 } from 'lucide-react';

/**
 * LoadingScreen Component
 * 
 * Full-screen loading indicator shown during:
 * - Initial authentication check
 * - Route transitions
 * - Auth state verification
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading SmartDuka</p>
          <p className="text-xs text-muted-foreground">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

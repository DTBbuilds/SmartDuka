'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  title?: string;
  description?: string;
  fullScreen?: boolean;
  transparent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LoadingScreen Component
 * 
 * Full-screen loading indicator shown during:
 * - Initial authentication check
 * - Route transitions
 * - Auth state verification
 * - Page data loading
 */
export function LoadingScreen({ 
  title = 'Loading SmartDuka',
  description = 'Please wait...',
  fullScreen = true,
  transparent = false,
  size = 'lg',
  className,
}: LoadingScreenProps) {
  const spinnerSizes = {
    sm: 'xl' as const,
    md: 'xl' as const,
    lg: 'xl' as const,
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-center z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0 min-h-[200px]',
        transparent ? 'bg-background/60' : 'bg-background/90',
        'backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo spinner */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">S</span>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact loading indicator for smaller sections
 */
export function LoadingSpinner({ 
  message,
  className,
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-8', className)}>
      <Spinner size="md" />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function ContentSkeleton({ 
  lines = 3,
  className,
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 rounded bg-muted animate-shimmer',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

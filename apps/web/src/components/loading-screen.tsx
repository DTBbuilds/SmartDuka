'use client';

import { CartLoader } from '@/components/ui/cart-loader';
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
  return (
    <CartLoader
      title={title}
      description={description}
      fullScreen={fullScreen}
      transparent={transparent}
      size="lg"
      className={cn(
        !fullScreen && 'absolute inset-0 min-h-[200px]',
        className
      )}
    />
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
    <CartLoader
      title={message}
      size="md"
      className={cn('py-8', className)}
    />
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

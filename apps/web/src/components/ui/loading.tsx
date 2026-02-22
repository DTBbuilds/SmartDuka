'use client';

import { cn } from '@/lib/utils';
import { CartLoader } from './cart-loader';
import { Spinner, DotsSpinner } from './spinner';

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  transparent?: boolean;
  className?: string;
}

/**
 * Full-screen or container loading overlay
 */
export function LoadingOverlay({ 
  message = 'Loading...', 
  fullScreen = false,
  transparent = false,
  className 
}: LoadingOverlayProps) {
  return (
    <CartLoader
      title={message}
      fullScreen={fullScreen}
      transparent={transparent}
      size="md"
      className={cn(!fullScreen && 'absolute inset-0', className)}
    />
  );
}

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Button with integrated loading state
 */
export function LoadingButton({
  loading = false,
  children,
  loadingText,
  className,
  disabled,
  onClick,
  type = 'button',
  variant = 'default',
  size = 'default',
}: LoadingButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {loading ? (
        <>
          <Spinner size="sm" variant={variant === 'default' ? 'white' : 'primary'} />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

/**
 * Inline loading indicator for sections
 */
export function InlineLoading({ message = 'Loading...', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-3 py-4', className)}>
      <CartLoader size="sm" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

interface PageLoadingProps {
  title?: string;
  description?: string;
}

/**
 * Page-level loading state with branding
 */
export function PageLoading({ title = 'Loading', description }: PageLoadingProps) {
  return (
    <CartLoader
      title={title}
      description={description}
      size="lg"
      className="min-h-[400px]"
    />
  );
}

interface DataLoadingProps {
  rows?: number;
  type?: 'table' | 'cards' | 'list';
}

/**
 * Data loading placeholder with shimmer effect
 */
export function DataLoading({ rows = 5, type = 'list' }: DataLoadingProps) {
  if (type === 'cards') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted animate-shimmer" />
            <div className="h-8 w-1/2 rounded bg-muted animate-shimmer" />
            <div className="h-3 w-full rounded bg-muted animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 flex-1 rounded bg-muted animate-shimmer" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b last:border-0 p-3">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div 
                  key={j} 
                  className="h-4 flex-1 rounded bg-muted animate-shimmer"
                  style={{ animationDelay: `${(i + j) * 100}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List type
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-muted animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-muted animate-shimmer" />
            <div className="h-3 w-1/2 rounded bg-muted animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton text lines
 */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
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

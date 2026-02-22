'use client';

import { cn } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

interface CartLoaderProps {
  /** Title shown below the spinner */
  title?: string;
  /** Subtitle / description */
  description?: string;
  /** Full-screen overlay (fixed inset-0) vs inline block */
  fullScreen?: boolean;
  /** Transparent background (for overlays on top of content) */
  transparent?: boolean;
  /** Compact mode — smaller icon, no text, for inline / button use */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * CartLoader — the single, canonical loading indicator for SmartDuka.
 *
 * Features the orange-gradient spinning arc with the ShoppingCart icon
 * that matches the app's primary orange theme.
 *
 * Usage:
 *   <CartLoader />                          — centered block, medium
 *   <CartLoader fullScreen />               — fixed full-screen overlay
 *   <CartLoader size="sm" />                — small inline spinner only
 *   <CartLoader title="Saving..." />        — with label
 */
export function CartLoader({
  title,
  description,
  fullScreen = false,
  transparent = false,
  size = 'md',
  className,
}: CartLoaderProps) {
  const iconSizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-9 w-9' };
  const containerSizes = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-20 w-20' };
  const svgSizes = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-20 w-20' };
  const svgRadius = { sm: 18, md: 25, lg: 37 };
  const svgViewBox = { sm: '0 0 40 40', md: '0 0 56 56', lg: '0 0 80 80' };
  const svgCenter = { sm: 20, md: 28, lg: 40 };
  const dashArray = { sm: '45 80', md: '80 140', lg: '120 200' };

  const spinner = (
    <div className="relative">
      {/* Glow behind icon */}
      <div
        className="absolute -inset-3 rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
        }}
      />

      <div className={cn('relative', containerSizes[size])}>
        {/* Spinning orange arc */}
        <svg
          className={cn('absolute inset-0 animate-spin', svgSizes[size])}
          style={{ animationDuration: '1.6s' }}
          viewBox={svgViewBox[size]}
        >
          <circle
            cx={svgCenter[size]}
            cy={svgCenter[size]}
            r={svgRadius[size]}
            fill="none"
            stroke="url(#cart-arc-gradient)"
            strokeWidth={size === 'sm' ? 2.5 : 3}
            strokeLinecap="round"
            strokeDasharray={dashArray[size]}
          />
          <defs>
            <linearGradient
              id="cart-arc-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner circle with cart icon */}
        <div
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center',
            'bg-gradient-to-br from-orange-500 to-amber-600 shadow-md',
          )}
        >
          <ShoppingCart className={cn('text-white', iconSizes[size])} />
        </div>
      </div>
    </div>
  );

  /* ── Compact (sm) — just the spinner, no text ── */
  if (size === 'sm') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        {spinner}
      </div>
    );
  }

  /* ── Full-screen overlay ── */
  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          transparent ? 'bg-background/60' : 'bg-background/90',
          'backdrop-blur-sm',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-5">
          {spinner}
          {(title || description) && (
            <div className="text-center">
              {title && (
                <p className="text-sm font-semibold text-foreground">{title}</p>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Inline / page-level block ── */
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12',
        className,
      )}
    >
      {spinner}
      {(title || description) && (
        <div className="text-center">
          {title && (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

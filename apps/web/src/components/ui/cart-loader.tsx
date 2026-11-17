'use client';

import { cn } from '@/lib/utils';
import { SmartDukaLogo } from '@/components/brand/smartduka-logo';

interface CartLoaderProps {
  title?: string;
  description?: string;
  fullScreen?: boolean;
  transparent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Canonical SmartDuka loader. The approved premium app mark remains still
 * and legible while a thin outer arc communicates progress. All auth/page/
 * checkout/stock loading surfaces inherit the same identity automatically.
 */
export function CartLoader({
  title,
  description,
  fullScreen = false,
  transparent = false,
  size = 'md',
  className,
}: CartLoaderProps) {
  const dimensions = {
    sm: { outer: 'h-10 w-10', logo: 'xs' },
    md: { outer: 'h-16 w-16', logo: 'lg' },
    lg: { outer: 'h-24 w-24', logo: 'xl' },
  } as const;
  const current = dimensions[size];
  const mark = (
    <div className={cn('relative flex items-center justify-center', current.outer)} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-xl" />
      <div className="absolute inset-0 rounded-full border-[3px] border-orange-500/15 border-t-orange-500 motion-safe:animate-spin" />
      <SmartDukaLogo size={current.logo} markOnly className="relative" />
    </div>
  );

  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={title || 'Loading SmartDuka'}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          transparent ? 'bg-background/70' : 'bg-background/95',
          'backdrop-blur-sm',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          {mark}
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title || 'Loading SmartDuka'}
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
    >
      {mark}
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

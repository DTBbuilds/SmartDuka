'use client';

import { Button } from '@smartduka/ui';
import { ArrowLeft } from 'lucide-react';
import { useSmartNavigation } from '@/hooks/use-smart-navigation';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Explicit fallback route if history is unavailable */
  fallbackRoute?: string;
  /** Button label (default: "Back") */
  label?: string;
  /** Show label on mobile (default: false) */
  showLabelOnMobile?: boolean;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional className */
  className?: string;
  /** Use icon-only style */
  iconOnly?: boolean;
}

/**
 * Smart Back Button Component
 * 
 * Uses intelligent navigation to return users to their previous activity
 * instead of unexpected pages like the dashboard.
 * 
 * Features:
 * - Uses browser history when available and meaningful
 * - Falls back to parent route or explicit fallback
 * - Consistent styling across the app
 */
export function BackButton({
  fallbackRoute,
  label = 'Back',
  showLabelOnMobile = false,
  variant = 'ghost',
  size = 'default',
  className,
  iconOnly = false,
}: BackButtonProps) {
  const { goBack } = useSmartNavigation();

  const handleClick = () => {
    goBack(fallbackRoute);
  };

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleClick}
        className={cn('h-9 w-9', className)}
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn('gap-2', className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className={showLabelOnMobile ? '' : 'hidden sm:inline'}>{label}</span>
    </Button>
  );
}

export default BackButton;

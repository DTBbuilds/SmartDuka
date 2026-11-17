import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Shared premium identity: mark for compact contexts, two-tone name for headers. */
export function SmartDukaLogo({
  size = 'md',
  markOnly = false,
  inverse = false,
  className,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  markOnly?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const sizes = {
    xs: { pixels: 20, text: 'text-sm' },
    sm: { pixels: 28, text: 'text-base' },
    md: { pixels: 36, text: 'text-lg' },
    lg: { pixels: 48, text: 'text-2xl' },
    xl: { pixels: 72, text: 'text-4xl' },
  } as const;
  const { pixels, text } = sizes[size];
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2 font-extrabold tracking-tight', className)}
      aria-label="SmartDuka"
    >
      <Image
        src="/brand/smartduka-mark.svg"
        alt={markOnly ? 'SmartDuka' : ''}
        width={pixels}
        height={pixels}
        unoptimized
        className="shrink-0"
      />
      {!markOnly && (
        <span aria-hidden="true" className={cn('whitespace-nowrap leading-none', text)}>
          <span className={inverse ? 'text-white' : 'text-foreground'}>Smart</span>
          <span className="text-[#f75b0b]">Duka</span>
        </span>
      )}
    </span>
  );
}

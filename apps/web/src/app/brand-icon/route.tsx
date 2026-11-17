import { ImageResponse } from 'next/og';
import { PremiumCartTile } from '@/components/brand/premium-cart-tile';

/** Full-resolution PNG for PWA install prompts; icon.tsx is intentionally 64px. */
export const runtime = 'edge';
export function GET() {
  return new ImageResponse(<PremiumCartTile side={512} />, {
    width: 512,
    height: 512,
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}

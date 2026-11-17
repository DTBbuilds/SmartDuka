import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { PremiumCartTile } from '@/components/brand/premium-cart-tile';

/** Full-resolution PNG endpoint for installed web-app icons. */
export const runtime = 'edge';
export function GET() {
  return new ImageResponse(createElement(PremiumCartTile, { side: 512 }), {
    width: 512,
    height: 512,
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}

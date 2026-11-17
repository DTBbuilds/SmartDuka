import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { PremiumCartTile } from '@/components/brand/premium-cart-tile';

/** 192px installed-app icon, using the identical premium cart geometry. */
export const runtime = 'edge';
export function GET() {
  return new ImageResponse(createElement(PremiumCartTile, { side: 192 }), {
    width: 192,
    height: 192,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}

import { ImageResponse } from 'next/og';
import { PremiumCartTile } from '@/components/brand/premium-cart-tile';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple home-screen icon uses the same premium mark as the PWA and Android. */
export default function AppleIcon() {
  return new ImageResponse(<PremiumCartTile side={180} />, { ...size });
}

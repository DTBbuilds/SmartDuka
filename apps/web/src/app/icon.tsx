import { ImageResponse } from 'next/og';
import { PremiumCartTile } from '@/components/brand/premium-cart-tile';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Search/browser favicon from the same geometry as all SmartDuka marks. */
export default function Icon() {
  return new ImageResponse(<PremiumCartTile side={64} />, { ...size });
}

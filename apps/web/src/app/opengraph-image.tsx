import { PremiumCartTile } from '@/components/brand/premium-cart-tile';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'SmartDuka – Point of Sale & Inventory Management Software';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#101820',
          backgroundImage: 'linear-gradient(135deg, #101820 0%, #0b0f16 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* The same premium cart mark and two-tone wordmark used in-app. */}
          <div style={{ display: 'flex', marginBottom: 30 }}>
            <PremiumCartTile side={128} />
          </div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
            <span style={{ color: '#ffffff' }}>Smart</span>
            <span style={{ color: '#ff8418' }}>Duka</span>
          </div>

          {/* Tagline */}
          <span
            style={{
              fontSize: 32,
              color: '#ffc29d',
              fontWeight: 500,
              marginBottom: 40,
            }}
          >
            Point of Sale & Inventory Management Software
          </span>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              gap: 16,
            }}
          >
            {['POS System', 'Inventory', 'Analytics', 'Barcode Scanner'].map(
              (feature) => (
                <div
                  key={feature}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 999,
                    color: '#e2e8f0',
                    fontSize: 20,
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {feature}
                </div>
              )
            )}
          </div>

          {/* URL */}
          <span
            style={{
              fontSize: 22,
              color: '#64748b',
              marginTop: 40,
            }}
          >
            www.smartduka.org
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

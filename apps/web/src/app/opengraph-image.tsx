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
          backgroundColor: '#1e3a5f',
          backgroundImage: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
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
          {/* Logo circle */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: 'white',
              }}
            >
              S
            </span>
          </div>

          {/* Brand name */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            SmartDuka
          </span>

          {/* Tagline */}
          <span
            style={{
              fontSize: 32,
              color: '#93c5fd',
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

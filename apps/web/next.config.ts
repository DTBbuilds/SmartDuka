import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Get all local network IPs dynamically for development
function getLocalNetworkIPs(): string[] {
  const nets = networkInterfaces();
  const ips: string[] = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// Build allowed origins for development - allows any IP on local network
const allowedDevOrigins = process.env.NODE_ENV !== 'production' 
  ? [
      'localhost',
      '127.0.0.1',
      ...getLocalNetworkIPs(),
      // Allow common private network ranges (covers most home/office networks)
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
    ]
  : [];

const nextConfig: NextConfig = {
  /* config options here */
  // Removed reactCompiler and turbopack config for Vercel compatibility
  
  // Allow cross-origin requests from local network IPs in development
  // This enables testing from mobile devices on the same network
  allowedDevOrigins,
  
  // SEO: Redirect non-www to www for domain consolidation
  async redirects() {
    return [
      // Redirect non-www to www (for production)
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'smartduka.org',
          },
        ],
        destination: 'https://www.smartduka.org/:path*',
        permanent: true, // 301 redirect for SEO
      },
      // Redirect http to https www
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://www.smartduka.org/:path*',
        permanent: true,
      },
    ];
  },
  
  // SEO: Add security and caching headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Cache static assets
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/screenshots/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

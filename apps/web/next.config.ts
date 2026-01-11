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
};

export default nextConfig;

/**
 * Application Configuration
 * Centralized configuration for the entire app with environment detection
 */

// Detect environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// API version prefix
const API_VERSION = '/api/v1';

/**
 * API-URL-RECOVERY1: NEXT_PUBLIC_API_URL must be the BARE API origin
 * (no /api/v1 suffix, no trailing slash) — config appends API_VERSION
 * itself and unversioned endpoints (ping/health) hang off the bare
 * origin. Normalize defensively so a misconfigured value can never
 * produce /api/v1/api/v1/... or /api/v1/ping.
 */
export const normalizeApiOrigin = (url: string): string =>
  url.trim().replace(/\/+$/, '').replace(/(?:\/api\/v1)+$/, '');

// Helper to get the current host for mobile testing on same network
// This is called dynamically to support client-side detection
const getDevApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && isDevelopment) {
    // If accessing from a non-localhost address (e.g., phone on same network),
    // use the same host but with the API port
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return `http://${currentHost}:5000`;
    }
  }
  return normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
};

// Backend API URLs (static fallbacks for SSR)
const BACKEND_URLS = {
  development: normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'),
  production: normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL || 'https://smartduka-91q6.onrender.com'),
} as const;

// Frontend URLs
const FRONTEND_URLS = {
  development: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  production: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://smartduka.vercel.app',
} as const;

// Get the appropriate URL based on environment (dynamic for client-side)
const getBackendUrl = (): string => {
  if (isDevelopment) {
    return `${getDevApiBaseUrl()}${API_VERSION}`;
  }
  return `${BACKEND_URLS.production}${API_VERSION}`;
};

// Get base backend URL without API version (for webhooks, health checks)
const getBackendBaseUrl = (): string => {
  if (isDevelopment) {
    return getDevApiBaseUrl();
  }
  return BACKEND_URLS.production;
};

const getFrontendUrl = (): string => {
  if (isDevelopment) {
    return FRONTEND_URLS.development;
  }
  return FRONTEND_URLS.production;
};

export const config = {
  // Environment
  isDevelopment,
  isProduction,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Backend API URL (includes /api/v1 prefix) - computed dynamically for mobile testing
  get apiUrl() {
    return getBackendUrl();
  },
  
  // Backend base URL (without API version - for health checks, webhooks)
  get apiBaseUrl() {
    return getBackendBaseUrl();
  },
  
  // Frontend URL
  get frontendUrl() {
    return getFrontendUrl();
  },
  
  // API version
  apiVersion: API_VERSION,
  
  // API endpoints (relative to apiUrl)
  endpoints: {
    auth: {
      login: '/auth/login',
      loginPin: '/auth/login-pin',
      registerShop: '/auth/register-shop',
    },
    activity: {
      log: '/activity/log',
    },
    status: {
      update: '/status/update',
    },
  },
};

export default config;

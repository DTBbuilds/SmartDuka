/**
 * Application Configuration
 * Centralized configuration for the entire app with environment detection
 */

// Detect environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Backend API URLs
const BACKEND_URLS = {
  development: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  production: process.env.NEXT_PUBLIC_API_URL || 'https://smarduka.onrender.com',
} as const;

// Frontend URLs
const FRONTEND_URLS = {
  development: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  production: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://smartduka.vercel.app',
} as const;

// API version prefix
const API_VERSION = '/api/v1';

// Get the appropriate URL based on environment
const getBackendUrl = (): string => {
  const baseUrl = isDevelopment ? BACKEND_URLS.development : BACKEND_URLS.production;
  return `${baseUrl}${API_VERSION}`;
};

// Get base backend URL without API version (for webhooks, health checks)
const getBackendBaseUrl = (): string => {
  if (isDevelopment) {
    return BACKEND_URLS.development;
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
  
  // Backend API URL (includes /api/v1 prefix)
  apiUrl: getBackendUrl(),
  
  // Backend base URL (without API version - for health checks, webhooks)
  apiBaseUrl: getBackendBaseUrl(),
  
  // Frontend URL
  frontendUrl: getFrontendUrl(),
  
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
} as const;

export default config;

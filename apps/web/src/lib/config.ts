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

// Get the appropriate URL based on environment
const getBackendUrl = (): string => {
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
  
  // Backend API URL
  apiUrl: getBackendUrl(),
  
  // Frontend URL
  frontendUrl: getFrontendUrl(),
  
  // API endpoints
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

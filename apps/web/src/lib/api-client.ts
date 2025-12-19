/**
 * Centralized API Client
 * All API calls should go through this client to ensure consistent
 * URL handling, error handling, and authentication.
 */

import { config } from './config';

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Request options
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Get the stored auth token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first (matches auth-context.tsx key)
  return localStorage.getItem('smartduka:token') || 
         sessionStorage.getItem('smartduka:token') ||
         null;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = config.apiUrl;
  const url = new URL(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Main API request function
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...restOptions } = options;
  
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const url = buildUrl(endpoint, params);
  
  const fetchOptions: RequestInit = {
    ...restOptions,
    headers,
  };
  
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  // Handle no content responses
  if (response.status === 204) {
    return {} as T;
  }
  
  // Safely parse JSON - handle empty responses
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  
  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      // Clear stored tokens (matches auth-context.tsx key)
      localStorage.removeItem('smartduka:token');
      sessionStorage.removeItem('smartduka:token');
      
      // Redirect to login page if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
        return {} as T; // Return empty to prevent further processing
      }
    }
    
    const error: ApiError = {
      message: data.message || data.error || 'An error occurred',
      statusCode: response.status,
      error: data.error,
    };
    throw error;
  }
  
  return data as T;
}

/**
 * API Client with HTTP method helpers
 */
export const api = {
  /**
   * Base URL for the API
   */
  baseUrl: config.apiUrl,
  
  /**
   * GET request
   */
  get: <T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET', params }),
  
  /**
   * POST request
   */
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  
  /**
   * PUT request
   */
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  
  /**
   * PATCH request
   */
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),
  
  /**
   * DELETE request (supports optional body for APIs that require it)
   */
  delete: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE', body }),
  
  /**
   * Upload file(s)
   */
  upload: async <T = unknown>(endpoint: string, formData: FormData, options?: Omit<RequestOptions, 'body'>) => {
    const token = getAuthToken();
    const url = buildUrl(endpoint);
    
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      ...options,
    });
    
    // Safely parse JSON - handle empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
      throw {
        message: data.message || 'Upload failed',
        statusCode: response.status,
      };
    }
    
    return data as T;
  },
};

/**
 * Helper to get full URL for an endpoint (useful for direct fetch calls)
 */
export function getApiUrl(endpoint: string): string {
  return buildUrl(endpoint);
}

/**
 * Export config for backward compatibility
 */
export { config };

export default api;

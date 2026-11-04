/**
 * Centralized API Client
 * All API calls should go through this client to ensure consistent
 * URL handling, error handling, and authentication.
 */

import { config } from './config';
import { getCsrfToken } from './secure-session';
import { apiResilience } from './api-resilience';

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
  /** Per-request timeout override (ms). Default 30000 (cold-start friendly). */
  timeoutMs?: number;
  /**
   * Explicitly allow auto-retry for non-idempotent methods — ONLY for
   * operations that are demonstrably idempotent or carry a server-side
   * idempotency key. Never enable for financial submissions.
   */
  retryOnNonIdempotent?: boolean;
}

/**
 * ERROR-UX-RELIABILITY1 (PR B): client-side mirror of the backend's stable
 * error-code map — used when a response carries no explicit code (old
 * backend responses, proxies, non-JSON gateway bodies).
 */
const STATUS_ERROR_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

function statusCodeToCode(status: number): string {
  return STATUS_ERROR_CODES[status] || (status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR');
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
 * Note: We concatenate baseUrl + endpoint directly because new URL() with a path
 * starting with "/" replaces the entire path of the base URL, stripping /api/v1
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = config.apiUrl;
  // Ensure endpoint starts with / and baseUrl doesn't end with /
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${normalizedBase}${normalizedEndpoint}`;
  
  const url = new URL(fullUrl);
  
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
 * ERROR-UX-RELIABILITY1 (PR A): extract a safe, human message from any
 * error payload shape the backend (or a proxy) may produce — including the
 * canonical contract (message/errors/code), Nest validation arrays, and
 * non-JSON bodies. Never surfaces stack/DB internals (the canonical filter
 * already sanitizes; this is the last line of defense).
 */
function extractErrorMessage(data: any, fallback: string): string {
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (Array.isArray(data.message) && data.message.length) {
      return data.message.join(', ');
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }
  return fallback;
}

/**
 * Main API request function
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, timeoutMs, retryOnNonIdempotent, ...restOptions } = options;
  
  const token = getAuthToken();
  
  const csrfToken = getCsrfToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  // Include CSRF token for state-changing requests
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(restOptions.method || 'GET')) {
    (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
  }
  
  const url = buildUrl(endpoint, params);
  
  const fetchOptions: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include', // Send httpOnly cookies
  };
  
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }
  
  let response: Response;
  
  try {
    // Resilient fetch: automatic retries for idempotent methods only;
    // POST/PATCH/PUT/DELETE are never auto-retried (duplicate-submission
    // hazard) unless the caller explicitly opts in.
    response = await apiResilience.resilientFetch(
      url,
      { ...fetchOptions, retryOnNonIdempotent },
      {
        maxRetries: 3,
        timeoutMs: timeoutMs ?? 30000, // 30 seconds for cold starts
      },
    );
  } catch (fetchError: any) {
    // Network error, timeout, or caller cancellation — no retry happened
    // for non-idempotent methods, so the operation was NOT duplicated.
    const isTimeout = fetchError?.name === 'AbortError';
    const error: ApiError = {
      message: isTimeout
        ? 'The server took too long to respond. Check whether the operation completed before retrying.'
        : fetchError?.message || 'Unable to connect to server',
      statusCode: 0,
      error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
    throw error;
  }
  
  // Mark backend as ready on successful response
  apiResilience.markReady();
  
  // Handle no content responses
  if (response.status === 204) {
    return {} as T;
  }
  
  // ERROR-UX-RELIABILITY1 (PR A): safely parse the body — proxies and
  // gateways can return HTML/empty bodies on 502/503 that are not JSON.
  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        data = null; // fall through to the status-based error below
      } else {
        // 2xx with an unparseable body — surface honestly instead of
        // returning a corrupted payload.
        const error: ApiError = {
          message: 'The server returned an unexpected response. Please try again.',
          statusCode: response.status,
          error: 'MALFORMED_RESPONSE',
        };
        throw error;
      }
    }
  }
  
  if (!response.ok) {
    // Handle 401 Unauthorized — session is over. Throw a typed error so
    // callers can distinguish auth failure from empty data; the redirect
    // happens once. (PR A: this previously returned {} as T — callers saw a
    // FAKE SUCCESSFUL empty response and silently did nothing.)
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('smartduka:token');
      sessionStorage.removeItem('smartduka:token');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    
    const error: ApiError = {
      message:
        response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : extractErrorMessage(
              data,
              data === null && response.status >= 500
                ? 'Service temporarily unavailable. Please try again.'
                : 'An error occurred',
            ),
      statusCode: response.status,
      error: data?.code || data?.error || statusCodeToCode(response.status),
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
   *
   * ERROR-UX-RELIABILITY1 (PR A): hardened — CSRF header on the mutation,
   * safe non-JSON handling, canonical ApiError (was: raw thrown object,
   * unguarded JSON.parse, missing CSRF header), no auto-retry (uploads are
   * POSTs).
   */
  upload: async <T = unknown>(endpoint: string, formData: FormData, options?: Omit<RequestOptions, 'body'>) => {
    const token = getAuthToken();
    const url = buildUrl(endpoint);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
        ...options,
      });
    } catch (fetchError: any) {
      const isTimeout = fetchError?.name === 'AbortError';
      throw {
        message: isTimeout
          ? 'Upload timed out. Check whether the file was uploaded before retrying.'
          : fetchError?.message || 'Unable to connect to server',
        statusCode: 0,
        error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      } as ApiError;
    }

    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      throw {
        message:
          response.status === 401
            ? 'Your session has expired. Please sign in again.'
            : extractErrorMessage(data, 'Upload failed'),
        statusCode: response.status,
        error: data?.code || data?.error,
      } as ApiError;
    }

    return (data ?? {}) as T;
  },
};

/**
 * Helper to get full URL for an endpoint (useful for direct fetch calls)
 */
export function getApiUrl(endpoint: string): string {
  return buildUrl(endpoint);
}

/**
 * Download a file with authentication and open in new tab
 * Useful for PDFs, receipts, invoices that require auth
 */
export async function downloadWithAuth(endpoint: string, filename?: string): Promise<void> {
  const token = getAuthToken();
  const url = buildUrl(endpoint);
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    const blob = await response.blob();
    
    // For HTML content, open in new tab
    if (contentType.includes('text/html')) {
      const html = await blob.text();
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
      return;
    }
    
    // For other files (PDF, etc.), trigger download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Export config for backward compatibility
 */
export { config };

export default api;

/**
 * API Error Handler Utility
 * Provides consistent error handling across all API calls
 */

export interface ApiError {
  status: number;
  message: string;
  type: 'auth' | 'permission' | 'not_found' | 'validation' | 'server' | 'network';
}

export function parseApiError(response: Response): ApiError {
  const status = response.status;

  if (status === 401) {
    return {
      status,
      message: 'Your session has expired. Please login again.',
      type: 'auth',
    };
  }

  if (status === 403) {
    return {
      status,
      message: 'You do not have permission to access this resource.',
      type: 'permission',
    };
  }

  if (status === 404) {
    return {
      status,
      message: 'The requested resource was not found.',
      type: 'not_found',
    };
  }

  if (status === 400) {
    return {
      status,
      message: 'Invalid request. Please check your input.',
      type: 'validation',
    };
  }

  if (status >= 500) {
    return {
      status,
      message: 'Server error. Please try again later.',
      type: 'server',
    };
  }

  return {
    status,
    message: 'An error occurred. Please try again.',
    type: 'server',
  };
}

export async function handleApiResponse<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    const error = parseApiError(response);
    throw error;
  }

  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

export function isAuthError(error: any): boolean {
  return error?.type === 'auth' || error?.status === 401;
}

export function isPermissionError(error: any): boolean {
  return error?.type === 'permission' || error?.status === 403;
}

export function isNotFoundError(error: any): boolean {
  return error?.type === 'not_found' || error?.status === 404;
}

export function getErrorMessage(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.error?.message) {
    return error.error.message;
  }
  return 'An unexpected error occurred';
}

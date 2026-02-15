/**
 * User-Friendly Error Messages
 * 
 * Maps technical errors to human-readable messages
 * that help users understand what went wrong and what to do.
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  canRetry: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Common error patterns and their user-friendly translations
 */
const errorPatterns: Array<{
  pattern: RegExp | string;
  error: UserFriendlyError;
}> = [
  // Network errors
  {
    pattern: /fetch|network|ECONNREFUSED|ENOTFOUND|ERR_NETWORK/i,
    error: {
      title: 'Connection Problem',
      message: 'Unable to reach our servers. This could be due to your internet connection or our servers being temporarily unavailable.',
      suggestion: 'Please check your internet connection and try again.',
      canRetry: true,
      severity: 'warning',
    },
  },
  {
    pattern: /timeout|ETIMEDOUT|aborted/i,
    error: {
      title: 'Request Timeout',
      message: 'The request took too long to complete. Our servers might be experiencing high traffic.',
      suggestion: 'Please wait a moment and try again.',
      canRetry: true,
      severity: 'warning',
    },
  },
  {
    pattern: /offline|no internet/i,
    error: {
      title: 'You\'re Offline',
      message: 'It looks like you\'ve lost your internet connection.',
      suggestion: 'Please check your connection and try again when you\'re back online.',
      canRetry: true,
      severity: 'warning',
    },
  },

  // Authentication errors
  {
    pattern: /401|unauthorized|not authenticated|session expired/i,
    error: {
      title: 'Session Expired',
      message: 'Your login session has expired for security reasons.',
      suggestion: 'Please log in again to continue.',
      canRetry: false,
      severity: 'info',
    },
  },
  {
    pattern: /403|forbidden|not authorized|permission denied/i,
    error: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestion: 'If you believe this is an error, please contact your administrator.',
      canRetry: false,
      severity: 'warning',
    },
  },
  {
    pattern: /invalid.*credentials|wrong.*password|incorrect.*password/i,
    error: {
      title: 'Login Failed',
      message: 'The email or password you entered is incorrect.',
      suggestion: 'Please check your credentials and try again.',
      canRetry: true,
      severity: 'warning',
    },
  },

  // Validation errors
  {
    pattern: /400|bad request|validation|invalid.*input/i,
    error: {
      title: 'Invalid Input',
      message: 'Some of the information you provided is not valid.',
      suggestion: 'Please check your input and try again.',
      canRetry: true,
      severity: 'warning',
    },
  },
  {
    pattern: /duplicate|already exists|unique constraint/i,
    error: {
      title: 'Already Exists',
      message: 'This item already exists in the system.',
      suggestion: 'Please use a different value or update the existing item.',
      canRetry: false,
      severity: 'info',
    },
  },

  // Not found errors
  {
    pattern: /404|not found|does not exist/i,
    error: {
      title: 'Not Found',
      message: 'The item you\'re looking for could not be found.',
      suggestion: 'It may have been deleted or moved.',
      canRetry: false,
      severity: 'info',
    },
  },

  // Server errors
  {
    pattern: /500|internal server|server error/i,
    error: {
      title: 'Server Error',
      message: 'Something went wrong on our end. Our team has been notified.',
      suggestion: 'Please try again in a few minutes.',
      canRetry: true,
      severity: 'error',
    },
  },
  {
    pattern: /502|503|504|service unavailable|bad gateway/i,
    error: {
      title: 'Service Temporarily Unavailable',
      message: 'Our servers are currently undergoing maintenance or experiencing high load.',
      suggestion: 'Please try again in a few minutes.',
      canRetry: true,
      severity: 'warning',
    },
  },

  // Payment errors
  {
    pattern: /payment.*failed|transaction.*failed|insufficient.*funds/i,
    error: {
      title: 'Payment Failed',
      message: 'We couldn\'t process your payment.',
      suggestion: 'Please check your payment details and try again, or use a different payment method.',
      canRetry: true,
      severity: 'warning',
    },
  },

  // Rate limiting
  {
    pattern: /429|too many requests|rate limit/i,
    error: {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests in a short time.',
      suggestion: 'Please wait a moment before trying again.',
      canRetry: true,
      severity: 'info',
    },
  },
];

/**
 * Convert a technical error to a user-friendly message
 */
export function getUserFriendlyError(error: unknown): UserFriendlyError {
  // Extract error message
  let errorMessage = '';
  let statusCode: number | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    const err = error as any;
    errorMessage = err.message || err.error || err.statusText || JSON.stringify(error);
    statusCode = err.status || err.statusCode;
  }

  // Add status code to message for pattern matching
  const fullMessage = statusCode ? `${statusCode} ${errorMessage}` : errorMessage;

  // Find matching pattern
  for (const { pattern, error: friendlyError } of errorPatterns) {
    if (typeof pattern === 'string') {
      if (fullMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return friendlyError;
      }
    } else if (pattern.test(fullMessage)) {
      return friendlyError;
    }
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. We apologize for the inconvenience.',
    suggestion: 'Please try again. If the problem persists, contact support.',
    canRetry: true,
    severity: 'error',
  };
}

/**
 * Format error for display in toast/alert
 */
export function formatErrorForToast(error: unknown): { title: string; message: string } {
  const friendly = getUserFriendlyError(error);
  return {
    title: friendly.title,
    message: friendly.suggestion ? `${friendly.message} ${friendly.suggestion}` : friendly.message,
  };
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch|network|ECONNREFUSED|ENOTFOUND|ERR_NETWORK|timeout|offline/i.test(message);
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = (error as any)?.status || (error as any)?.statusCode;
  return statusCode === 401 || /unauthorized|session expired|not authenticated/i.test(message);
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetry(error: unknown): boolean {
  return getUserFriendlyError(error).canRetry;
}

/**
 * Error Handler Service - Centralized error handling and transformation
 *
 * Features:
 * - Transforms API errors into user-friendly messages
 * - Provides error codes for different error types
 * - Supports internationalization-ready error messages
 * - Determines error severity and retry eligibility
 */

import { ApiClientError } from './api/client';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Standardized error format for display
 */
export interface DisplayError {
  title: string;
  message: string;
  severity: ErrorSeverity;
  isRetryable: boolean;
  code: string;
  originalError?: Error;
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, { title: string; message: string; severity: ErrorSeverity }> =
  {
    NETWORK_ERROR: {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      severity: 'error',
    },
    TIMEOUT: {
      title: 'Request Timeout',
      message: 'The request took too long. Please try again.',
      severity: 'warning',
    },
    UNAUTHORIZED: {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      severity: 'warning',
    },
    FORBIDDEN: {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      severity: 'error',
    },
    CLIENT_ERROR: {
      title: 'Request Failed',
      message: 'The request could not be completed. Please try again.',
      severity: 'error',
    },
    SERVER_ERROR: {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
      severity: 'error',
    },
    UNKNOWN_ERROR: {
      title: 'Error',
      message: 'An unexpected error occurred. Please try again.',
      severity: 'error',
    },
    OFFLINE: {
      title: 'No Internet',
      message: 'You appear to be offline. Please check your connection.',
      severity: 'warning',
    },
    RENDER_ERROR: {
      title: 'Display Error',
      message: 'Something went wrong displaying this screen.',
      severity: 'error',
    },
  };

/**
 * HTTP status code specific messages
 */
const HTTP_STATUS_MESSAGES: Record<number, { title: string; message: string }> = {
  400: { title: 'Invalid Request', message: 'The request was invalid. Please check your input.' },
  404: { title: 'Not Found', message: 'The requested resource could not be found.' },
  409: { title: 'Conflict', message: 'This action conflicts with the current state.' },
  422: { title: 'Validation Error', message: 'Please check your input and try again.' },
  429: { title: 'Too Many Requests', message: 'Please wait a moment before trying again.' },
  500: { title: 'Server Error', message: 'Something went wrong on our end.' },
  502: { title: 'Server Unavailable', message: 'The server is temporarily unavailable.' },
  503: { title: 'Service Unavailable', message: 'The service is temporarily unavailable.' },
  504: { title: 'Gateway Timeout', message: 'The server took too long to respond.' },
};

/**
 * Transform any error into a standardized DisplayError
 */
export function transformError(error: unknown): DisplayError {
  // Handle ApiClientError
  if (error instanceof ApiClientError) {
    return transformApiError(error);
  }

  // Handle standard Error
  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred.',
      severity: 'error',
      isRetryable: false,
      code: 'UNKNOWN_ERROR',
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      title: 'Error',
      message: error,
      severity: 'error',
      isRetryable: false,
      code: 'UNKNOWN_ERROR',
    };
  }

  // Handle unknown error types
  return {
    title: 'Error',
    message: 'An unexpected error occurred.',
    severity: 'error',
    isRetryable: false,
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Transform ApiClientError to DisplayError
 */
function transformApiError(error: ApiClientError): DisplayError {
  const defaultInfo = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;

  // Check for specific HTTP status messages
  const statusInfo = HTTP_STATUS_MESSAGES[error.status];

  // Use API error message if it's meaningful, otherwise use default
  const useApiMessage =
    error.message &&
    error.message !== 'An error occurred' &&
    error.message !== 'Network Error' &&
    !error.message.includes('timeout');

  return {
    title: statusInfo?.title || defaultInfo.title,
    message: useApiMessage ? error.message : statusInfo?.message || defaultInfo.message,
    severity: defaultInfo.severity,
    isRetryable: error.isRetryable,
    code: error.code,
    originalError: error,
  };
}

/**
 * Create an offline error
 */
export function createOfflineError(): DisplayError {
  return {
    ...ERROR_MESSAGES.OFFLINE,
    isRetryable: true,
    code: 'OFFLINE',
  };
}

/**
 * Create a render error for error boundaries
 */
export function createRenderError(error: Error): DisplayError {
  return {
    ...ERROR_MESSAGES.RENDER_ERROR,
    isRetryable: false,
    code: 'RENDER_ERROR',
    originalError: error,
  };
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT';
  }
  return false;
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN';
  }
  return false;
}

/**
 * Get error message for quick display (single line)
 */
export function getErrorMessage(error: unknown): string {
  const displayError = transformError(error);
  return displayError.message;
}

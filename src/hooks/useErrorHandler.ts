/**
 * useErrorHandler Hook - Display errors as toasts with retry support
 *
 * Features:
 * - Display errors as toast notifications
 * - Automatic error transformation to user-friendly messages
 * - Support for retry callbacks
 * - Integration with network store for offline detection
 * - Haptic feedback on errors
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { toast } from 'sonner-native';
import { createOfflineError, type DisplayError, transformError } from '../services/errorHandler';
import { selectIsOffline, useNetworkStore } from '../stores/networkStore';

interface ErrorHandlerOptions {
  showToast?: boolean;
  hapticFeedback?: boolean;
  onRetry?: () => void | Promise<void>;
}

interface ErrorHandlerResult {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => DisplayError;
  showErrorToast: (error: DisplayError, onRetry?: () => void | Promise<void>) => void;
  showOfflineToast: () => void;
  clearToast: () => void;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  showToast: true,
  hapticFeedback: true,
};

export function useErrorHandler(): ErrorHandlerResult {
  const isOffline = useNetworkStore(selectIsOffline);

  /**
   * Show error as toast notification
   */
  const showErrorToast = useCallback(
    (error: DisplayError, onRetry?: () => void | Promise<void>) => {
      const toastFn = error.severity === 'warning' ? toast.info : toast.error;

      toastFn(error.title, {
        description: error.message,
        duration: error.isRetryable ? 5000 : 4000,
        action:
          error.isRetryable && onRetry
            ? {
                label: 'Retry',
                onClick: () => onRetry(),
              }
            : undefined,
      });
    },
    []
  );

  /**
   * Show offline-specific toast
   */
  const showOfflineToast = useCallback(() => {
    const offlineError = createOfflineError();
    toast.info(offlineError.title, {
      description: offlineError.message,
      duration: 4000,
    });
  }, []);

  /**
   * Clear current toast
   */
  const clearToast = useCallback(() => {
    toast.dismiss();
  }, []);

  /**
   * Main error handler function
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}): DisplayError => {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      // Check if we're offline and this is a network error
      if (isOffline) {
        const offlineError = createOfflineError();

        if (mergedOptions.hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }

        if (mergedOptions.showToast) {
          showOfflineToast();
        }

        return offlineError;
      }

      // Transform error to display format
      const displayError = transformError(error);

      // Haptic feedback
      if (mergedOptions.hapticFeedback) {
        const feedbackType =
          displayError.severity === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning;
        Haptics.notificationAsync(feedbackType);
      }

      // Show toast
      if (mergedOptions.showToast) {
        showErrorToast(displayError, mergedOptions.onRetry);
      }

      return displayError;
    },
    [isOffline, showErrorToast, showOfflineToast]
  );

  return {
    handleError,
    showErrorToast,
    showOfflineToast,
    clearToast,
  };
}

/**
 * Simple error handler for use outside of React components
 * Note: Does not have access to network state or haptics
 */
export function handleErrorSimple(error: unknown): DisplayError {
  const displayError = transformError(error);

  const toastFn = displayError.severity === 'warning' ? toast.info : toast.error;
  toastFn(displayError.title, {
    description: displayError.message,
    duration: 4000,
  });

  return displayError;
}

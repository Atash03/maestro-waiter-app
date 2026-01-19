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
import ToastMessage from 'react-native-toast-message';
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
      const toastType = error.severity === 'warning' ? 'info' : 'error';

      ToastMessage.show({
        type: toastType,
        text1: error.title,
        text2: error.message,
        visibilityTime: error.isRetryable ? 5000 : 4000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          if (error.isRetryable && onRetry) {
            onRetry();
          }
          ToastMessage.hide();
        },
      });
    },
    []
  );

  /**
   * Show offline-specific toast
   */
  const showOfflineToast = useCallback(() => {
    const offlineError = createOfflineError();
    ToastMessage.show({
      type: 'info',
      text1: offlineError.title,
      text2: offlineError.message,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  }, []);

  /**
   * Clear current toast
   */
  const clearToast = useCallback(() => {
    ToastMessage.hide();
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

  ToastMessage.show({
    type: displayError.severity === 'warning' ? 'info' : 'error',
    text1: displayError.title,
    text2: displayError.message,
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });

  return displayError;
}

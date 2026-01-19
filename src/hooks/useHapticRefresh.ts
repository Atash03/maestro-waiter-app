/**
 * useHapticRefresh Hook
 *
 * A custom hook that wraps pull-to-refresh functionality with haptic feedback.
 * Provides a consistent refresh experience across the app.
 *
 * Features:
 * - Automatic haptic feedback when refresh is triggered
 * - Success/error feedback when refresh completes
 * - Tracks refreshing state
 */

import { useCallback, useState } from 'react';
import { haptics } from '../utils/haptics';

interface UseHapticRefreshOptions {
  /** Callback to execute on refresh */
  onRefresh: () => Promise<void>;
  /** Enable haptic feedback (default: true) */
  hapticEnabled?: boolean;
  /** Play success haptic on successful refresh (default: true) */
  successHaptic?: boolean;
  /** Play error haptic on failed refresh (default: true) */
  errorHaptic?: boolean;
}

interface UseHapticRefreshReturn {
  /** Whether the refresh is currently in progress */
  isRefreshing: boolean;
  /** Handler to pass to RefreshControl.onRefresh */
  handleRefresh: () => Promise<void>;
}

/**
 * Hook for pull-to-refresh with haptic feedback
 *
 * @example
 * ```tsx
 * const { isRefreshing, handleRefresh } = useHapticRefresh({
 *   onRefresh: async () => {
 *     await refetchData();
 *   },
 * });
 *
 * <RefreshControl
 *   refreshing={isRefreshing}
 *   onRefresh={handleRefresh}
 * />
 * ```
 */
export function useHapticRefresh({
  onRefresh,
  hapticEnabled = true,
  successHaptic = true,
  errorHaptic = true,
}: UseHapticRefreshOptions): UseHapticRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // Haptic feedback when pull-to-refresh triggers
    if (hapticEnabled) {
      haptics.pullToRefresh();
    }

    try {
      await onRefresh();

      // Success haptic feedback
      if (hapticEnabled && successHaptic) {
        haptics.success();
      }
    } catch {
      // Error haptic feedback
      if (hapticEnabled && errorHaptic) {
        haptics.error();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, hapticEnabled, successHaptic, errorHaptic]);

  return {
    isRefreshing,
    handleRefresh,
  };
}

export default useHapticRefresh;

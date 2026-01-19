/**
 * useNetworkStatus Hook - Easy access to network connectivity status
 *
 * Features:
 * - Check if device is online/offline
 * - Get connection type (wifi, cellular, etc.)
 * - Subscribe to network state changes
 */

import { useCallback } from 'react';
import {
  selectIsInternetReachable,
  selectIsOffline,
  useNetworkStore,
} from '../stores/networkStore';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isInitialized: boolean;
  checkConnection: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const isOffline = useNetworkStore(selectIsOffline);
  const isInternetReachable = useNetworkStore(selectIsInternetReachable);
  const connectionType = useNetworkStore((state) => state.connectionType);
  const isInitialized = useNetworkStore((state) => state.isInitialized);
  const checkConnectionFromStore = useNetworkStore((state) => state.checkConnection);

  const checkConnection = useCallback(async () => {
    await checkConnectionFromStore();
  }, [checkConnectionFromStore]);

  return {
    isOnline: !isOffline,
    isOffline,
    isInternetReachable,
    connectionType,
    isInitialized,
    checkConnection,
  };
}

/**
 * Hook to check if device is currently offline
 */
export function useIsOffline(): boolean {
  return useNetworkStore(selectIsOffline);
}

/**
 * Hook to check if device is currently online
 */
export function useIsOnline(): boolean {
  const isOffline = useNetworkStore(selectIsOffline);
  return !isOffline;
}

/**
 * Offline Support Hooks
 *
 * Provides hooks for managing offline data caching and sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearOfflineCache,
  getCacheStatus,
  loadExtrasFromCache,
  loadMenuCategoriesFromCache,
  loadMenuItemsFromCache,
  loadTablesFromCache,
  loadZonesFromCache,
  saveExtrasToCache,
  saveMenuCategoriesToCache,
  saveMenuItemsToCache,
  saveTablesToCache,
  saveZonesToCache,
} from '../services/offline/offlineStorage';
import {
  getSyncStatus,
  processOfflineQueue,
  retryFailedMutations,
  startSyncMonitoring,
  stopSyncMonitoring,
} from '../services/offline/syncManager';
import { useMenuStore } from '../stores/menuStore';
import { useNetworkStore } from '../stores/networkStore';
import {
  useIsQueueProcessing,
  useLastSyncAt,
  useOfflineQueueStore,
  useQueueCounts,
} from '../stores/offlineQueueStore';
import { useTableStore } from '../stores/tableStore';

/**
 * Hook to initialize offline support
 * Should be called once at app startup
 */
export function useOfflineInit(): { isInitialized: boolean } {
  const [isInitialized, setIsInitialized] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    async function initializeOfflineSupport() {
      try {
        // Initialize the offline queue
        await useOfflineQueueStore.getState().initialize();

        // Load cached data into stores
        const [categories, items, extras, tables, zones] = await Promise.all([
          loadMenuCategoriesFromCache(),
          loadMenuItemsFromCache(),
          loadExtrasFromCache(),
          loadTablesFromCache(),
          loadZonesFromCache(),
        ]);

        // Populate stores with cached data if available
        const menuStoreState = useMenuStore.getState();
        if (categories && categories.length > 0) {
          menuStoreState.setCategories(categories);
        }
        if (items && items.length > 0) {
          menuStoreState.setItems(items);
        }
        if (extras && extras.length > 0) {
          menuStoreState.setExtras(extras);
        }
        if (tables && tables.length > 0) {
          useTableStore.setState({ tables });
        }
        if (zones && zones.length > 0) {
          useTableStore.setState({ zones });
        }

        // Start network monitoring for auto-sync
        startSyncMonitoring();

        // If online, process any pending queue items
        const networkState = useNetworkStore.getState();
        if (networkState.isConnected) {
          processOfflineQueue().catch(() => {
            // Silently ignore
          });
        }

        setIsInitialized(true);
      } catch {
        // Still mark as initialized to not block the app
        setIsInitialized(true);
      }
    }

    initializeOfflineSupport();

    return () => {
      stopSyncMonitoring();
    };
  }, []);

  return { isInitialized };
}

/**
 * Hook to save data to offline cache when it changes
 */
export function useOfflineCacheSync(): void {
  const categories = useMenuStore((state) => state.categories);
  const items = useMenuStore((state) => state.items);
  const extras = useMenuStore((state) => state.extras);
  const tables = useTableStore((state) => state.tables);
  const zones = useTableStore((state) => state.zones);

  // Save categories to cache when they change
  useEffect(() => {
    if (categories.length > 0) {
      saveMenuCategoriesToCache(categories);
    }
  }, [categories]);

  // Save items to cache when they change
  useEffect(() => {
    if (items.length > 0) {
      saveMenuItemsToCache(items);
    }
  }, [items]);

  // Save extras to cache when they change
  useEffect(() => {
    if (extras.length > 0) {
      saveExtrasToCache(extras);
    }
  }, [extras]);

  // Save tables to cache when they change
  useEffect(() => {
    if (tables.length > 0) {
      saveTablesToCache(tables);
    }
  }, [tables]);

  // Save zones to cache when they change
  useEffect(() => {
    if (zones.length > 0) {
      saveZonesToCache(zones);
    }
  }, [zones]);
}

/**
 * Hook to get offline status and sync info
 */
export function useOfflineStatus() {
  const isConnected = useNetworkStore((state) => state.isConnected);
  const isInternetReachable = useNetworkStore((state) => state.isInternetReachable);
  const queueCounts = useQueueCounts();
  const isProcessing = useIsQueueProcessing();
  const lastSyncAt = useLastSyncAt();

  const isOffline = isConnected === false || isInternetReachable === false;

  return {
    isOffline,
    isOnline: !isOffline,
    hasPendingMutations: queueCounts.pending > 0,
    hasFailedMutations: queueCounts.failed > 0,
    pendingCount: queueCounts.pending,
    failedCount: queueCounts.failed,
    totalQueued: queueCounts.total,
    isSyncing: isProcessing,
    lastSyncAt,
  };
}

/**
 * Hook to get cache status
 */
export function useCacheStatus() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getCacheStatus>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const cacheStatus = await getCacheStatus();
      setStatus(cacheStatus);
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}

/**
 * Hook for manual sync control
 */
export function useSyncControl() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await processOfflineQueue();
      setLastResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const retryFailed = useCallback(async () => {
    setIsSyncing(true);
    try {
      await retryFailedMutations();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    await clearOfflineCache();
  }, []);

  const clearQueue = useCallback(() => {
    useOfflineQueueStore.getState().clearQueue();
  }, []);

  return {
    sync,
    retryFailed,
    clearCache,
    clearQueue,
    isSyncing,
    lastResult,
    getSyncStatus,
  };
}

/**
 * Hook to check if a specific feature should be disabled while offline
 */
export function useOfflineGuard() {
  const { isOffline, hasPendingMutations } = useOfflineStatus();

  return {
    isOffline,
    hasPendingMutations,
    /**
     * Returns true if the action should be blocked
     * Use for mutations that cannot be queued (e.g., payment processing)
     */
    shouldBlockAction: isOffline,
    /**
     * Returns a message to show the user
     */
    offlineMessage: isOffline
      ? 'You are currently offline. This action requires an internet connection.'
      : hasPendingMutations
        ? 'Some changes are still being synced. Please wait.'
        : null,
  };
}

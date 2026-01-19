/**
 * Offline Queue Store
 *
 * Manages a queue of mutations that were attempted while offline.
 * Persists queue to AsyncStorage and processes when back online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

/** Storage key for the offline queue */
const OFFLINE_QUEUE_STORAGE_KEY = '@maestro_offline_queue';

/** Types of mutations that can be queued */
export type MutationType =
  | 'CREATE_ORDER'
  | 'ADD_ORDER_ITEMS'
  | 'UPDATE_ORDER_ITEM_STATUS'
  | 'ACKNOWLEDGE_CALL'
  | 'COMPLETE_CALL'
  | 'CANCEL_CALL'
  | 'CREATE_BILL'
  | 'CREATE_PAYMENT';

/** Status of a queued mutation */
export type QueueItemStatus = 'pending' | 'processing' | 'failed' | 'completed';

/** A queued mutation item */
export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: unknown;
  status: QueueItemStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

/** Offline queue state */
export interface OfflineQueueState {
  queue: QueuedMutation[];
  isProcessing: boolean;
  isInitialized: boolean;
  lastSyncAt: number | null;
}

/** Offline queue store interface */
interface OfflineQueueStore extends OfflineQueueState {
  initialize: () => Promise<void>;
  addToQueue: (type: MutationType, payload: unknown) => string;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<QueuedMutation>) => void;
  markAsProcessing: (id: string) => void;
  markAsFailed: (id: string, error: string) => void;
  markAsCompleted: (id: string) => void;
  getNextPendingItem: () => QueuedMutation | undefined;
  getPendingCount: () => number;
  getFailedCount: () => number;
  setIsProcessing: (isProcessing: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  clearQueue: () => void;
  clearCompletedItems: () => void;
  persistQueue: () => Promise<void>;
}

/**
 * Generate a unique ID for queue items
 */
function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Offline Queue Store
 */
export const useOfflineQueueStore = create<OfflineQueueStore>((set, get) => ({
  queue: [],
  isProcessing: false,
  isInitialized: false,
  lastSyncAt: null,

  /**
   * Initialize the store by loading persisted queue from storage
   */
  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out completed items on load
          const pendingItems = parsed.filter((item: QueuedMutation) => item.status !== 'completed');
          set({ queue: pendingItems, isInitialized: true });
          return;
        }
      }
    } catch {
      // Silently ignore storage errors
    }
    set({ isInitialized: true });
  },

  /**
   * Add a mutation to the queue
   */
  addToQueue: (type: MutationType, payload: unknown) => {
    const id = generateQueueId();
    const item: QueuedMutation = {
      id,
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    set((state) => ({
      queue: [...state.queue, item],
    }));

    // Persist asynchronously
    get().persistQueue();

    return id;
  },

  /**
   * Remove an item from the queue
   */
  removeFromQueue: (id: string) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    }));
    get().persistQueue();
  },

  /**
   * Update a queue item
   */
  updateQueueItem: (id: string, updates: Partial<QueuedMutation>) => {
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    get().persistQueue();
  },

  /**
   * Mark an item as processing
   */
  markAsProcessing: (id: string) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'processing' as QueueItemStatus,
              lastAttemptAt: Date.now(),
            }
          : item
      ),
    }));
    get().persistQueue();
  },

  /**
   * Mark an item as failed
   */
  markAsFailed: (id: string, error: string) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'failed' as QueueItemStatus,
              error,
              retryCount: item.retryCount + 1,
            }
          : item
      ),
    }));
    get().persistQueue();
  },

  /**
   * Mark an item as completed
   */
  markAsCompleted: (id: string) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'completed' as QueueItemStatus,
              error: undefined,
            }
          : item
      ),
    }));
    get().persistQueue();
  },

  /**
   * Get the next pending item to process
   */
  getNextPendingItem: () => {
    const { queue } = get();
    return queue.find(
      (item) =>
        (item.status === 'pending' || item.status === 'failed') && item.retryCount < item.maxRetries
    );
  },

  /**
   * Get count of pending items
   */
  getPendingCount: () => {
    const { queue } = get();
    return queue.filter((item) => item.status === 'pending' || item.status === 'processing').length;
  },

  /**
   * Get count of failed items
   */
  getFailedCount: () => {
    const { queue } = get();
    return queue.filter((item) => item.status === 'failed' && item.retryCount >= item.maxRetries)
      .length;
  },

  /**
   * Set processing state
   */
  setIsProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  /**
   * Set last sync timestamp
   */
  setLastSyncAt: (timestamp: number) => {
    set({ lastSyncAt: timestamp });
  },

  /**
   * Clear the entire queue
   */
  clearQueue: () => {
    set({ queue: [] });
    AsyncStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY).catch(() => {
      // Silently ignore
    });
  },

  /**
   * Clear only completed items from the queue
   */
  clearCompletedItems: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== 'completed'),
    }));
    get().persistQueue();
  },

  /**
   * Persist queue to AsyncStorage
   */
  persistQueue: async () => {
    try {
      const { queue } = get();
      await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Silently ignore storage errors
    }
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to get the offline queue
 */
export const useOfflineQueue = () => useOfflineQueueStore((state) => state.queue);

/**
 * Hook to get pending items
 */
export const usePendingQueueItems = () =>
  useOfflineQueueStore((state) =>
    state.queue.filter((item) => item.status === 'pending' || item.status === 'processing')
  );

/**
 * Hook to get failed items
 */
export const useFailedQueueItems = () =>
  useOfflineQueueStore((state) =>
    state.queue.filter((item) => item.status === 'failed' && item.retryCount >= item.maxRetries)
  );

/**
 * Hook to get queue counts
 */
export const useQueueCounts = () =>
  useOfflineQueueStore(
    useShallow((state) => ({
      pending: state.queue.filter((item) => item.status === 'pending' || item.status === 'processing')
        .length,
      failed: state.queue.filter(
        (item) => item.status === 'failed' && item.retryCount >= item.maxRetries
      ).length,
      total: state.queue.length,
    }))
  );

/**
 * Hook to check if queue is processing
 */
export const useIsQueueProcessing = () => useOfflineQueueStore((state) => state.isProcessing);

/**
 * Hook to get last sync timestamp
 */
export const useLastSyncAt = () => useOfflineQueueStore((state) => state.lastSyncAt);

/**
 * Hook to check if queue is initialized
 */
export const useIsQueueInitialized = () => useOfflineQueueStore((state) => state.isInitialized);

/**
 * Sync Manager Service
 *
 * Coordinates syncing of offline queued mutations when back online.
 * Monitors network status and processes the queue automatically.
 */

import { useNetworkStore } from '../../stores/networkStore';
import type { MutationType, QueuedMutation } from '../../stores/offlineQueueStore';
import { useOfflineQueueStore } from '../../stores/offlineQueueStore';
import type { BatchCreateOrderItemsRequest, CreateOrderRequest } from '../../types/api';
import type { OrderItemStatus } from '../../types/enums';
import { createBill } from '../api/bills';
import { batchCreateOrderItems, batchUpdateOrderItemStatus } from '../api/orderItems';
import { createOrder } from '../api/orders';
import { createPayment } from '../api/payments';
import { acknowledgeWaiterCall, cancelWaiterCall, completeWaiterCall } from '../api/waiterCalls';

/** Delay between processing queue items (ms) */
const PROCESS_DELAY = 500;

/** Delay after failure before next attempt (ms) */
const RETRY_DELAY = 2000;

/** Flag to track if sync is in progress */
let isSyncing = false;

/** Subscription cleanup function */
let networkSubscriptionCleanup: (() => void) | null = null;

/**
 * Process a single queued mutation
 */
async function processQueueItem(item: QueuedMutation): Promise<void> {
  const { type, payload } = item;

  switch (type) {
    case 'CREATE_ORDER': {
      const orderPayload = payload as CreateOrderRequest;
      await createOrder(orderPayload);
      break;
    }
    case 'ADD_ORDER_ITEMS': {
      const itemsPayload = payload as BatchCreateOrderItemsRequest;
      await batchCreateOrderItems(itemsPayload);
      break;
    }
    case 'UPDATE_ORDER_ITEM_STATUS': {
      const statusPayload = payload as {
        ids: string[];
        status: OrderItemStatus;
        reason?: string;
      };
      await batchUpdateOrderItemStatus({
        ids: statusPayload.ids,
        status: statusPayload.status,
        ...(statusPayload.reason && { reason: statusPayload.reason }),
      });
      break;
    }
    case 'ACKNOWLEDGE_CALL': {
      const { callId } = payload as { callId: string };
      await acknowledgeWaiterCall(callId);
      break;
    }
    case 'COMPLETE_CALL': {
      const { callId } = payload as { callId: string };
      await completeWaiterCall(callId);
      break;
    }
    case 'CANCEL_CALL': {
      const { callId } = payload as { callId: string };
      await cancelWaiterCall(callId);
      break;
    }
    case 'CREATE_BILL': {
      const billPayload = payload as Parameters<typeof createBill>[0];
      await createBill(billPayload);
      break;
    }
    case 'CREATE_PAYMENT': {
      const paymentPayload = payload as Parameters<typeof createPayment>[0];
      await createPayment(paymentPayload);
      break;
    }
    default: {
      // Unknown mutation type - skip silently
    }
  }
}

/**
 * Process the offline queue
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  if (isSyncing) {
    return { processed: 0, failed: 0 };
  }

  const store = useOfflineQueueStore.getState();
  const networkStore = useNetworkStore.getState();

  // Don't process if offline
  if (!networkStore.isConnected || networkStore.isInternetReachable === false) {
    return { processed: 0, failed: 0 };
  }

  isSyncing = true;
  store.setIsProcessing(true);

  let processed = 0;
  let failed = 0;

  try {
    let nextItem = store.getNextPendingItem();

    while (nextItem) {
      // Check network status before each item
      const currentNetworkState = useNetworkStore.getState();
      if (!currentNetworkState.isConnected) {
        break;
      }

      store.markAsProcessing(nextItem.id);

      try {
        await processQueueItem(nextItem);
        store.markAsCompleted(nextItem.id);
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        store.markAsFailed(nextItem.id, errorMessage);

        // Check if we should retry
        const currentItemId = nextItem.id;
        const updatedItem = store.queue.find((item) => item.id === currentItemId);
        if (updatedItem && updatedItem.retryCount >= updatedItem.maxRetries) {
          failed++;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }

      // Small delay between items to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, PROCESS_DELAY));

      // Get next item
      nextItem = useOfflineQueueStore.getState().getNextPendingItem();
    }
  } finally {
    isSyncing = false;
    store.setIsProcessing(false);
    store.setLastSyncAt(Date.now());
    store.clearCompletedItems();
  }

  return { processed, failed };
}

/**
 * Start monitoring network status and auto-sync when online
 */
export function startSyncMonitoring(): void {
  // Clean up any existing subscription
  if (networkSubscriptionCleanup) {
    networkSubscriptionCleanup();
  }

  // Subscribe to network store changes
  networkSubscriptionCleanup = useNetworkStore.subscribe((state, prevState) => {
    // If we just came online, process the queue
    if (!prevState.isConnected && state.isConnected && state.isInternetReachable !== false) {
      processOfflineQueue().catch(() => {
        // Silently ignore sync errors on reconnect
      });
    }
  });
}

/**
 * Stop monitoring network status
 */
export function stopSyncMonitoring(): void {
  if (networkSubscriptionCleanup) {
    networkSubscriptionCleanup();
    networkSubscriptionCleanup = null;
  }
}

/**
 * Queue a mutation for offline processing
 * If online, executes immediately. If offline, adds to queue.
 */
export async function queueOrExecuteMutation<T>(
  type: MutationType,
  payload: unknown,
  executeFn: () => Promise<T>
): Promise<{ queued: boolean; result?: T; queueId?: string }> {
  const networkStore = useNetworkStore.getState();
  const queueStore = useOfflineQueueStore.getState();

  // If online, try to execute immediately
  if (networkStore.isConnected && networkStore.isInternetReachable !== false) {
    try {
      const result = await executeFn();
      return { queued: false, result };
    } catch (error) {
      // If it's a network error, queue it
      if (isNetworkError(error)) {
        const queueId = queueStore.addToQueue(type, payload);
        return { queued: true, queueId };
      }
      // Re-throw non-network errors
      throw error;
    }
  }

  // If offline, add to queue
  const queueId = queueStore.addToQueue(type, payload);
  return { queued: true, queueId };
}

/**
 * Check if an error is a network-related error
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }
  return false;
}

/**
 * Get sync status
 */
export function getSyncStatus(): {
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: number | null;
} {
  const store = useOfflineQueueStore.getState();
  return {
    isSyncing: store.isProcessing,
    pendingCount: store.getPendingCount(),
    failedCount: store.getFailedCount(),
    lastSyncAt: store.lastSyncAt,
  };
}

/**
 * Retry all failed mutations
 */
export async function retryFailedMutations(): Promise<void> {
  const store = useOfflineQueueStore.getState();

  // Reset retry count for failed items
  store.queue
    .filter((item) => item.status === 'failed' && item.retryCount >= item.maxRetries)
    .forEach((item) => {
      store.updateQueueItem(item.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined,
      });
    });

  // Process the queue
  await processOfflineQueue();
}

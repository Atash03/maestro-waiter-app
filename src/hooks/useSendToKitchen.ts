/**
 * Send to Kitchen Hook
 *
 * Custom hook for handling the "Send to Kitchen" flow:
 * - Creates order via POST /order (if new)
 * - Adds order items via POST /order-item/batch
 * - Updates item status to SentToPrepare via PATCH /order-item/batch/status
 * - Handles errors with retry capability
 * - Provides loading and success states
 */

import { useCallback, useState } from 'react';
import { batchCreateOrderItems, batchUpdateOrderItemStatus } from '../services/api/orderItems';
import { createOrder } from '../services/api/orders';
import type { LocalOrderItem } from '../stores/orderStore';
import type {
  BatchCreateOrderItemsRequest,
  CreateOrderRequest,
  OrderItemExtraInput,
} from '../types/api';
import { OrderItemStatus, OrderType } from '../types/enums';
import type { Order, OrderItem } from '../types/models';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of the send to kitchen operation
 */
export interface SendToKitchenResult {
  success: boolean;
  order?: Order;
  orderItems?: OrderItem[];
  error?: string;
}

/**
 * Send to kitchen hook state
 */
export interface UseSendToKitchenState {
  isSending: boolean;
  isSuccess: boolean;
  error: string | null;
  lastSentOrderId: string | null;
}

/**
 * Send to kitchen hook return type
 */
export interface UseSendToKitchenReturn extends UseSendToKitchenState {
  sendToKitchen: (
    tableId: string,
    items: LocalOrderItem[],
    orderNotes?: string,
    existingOrderId?: string
  ) => Promise<SendToKitchenResult>;
  retry: () => Promise<SendToKitchenResult | null>;
  reset: () => void;
  clearError: () => void;
}

/**
 * Retry context for retry functionality
 */
interface RetryContext {
  tableId: string;
  items: LocalOrderItem[];
  orderNotes?: string;
  existingOrderId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert LocalOrderItem extras to API format
 */
export function convertExtrasToApiFormat(extras: LocalOrderItem['extras']): OrderItemExtraInput[] {
  return extras.map((extra) => ({
    extraId: extra.extraId,
    quantity: extra.quantity,
  }));
}

/**
 * Prepare batch create items request from local order items
 */
export function prepareBatchItemsRequest(
  orderId: string,
  items: LocalOrderItem[]
): BatchCreateOrderItemsRequest {
  return {
    orderId,
    items: items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      notes: item.notes || undefined,
      extras: item.extras.length > 0 ? convertExtrasToApiFormat(item.extras) : undefined,
    })),
  };
}

/**
 * Get user-friendly error message from error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('Network') || error.message.includes('network')) {
      return 'Unable to connect to server. Please check your connection and try again.';
    }
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'Request timed out. Please try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook for handling the "Send to Kitchen" flow
 */
export function useSendToKitchen(): UseSendToKitchenReturn {
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentOrderId, setLastSentOrderId] = useState<string | null>(null);
  const [retryContext, setRetryContext] = useState<RetryContext | null>(null);

  /**
   * Send items to kitchen
   *
   * Flow:
   * 1. Create order if no existingOrderId (POST /order)
   * 2. Add items to order (POST /order-item/batch)
   * 3. Update item status to SentToPrepare (PATCH /order-item/batch/status)
   */
  const sendToKitchen = useCallback(
    async (
      tableId: string,
      items: LocalOrderItem[],
      orderNotes?: string,
      existingOrderId?: string
    ): Promise<SendToKitchenResult> => {
      // Validate inputs
      if (items.length === 0) {
        return { success: false, error: 'No items to send' };
      }

      // Store context for retry
      setRetryContext({ tableId, items, orderNotes, existingOrderId });

      // Reset states
      setIsSending(true);
      setIsSuccess(false);
      setError(null);

      try {
        let orderId = existingOrderId;
        let order: Order | undefined;

        // Step 1: Create order if new
        if (!orderId) {
          const createOrderRequest: CreateOrderRequest = {
            orderType: OrderType.DINE_IN,
            tableId: tableId || undefined,
            notes: orderNotes || undefined,
          };

          order = await createOrder(createOrderRequest);
          orderId = order.id;
        }

        // Step 2: Add items to order (batch)
        const batchRequest = prepareBatchItemsRequest(orderId, items);
        const createdItems = await batchCreateOrderItems(batchRequest);

        // Step 3: Update status to SentToPrepare
        const itemIds = createdItems.map((item) => item.id);
        const updatedItems = await batchUpdateOrderItemStatus({
          ids: itemIds,
          status: OrderItemStatus.SENT_TO_PREPARE,
        });

        // Success!
        setIsSuccess(true);
        setLastSentOrderId(orderId);
        setRetryContext(null);

        return {
          success: true,
          order,
          orderItems: updatedItems,
        };
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (): Promise<SendToKitchenResult | null> => {
    if (!retryContext) {
      return null;
    }

    return sendToKitchen(
      retryContext.tableId,
      retryContext.items,
      retryContext.orderNotes,
      retryContext.existingOrderId
    );
  }, [retryContext, sendToKitchen]);

  /**
   * Reset all states
   */
  const reset = useCallback(() => {
    setIsSending(false);
    setIsSuccess(false);
    setError(null);
    setLastSentOrderId(null);
    setRetryContext(null);
  }, []);

  /**
   * Clear error state only
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSending,
    isSuccess,
    error,
    lastSentOrderId,
    sendToKitchen,
    retry,
    reset,
    clearError,
  };
}

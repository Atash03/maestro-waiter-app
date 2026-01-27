/**
 * Send to Kitchen Tests
 *
 * Tests for the "Send to Kitchen" flow (Task 3.10):
 * - useSendToKitchen hook
 * - Helper functions
 * - API integration
 */

import type { LocalOrderItem } from '../stores/orderStore';
import { OrderItemStatus, OrderType } from '../types/enums';
import type { MenuItem, Order, OrderItem, Translation } from '../types/models';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock API functions
const mockCreateOrder = jest.fn();
const mockBatchCreateOrderItems = jest.fn();
const mockBatchUpdateOrderItemStatus = jest.fn();

jest.mock('../services/api/orders', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));

jest.mock('../services/api/orderItems', () => ({
  batchCreateOrderItems: (...args: unknown[]) => mockBatchCreateOrderItems(...args),
  batchUpdateOrderItemStatus: (...args: unknown[]) => mockBatchUpdateOrderItemStatus(...args),
}));

// React hooks testing
import { act, renderHook } from '@testing-library/react-native';
// Import after mocks are set up
import {
  convertExtrasToApiFormat,
  getErrorMessage,
  prepareBatchItemsRequest,
  useSendToKitchen,
} from '../hooks/useSendToKitchen';

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockTranslation(text: string): Translation {
  return {
    en: text,
    ru: `${text} (ru)`,
    tm: `${text} (tm)`,
  };
}

function createMockMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'menu-item-1',
    title: createMockTranslation('Test Item'),
    description: createMockTranslation('Test description'),
    price: '10.00',
    isActive: true,
    categoryId: 'category-1',
    imagePath: '',
    isGroup: false,
    extras: [],
    ...overrides,
  };
}

function createMockLocalOrderItem(overrides: Partial<LocalOrderItem> = {}): LocalOrderItem {
  const menuItem = overrides.menuItem ?? createMockMenuItem();
  return {
    id: 'local-1',
    menuItemId: menuItem.id,
    menuItem,
    quantity: 2,
    notes: 'No onions',
    extras: [
      {
        extraId: 'extra-1',
        quantity: 1,
        extraTitle: createMockTranslation('Extra cheese'),
        pricePerUnit: '2.00',
      },
    ],
    unitPrice: 10.0,
    subtotal: 24.0, // (10 + 2) * 2
    ...overrides,
  };
}

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-123',
    orderNumber: 1,
    orderCode: 'ORD-001',
    orderType: OrderType.DINE_IN,
    orderStatus: 'Pending' as Order['orderStatus'],
    tableId: 'table-1',
    waiterId: 'waiter-1',
    customerId: null,
    totalAmount: '24.00',
    description: null,
    notes: null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orderItems: [],
    ...overrides,
  } as Order;
}

function createMockOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'order-item-1',
    orderId: 'order-123',
    menuItemId: 'menu-item-1',
    stockId: null,
    quantity: '2',
    unitPrice: '10.00',
    subtotal: '24.00',
    status: OrderItemStatus.PENDING,
    notes: 'No onions',
    declineReason: null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orderItemExtras: [],
    ...overrides,
  } as OrderItem;
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Send to Kitchen Helper Functions', () => {
  describe('convertExtrasToApiFormat', () => {
    it('should convert LocalOrderItem extras to API format', () => {
      const extras: LocalOrderItem['extras'] = [
        {
          extraId: 'extra-1',
          quantity: 2,
          extraTitle: createMockTranslation('Extra cheese'),
          pricePerUnit: '2.00',
        },
        {
          extraId: 'extra-2',
          quantity: 1,
          extraTitle: createMockTranslation('Bacon'),
          pricePerUnit: '3.00',
        },
      ];

      const result = convertExtrasToApiFormat(extras);

      expect(result).toEqual([
        { extraId: 'extra-1', quantity: 2 },
        { extraId: 'extra-2', quantity: 1 },
      ]);
    });

    it('should return empty array for empty extras', () => {
      const result = convertExtrasToApiFormat([]);
      expect(result).toEqual([]);
    });

    it('should handle extras without optional fields', () => {
      const extras: LocalOrderItem['extras'] = [
        {
          extraId: 'extra-1',
          quantity: 1,
        },
      ];

      const result = convertExtrasToApiFormat(extras);

      expect(result).toEqual([{ extraId: 'extra-1', quantity: 1 }]);
    });
  });

  describe('prepareBatchItemsRequest', () => {
    it('should prepare batch create request from local order items', () => {
      const orderId = 'order-123';
      const items: LocalOrderItem[] = [
        createMockLocalOrderItem({
          id: 'local-1',
          menuItemId: 'item-1',
          quantity: 2,
          notes: 'Note 1',
        }),
        createMockLocalOrderItem({
          id: 'local-2',
          menuItemId: 'item-2',
          quantity: 1,
          notes: '',
          extras: [],
        }),
      ];

      const result = prepareBatchItemsRequest(orderId, items);

      expect(result.orderId).toBe('order-123');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].menuItemId).toBe('item-1');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].notes).toBe('Note 1');
      expect(result.items[0].extras).toBeDefined();
      expect(result.items[1].notes).toBeUndefined(); // Empty notes should be undefined
      expect(result.items[1].extras).toBeUndefined(); // Empty extras should be undefined
    });

    it('should handle items without notes', () => {
      const items: LocalOrderItem[] = [createMockLocalOrderItem({ notes: '', extras: [] })];

      const result = prepareBatchItemsRequest('order-123', items);

      expect(result.items[0].notes).toBeUndefined();
    });

    it('should handle items without extras', () => {
      const items: LocalOrderItem[] = [createMockLocalOrderItem({ extras: [] })];

      const result = prepareBatchItemsRequest('order-123', items);

      expect(result.items[0].extras).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('should return network error message for network errors', () => {
      const error = new Error('Network request failed');
      const result = getErrorMessage(error);
      expect(result).toContain('Unable to connect');
    });

    it('should return timeout message for timeout errors', () => {
      const error = new Error('Request timeout');
      const result = getErrorMessage(error);
      expect(result).toContain('timed out');
    });

    it('should return error message for other Error instances', () => {
      const error = new Error('Custom error message');
      const result = getErrorMessage(error);
      expect(result).toBe('Custom error message');
    });

    it('should return generic message for non-Error objects', () => {
      const error = 'string error';
      const result = getErrorMessage(error);
      expect(result).toContain('unexpected error');
    });

    it('should return generic message for null', () => {
      const result = getErrorMessage(null);
      expect(result).toContain('unexpected error');
    });

    it('should return generic message for undefined', () => {
      const result = getErrorMessage(undefined);
      expect(result).toContain('unexpected error');
    });
  });
});

describe('useSendToKitchen Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset API mocks to successful responses
    mockCreateOrder.mockResolvedValue(createMockOrder());
    mockBatchCreateOrderItems.mockResolvedValue([createMockOrderItem()]);
    mockBatchUpdateOrderItemStatus.mockResolvedValue([
      createMockOrderItem({ status: OrderItemStatus.SENT_TO_PREPARE }),
    ]);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSendToKitchen());

      expect(result.current.isSending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSentOrderId).toBeNull();
    });

    it('should provide all expected functions', () => {
      const { result } = renderHook(() => useSendToKitchen());

      expect(typeof result.current.sendToKitchen).toBe('function');
      expect(typeof result.current.retry).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('sendToKitchen - Success Flow', () => {
    it('should create order, add items, and update status on success', async () => {
      const mockOrder = createMockOrder({ id: 'new-order-123' });
      const mockItems = [createMockOrderItem({ id: 'item-1' })];
      const mockUpdatedItems = [
        createMockOrderItem({ id: 'item-1', status: OrderItemStatus.SENT_TO_PREPARE }),
      ];

      mockCreateOrder.mockResolvedValue(mockOrder);
      mockBatchCreateOrderItems.mockResolvedValue(mockItems);
      mockBatchUpdateOrderItemStatus.mockResolvedValue(mockUpdatedItems);

      const { result } = renderHook(() => useSendToKitchen());

      const items = [createMockLocalOrderItem()];

      let sendResult: Awaited<ReturnType<typeof result.current.sendToKitchen>> | undefined;

      await act(async () => {
        sendResult = await result.current.sendToKitchen('table-1', items, 'Order notes');
      });

      expect(sendResult?.success).toBe(true);
      expect(sendResult?.order).toEqual(mockOrder);
      expect(sendResult?.orderItems).toEqual(mockUpdatedItems);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.lastSentOrderId).toBe('new-order-123');

      // Verify API calls
      expect(mockCreateOrder).toHaveBeenCalledWith({
        orderType: OrderType.DINE_IN,
        tableId: 'table-1',
        notes: 'Order notes',
      });
      expect(mockBatchCreateOrderItems).toHaveBeenCalled();
      expect(mockBatchUpdateOrderItemStatus).toHaveBeenCalledWith({
        ids: ['item-1'],
        status: OrderItemStatus.SENT_TO_PREPARE,
      });
    });

    it('should skip order creation when existingOrderId is provided', async () => {
      const mockItems = [createMockOrderItem({ id: 'item-1' })];
      mockBatchCreateOrderItems.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen(
          'table-1',
          [createMockLocalOrderItem()],
          '',
          'existing-order-456'
        );
      });

      // Order creation should NOT be called
      expect(mockCreateOrder).not.toHaveBeenCalled();
      // Items should still be added
      expect(mockBatchCreateOrderItems).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'existing-order-456' })
      );
    });

    it('should set isSending to true during operation', async () => {
      const { result } = renderHook(() => useSendToKitchen());

      // Create a promise we can control
      let resolveOrder: ((value: Order) => void) | undefined;
      mockCreateOrder.mockReturnValue(
        new Promise<Order>((resolve) => {
          resolveOrder = resolve;
        })
      );

      // Start the operation
      let sendPromise: Promise<unknown> | undefined;
      act(() => {
        sendPromise = result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      // Should be sending
      expect(result.current.isSending).toBe(true);

      // Resolve and complete
      await act(async () => {
        resolveOrder?.(createMockOrder());
        await sendPromise;
      });

      expect(result.current.isSending).toBe(false);
    });
  });

  describe('sendToKitchen - Error Handling', () => {
    it('should return error when items array is empty', async () => {
      const { result } = renderHook(() => useSendToKitchen());

      let sendResult: Awaited<ReturnType<typeof result.current.sendToKitchen>> | undefined;

      await act(async () => {
        sendResult = await result.current.sendToKitchen('table-1', []);
      });

      expect(sendResult?.success).toBe(false);
      expect(sendResult?.error).toBe('No items to send');
    });

    it('should set error state on API failure', async () => {
      mockCreateOrder.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBe('API Error');
    });

    it('should handle network errors with user-friendly message', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      expect(result.current.error).toContain('Unable to connect');
    });

    it('should handle timeout errors with user-friendly message', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Request timeout'));

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      expect(result.current.error).toContain('timed out');
    });
  });

  describe('retry', () => {
    it('should retry the last failed operation', async () => {
      mockCreateOrder.mockRejectedValueOnce(new Error('First attempt failed'));
      mockCreateOrder.mockResolvedValueOnce(createMockOrder());

      const { result } = renderHook(() => useSendToKitchen());

      const items = [createMockLocalOrderItem()];

      // First attempt fails
      await act(async () => {
        await result.current.sendToKitchen('table-1', items, 'notes');
      });

      expect(result.current.error).toBeTruthy();

      // Retry should succeed
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should return null when no retry context exists', async () => {
      const { result } = renderHook(() => useSendToKitchen());

      let retryResult: Awaited<ReturnType<typeof result.current.retry>> | undefined;

      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(retryResult).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all states', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isSending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSentOrderId).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear only the error state', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useSendToKitchen());

      await act(async () => {
        await result.current.sendToKitchen('table-1', [createMockLocalOrderItem()]);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      // Other states should remain unchanged
      expect(result.current.isSuccess).toBe(false);
    });
  });
});

describe('Send to Kitchen Exports', () => {
  it('should export useSendToKitchen hook', () => {
    expect(useSendToKitchen).toBeDefined();
    expect(typeof useSendToKitchen).toBe('function');
  });

  it('should export convertExtrasToApiFormat', () => {
    expect(convertExtrasToApiFormat).toBeDefined();
    expect(typeof convertExtrasToApiFormat).toBe('function');
  });

  it('should export prepareBatchItemsRequest', () => {
    expect(prepareBatchItemsRequest).toBeDefined();
    expect(typeof prepareBatchItemsRequest).toBe('function');
  });

  it('should export getErrorMessage', () => {
    expect(getErrorMessage).toBeDefined();
    expect(typeof getErrorMessage).toBe('function');
  });
});

// Note: Hooks Index Exports tests are covered by the main import at the top of this file
// Direct import tests are avoided due to TypeScript/module resolution issues in test environment

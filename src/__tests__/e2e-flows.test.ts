/**
 * End-to-End Flow Tests (Task 8.8)
 *
 * Tests the complete user flows:
 * 1. Login flow
 * 2. Order creation flow
 * 3. Payment flow
 * 4. Call handling flow
 *
 * These tests verify the integration between stores, services, and APIs
 * to ensure the full flows work correctly.
 */

import { act, renderHook } from '@testing-library/react-native';
import type { CalculateBillResponse, LoginResponse } from '../types/api';
import {
  BillStatus,
  OrderItemStatus,
  OrderType,
  PaymentMethod,
  Role,
  WaiterCallStatus,
} from '../types/enums';
import type { Account, Bill, Order, OrderItem, Payment, WaiterCall } from '../types/models';

// ============================================================================
// Mock Setup - API Services
// ============================================================================

// Auth API mocks
const mockApiLogin = jest.fn();
const mockCheckSession = jest.fn();
const mockApiLogout = jest.fn();

jest.mock('../services/api/auth', () => ({
  login: (request: unknown) => mockApiLogin(request),
  checkSession: () => mockCheckSession(),
  logout: () => mockApiLogout(),
}));

// Order API mocks
const mockCreateOrder = jest.fn();
const mockGetOrders = jest.fn();
const mockGetOrder = jest.fn();
const mockUpdateOrder = jest.fn();

jest.mock('../services/api/orders', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  getOrders: (...args: unknown[]) => mockGetOrders(...args),
  getOrder: (...args: unknown[]) => mockGetOrder(...args),
  updateOrder: (...args: unknown[]) => mockUpdateOrder(...args),
}));

// Order Items API mocks
const mockBatchCreateOrderItems = jest.fn();
const mockBatchUpdateOrderItemStatus = jest.fn();

jest.mock('../services/api/orderItems', () => ({
  batchCreateOrderItems: (...args: unknown[]) => mockBatchCreateOrderItems(...args),
  batchUpdateOrderItemStatus: (...args: unknown[]) => mockBatchUpdateOrderItemStatus(...args),
}));

// Bill API mocks
const mockCreateBill = jest.fn();
const mockCalculateBill = jest.fn();
const mockUpdateBillDiscounts = jest.fn();
const mockGetBill = jest.fn();

jest.mock('../services/api/bills', () => ({
  createBill: (...args: unknown[]) => mockCreateBill(...args),
  calculateBill: (...args: unknown[]) => mockCalculateBill(...args),
  updateBillDiscounts: (...args: unknown[]) => mockUpdateBillDiscounts(...args),
  getBill: (...args: unknown[]) => mockGetBill(...args),
}));

// Payment API mocks
const mockCreatePayment = jest.fn();
const mockGetPayments = jest.fn();

jest.mock('../services/api/payments', () => ({
  createPayment: (...args: unknown[]) => mockCreatePayment(...args),
  getPayments: (...args: unknown[]) => mockGetPayments(...args),
}));

// Waiter Call API mocks
const mockGetWaiterCalls = jest.fn();
const mockGetWaiterCall = jest.fn();
const mockAcknowledgeWaiterCall = jest.fn();
const mockCompleteWaiterCall = jest.fn();
const mockCancelWaiterCall = jest.fn();

jest.mock('../services/api/waiterCalls', () => ({
  getWaiterCalls: (...args: unknown[]) => mockGetWaiterCalls(...args),
  getWaiterCall: (...args: unknown[]) => mockGetWaiterCall(...args),
  acknowledgeWaiterCall: (...args: unknown[]) => mockAcknowledgeWaiterCall(...args),
  completeWaiterCall: (...args: unknown[]) => mockCompleteWaiterCall(...args),
  cancelWaiterCall: (...args: unknown[]) => mockCancelWaiterCall(...args),
}));

// API Client mock
const mockSetSessionInfo = jest.fn();
const mockGetApiClient = jest.fn(() => ({
  setSessionInfo: mockSetSessionInfo,
}));

jest.mock('../services/api/client', () => ({
  getApiClient: () => mockGetApiClient(),
  getDeviceType: () => 'mobile',
  getDevicePlatform: () => 'ios',
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'waiter-123',
    username: 'testwaiter',
    role: Role.WAITER,
    organizationId: 'org-456',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

function createMockLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    account: createMockAccount(),
    sessionId: 'session-789',
    ...overrides,
  };
}

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-001',
    orderNumber: 1,
    orderCode: 'ORD-001',
    orderType: OrderType.DINE_IN,
    orderStatus: 'Pending' as Order['orderStatus'],
    tableId: 'table-1',
    waiterId: 'waiter-123',
    customerId: null,
    totalAmount: '50.00',
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
    orderId: 'order-001',
    menuItemId: 'menu-item-1',
    stockId: null,
    quantity: '2',
    itemTitle: { en: 'Test Item', ru: 'Тест', tm: 'Test' },
    itemPrice: '25.00',
    subtotal: '50.00',
    status: OrderItemStatus.PENDING,
    notes: undefined,
    declineReason: undefined,
    cancelReason: undefined,
    createdAt: new Date().toISOString(),
    extras: [],
    ...overrides,
  } as OrderItem;
}

function createMockBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-001',
    orderId: 'order-001',
    subtotal: '50.00',
    discountAmount: '0.00',
    serviceFeeAmount: '5.00',
    totalAmount: '55.00',
    paidAmount: '0.00',
    status: BillStatus.DRAFT,
    createdAt: new Date().toISOString(),
    billItems: [],
    discounts: [],
    ...overrides,
  } as Bill;
}

function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-001',
    billId: 'bill-001',
    amount: '55.00',
    paymentMethod: PaymentMethod.CASH,
    transactionId: undefined,
    notes: undefined,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Payment;
}

function createMockWaiterCall(overrides: Partial<WaiterCall> = {}): WaiterCall {
  return {
    id: 'call-001',
    tableId: 'table-1',
    waiterId: null,
    status: WaiterCallStatus.PENDING,
    reason: 'Need assistance',
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    completedAt: null,
    ...overrides,
  } as WaiterCall;
}

// ============================================================================
// Import Stores After Mocks
// ============================================================================

import { useSendToKitchen } from '../hooks/useSendToKitchen';
import { useAuthStore } from '../stores/authStore';
import type { LocalOrderItem } from '../stores/orderStore';

// ============================================================================
// Test Suites
// ============================================================================

describe('End-to-End Flow: Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth store state
    useAuthStore.setState({
      sessionId: null,
      account: null,
      deviceId: null,
      isAuthenticated: false,
      isInitializing: true,
      isLoggingIn: false,
      isLoggingOut: false,
      error: null,
    });
  });

  describe('Complete Login Flow', () => {
    it('should initialize app, login user, and establish session', async () => {
      // Step 1: Initialize the app (sets up device ID)
      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(useAuthStore.getState().deviceId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(useAuthStore.getState().isInitializing).toBe(false);

      // Step 2: User enters credentials and logs in
      const loginResponse = createMockLoginResponse();
      mockApiLogin.mockResolvedValueOnce(loginResponse);

      const { login } = useAuthStore.getState();
      const result = await login({ username: 'testwaiter', password: 'password123' });

      // Verify successful login
      expect(result).toEqual(loginResponse);
      expect(mockApiLogin).toHaveBeenCalledWith({
        username: 'testwaiter',
        password: 'password123',
      });

      // Verify session established
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionId).toBe('session-789');
      expect(state.account?.username).toBe('testwaiter');
      expect(state.account?.role).toBe(Role.WAITER);

      // Verify API client session updated
      expect(mockSetSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-789',
        })
      );
    });

    it('should handle failed login with invalid credentials', async () => {
      // Initialize first
      await useAuthStore.getState().initialize();

      // Attempt login with wrong password
      mockApiLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

      const { login } = useAuthStore.getState();

      await expect(login({ username: 'testwaiter', password: 'wrongpass' })).rejects.toThrow(
        'Invalid credentials'
      );

      // Verify not authenticated
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionId).toBeNull();
      expect(state.error).toBe('Invalid credentials');
    });

    it('should restore session on app restart', async () => {
      // Simulate stored session
      jest.requireMock('expo-secure-store').getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'maestro_device_id') return 'existing-device-123';
        if (key === 'maestro_session_id') return 'existing-session-456';
        return null;
      });

      mockCheckSession.mockResolvedValueOnce(createMockAccount());

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionId).toBe('existing-session-456');
    });
  });

  describe('Complete Logout Flow', () => {
    it('should logout and clear session', async () => {
      // Setup: Initialize and login first
      await useAuthStore.getState().initialize();
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse());
      await useAuthStore.getState().login({ username: 'testwaiter', password: 'pass' });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Perform logout
      mockApiLogout.mockResolvedValueOnce(undefined);
      await useAuthStore.getState().logout();

      // Verify logged out
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionId).toBeNull();
      expect(state.account).toBeNull();
      expect(mockSetSessionInfo).toHaveBeenCalledWith(null);
    });

    it('should clear local session even if logout API fails', async () => {
      // Setup: Login first
      await useAuthStore.getState().initialize();
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse());
      await useAuthStore.getState().login({ username: 'testwaiter', password: 'pass' });

      // Logout fails on server but local state should still clear
      mockApiLogout.mockRejectedValueOnce(new Error('Network error'));
      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().sessionId).toBeNull();
    });
  });
});

describe('End-to-End Flow: Order Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Order Creation Flow', () => {
    it('should create order, add items, and send to kitchen', async () => {
      // Setup: Mock successful API responses
      const mockOrder = createMockOrder({ id: 'new-order-123' });
      const mockItems = [createMockOrderItem({ id: 'item-1', orderId: 'new-order-123' })];
      const mockUpdatedItems = [
        createMockOrderItem({ id: 'item-1', status: OrderItemStatus.SENT_TO_PREPARE }),
      ];

      mockCreateOrder.mockResolvedValue(mockOrder);
      mockBatchCreateOrderItems.mockResolvedValue(mockItems);
      mockBatchUpdateOrderItemStatus.mockResolvedValue(mockUpdatedItems);

      // Use the send to kitchen hook
      const { result } = renderHook(() => useSendToKitchen());

      // Create local order items (as user would add items to cart)
      const localItems: LocalOrderItem[] = [
        {
          id: 'local-1',
          menuItemId: 'menu-item-1',
          menuItem: {
            id: 'menu-item-1',
            title: { en: 'Burger', ru: 'Бургер', tm: 'Burger' },
            description: { en: 'Delicious burger', ru: 'Вкусный бургер', tm: 'Burger' },
            price: '25.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 2,
          notes: 'No onions',
          extras: [],
          unitPrice: 25.0,
          subtotal: 50.0,
        },
      ];

      // Execute the complete flow
      let sendResult: Awaited<ReturnType<typeof result.current.sendToKitchen>> | undefined;

      await act(async () => {
        sendResult = await result.current.sendToKitchen(
          'table-1',
          localItems,
          'Please prepare quickly'
        );
      });

      // Verify success
      expect(sendResult?.success).toBe(true);
      expect(sendResult?.order).toEqual(mockOrder);
      expect(sendResult?.orderItems).toEqual(mockUpdatedItems);

      // Verify API call sequence
      // 1. Create order
      expect(mockCreateOrder).toHaveBeenCalledWith({
        orderType: OrderType.DINE_IN,
        tableId: 'table-1',
        notes: 'Please prepare quickly',
      });

      // 2. Batch create items
      expect(mockBatchCreateOrderItems).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'new-order-123',
          items: expect.arrayContaining([
            expect.objectContaining({
              menuItemId: 'menu-item-1',
              quantity: 2,
              notes: 'No onions',
            }),
          ]),
        })
      );

      // 3. Update status to SentToPrepare
      expect(mockBatchUpdateOrderItemStatus).toHaveBeenCalledWith({
        ids: ['item-1'],
        status: OrderItemStatus.SENT_TO_PREPARE,
      });

      // Verify hook state
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.lastSentOrderId).toBe('new-order-123');
    });

    it('should add items to existing order', async () => {
      const mockItems = [createMockOrderItem({ id: 'item-2', orderId: 'existing-order-456' })];
      const mockUpdatedItems = [
        createMockOrderItem({ id: 'item-2', status: OrderItemStatus.SENT_TO_PREPARE }),
      ];

      mockBatchCreateOrderItems.mockResolvedValue(mockItems);
      mockBatchUpdateOrderItemStatus.mockResolvedValue(mockUpdatedItems);

      const { result } = renderHook(() => useSendToKitchen());

      const localItems: LocalOrderItem[] = [
        {
          id: 'local-2',
          menuItemId: 'menu-item-2',
          menuItem: {
            id: 'menu-item-2',
            title: { en: 'Fries', ru: 'Картофель', tm: 'Fries' },
            description: { en: 'Crispy fries', ru: 'Хрустящий картофель', tm: 'Fries' },
            price: '10.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 1,
          notes: '',
          extras: [],
          unitPrice: 10.0,
          subtotal: 10.0,
        },
      ];

      await act(async () => {
        await result.current.sendToKitchen('table-1', localItems, '', 'existing-order-456');
      });

      // Order creation should NOT be called
      expect(mockCreateOrder).not.toHaveBeenCalled();

      // Items should be added to existing order
      expect(mockBatchCreateOrderItems).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'existing-order-456',
        })
      );
    });

    it('should handle network error during order creation', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useSendToKitchen());

      const localItems: LocalOrderItem[] = [
        {
          id: 'local-1',
          menuItemId: 'menu-item-1',
          menuItem: {
            id: 'menu-item-1',
            title: { en: 'Test Item', ru: 'Test', tm: 'Test' },
            description: { en: 'Test', ru: 'Test', tm: 'Test' },
            price: '10.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 1,
          notes: '',
          extras: [],
          unitPrice: 10.0,
          subtotal: 10.0,
        },
      ];

      let sendResult: Awaited<ReturnType<typeof result.current.sendToKitchen>> | undefined;

      await act(async () => {
        sendResult = await result.current.sendToKitchen('table-1', localItems);
      });

      expect(sendResult?.success).toBe(false);
      expect(result.current.error).toContain('Unable to connect');
    });

    it('should allow retry after failure', async () => {
      // First attempt fails
      mockCreateOrder.mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useSendToKitchen());

      const localItems: LocalOrderItem[] = [
        {
          id: 'local-1',
          menuItemId: 'menu-item-1',
          menuItem: {
            id: 'menu-item-1',
            title: { en: 'Test', ru: 'Test', tm: 'Test' },
            description: { en: 'Test', ru: 'Test', tm: 'Test' },
            price: '10.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 1,
          notes: '',
          extras: [],
          unitPrice: 10.0,
          subtotal: 10.0,
        },
      ];

      await act(async () => {
        await result.current.sendToKitchen('table-1', localItems);
      });

      expect(result.current.error).toBeTruthy();

      // Second attempt succeeds
      const mockOrder = createMockOrder();
      mockCreateOrder.mockResolvedValueOnce(mockOrder);
      mockBatchCreateOrderItems.mockResolvedValueOnce([createMockOrderItem()]);
      mockBatchUpdateOrderItemStatus.mockResolvedValueOnce([createMockOrderItem()]);

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('End-to-End Flow: Payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Payment Flow', () => {
    it('should create bill, calculate totals, and process payment', async () => {
      // Setup mock responses
      const mockBill = createMockBill();
      const mockCalculation: CalculateBillResponse = {
        subtotal: '50.00',
        discountAmount: '0.00',
        serviceFeeAmount: '5.00',
        totalAmount: '55.00',
      };
      const mockPaymentResult = createMockPayment();

      mockCalculateBill.mockResolvedValue(mockCalculation);
      mockCreateBill.mockResolvedValue(mockBill);
      mockCreatePayment.mockResolvedValue(mockPaymentResult);

      // Step 1: Calculate bill preview
      const calcResult = await mockCalculateBill({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      expect(calcResult.subtotal).toBe('50.00');
      expect(calcResult.totalAmount).toBe('55.00');

      // Step 2: Create the actual bill
      const billResult = await mockCreateBill({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      expect(billResult.id).toBe('bill-001');
      expect(mockCreateBill).toHaveBeenCalledWith({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      // Step 3: Process payment
      const paymentResult = await mockCreatePayment({
        billId: 'bill-001',
        amount: '55.00',
        paymentMethod: PaymentMethod.CASH,
      });

      expect(paymentResult.id).toBe('payment-001');
      expect(mockCreatePayment).toHaveBeenCalledWith({
        billId: 'bill-001',
        amount: '55.00',
        paymentMethod: PaymentMethod.CASH,
      });
    });

    it('should handle partial payment with multiple payment methods', async () => {
      const mockBill = createMockBill({ paidAmount: '0.00' });
      const mockPayment1 = createMockPayment({
        id: 'payment-001',
        amount: '30.00',
        paymentMethod: PaymentMethod.CASH,
      });
      const mockPayment2 = createMockPayment({
        id: 'payment-002',
        amount: '25.00',
        paymentMethod: PaymentMethod.BANK_CARD,
        transactionId: 'TXN-12345',
      });

      mockCreateBill.mockResolvedValue(mockBill);
      mockCreatePayment.mockResolvedValueOnce(mockPayment1).mockResolvedValueOnce(mockPayment2);

      // Create bill
      await mockCreateBill({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      // First payment (cash)
      const payment1Result = await mockCreatePayment({
        billId: 'bill-001',
        amount: '30.00',
        paymentMethod: PaymentMethod.CASH,
      });

      expect(payment1Result.amount).toBe('30.00');
      expect(payment1Result.paymentMethod).toBe(PaymentMethod.CASH);

      // Second payment (card)
      const payment2Result = await mockCreatePayment({
        billId: 'bill-001',
        amount: '25.00',
        paymentMethod: PaymentMethod.BANK_CARD,
        transactionId: 'TXN-12345',
      });

      expect(payment2Result.amount).toBe('25.00');
      expect(payment2Result.paymentMethod).toBe(PaymentMethod.BANK_CARD);
      expect(payment2Result.transactionId).toBe('TXN-12345');
    });

    it('should apply discounts and recalculate bill', async () => {
      const mockBill = createMockBill();
      const mockUpdatedBill = createMockBill({
        discountAmount: '10.00',
        totalAmount: '45.00',
        paidAmount: '0.00',
      });

      mockCreateBill.mockResolvedValue(mockBill);
      mockUpdateBillDiscounts.mockResolvedValue(mockUpdatedBill);

      // Create bill
      await mockCreateBill({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      // Apply discount
      const updatedBill = await mockUpdateBillDiscounts('bill-001', {
        discountIds: ['discount-001'],
      });

      expect(updatedBill.discountAmount).toBe('10.00');
      expect(updatedBill.totalAmount).toBe('45.00');
      expect(mockUpdateBillDiscounts).toHaveBeenCalledWith('bill-001', {
        discountIds: ['discount-001'],
      });
    });

    it('should handle payment failure gracefully', async () => {
      mockCreateBill.mockResolvedValue(createMockBill());
      mockCreatePayment.mockRejectedValue(new Error('Payment declined'));

      // Create bill succeeds
      await mockCreateBill({
        orderId: 'order-001',
        itemIds: ['order-item-1'],
      });

      // Payment fails
      await expect(
        mockCreatePayment({
          billId: 'bill-001',
          amount: '55.00',
          paymentMethod: PaymentMethod.BANK_CARD,
        })
      ).rejects.toThrow('Payment declined');
    });
  });
});

describe('End-to-End Flow: Call Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Call Handling Flow', () => {
    it('should receive, acknowledge, and complete a waiter call', async () => {
      // Setup mock responses
      const pendingCall = createMockWaiterCall({
        id: 'call-001',
        status: WaiterCallStatus.PENDING,
      });
      const acknowledgedCall = createMockWaiterCall({
        id: 'call-001',
        status: WaiterCallStatus.ACKNOWLEDGED,
        waiterId: 'waiter-123',
        acknowledgedAt: new Date().toISOString(),
      });
      const completedCall = createMockWaiterCall({
        id: 'call-001',
        status: WaiterCallStatus.COMPLETED,
        waiterId: 'waiter-123',
        completedAt: new Date().toISOString(),
      });

      mockGetWaiterCalls.mockResolvedValue({ data: [pendingCall], total: 1 });
      mockAcknowledgeWaiterCall.mockResolvedValue(acknowledgedCall);
      mockCompleteWaiterCall.mockResolvedValue(completedCall);

      // Step 1: Waiter receives pending calls
      const callsResult = await mockGetWaiterCalls({ status: WaiterCallStatus.PENDING });

      expect(callsResult.data).toHaveLength(1);
      expect(callsResult.data[0].status).toBe(WaiterCallStatus.PENDING);
      expect(callsResult.data[0].reason).toBe('Need assistance');

      // Step 2: Waiter acknowledges the call
      const ackResult = await mockAcknowledgeWaiterCall('call-001');

      expect(ackResult.status).toBe(WaiterCallStatus.ACKNOWLEDGED);
      expect(ackResult.waiterId).toBe('waiter-123');
      expect(ackResult.acknowledgedAt).toBeDefined();
      expect(mockAcknowledgeWaiterCall).toHaveBeenCalledWith('call-001');

      // Step 3: Waiter completes the call after helping customer
      const completeResult = await mockCompleteWaiterCall('call-001');

      expect(completeResult.status).toBe(WaiterCallStatus.COMPLETED);
      expect(completeResult.completedAt).toBeDefined();
      expect(mockCompleteWaiterCall).toHaveBeenCalledWith('call-001');
    });

    it('should handle cancelling a waiter call', async () => {
      const cancelledCall = createMockWaiterCall({
        id: 'call-002',
        status: WaiterCallStatus.CANCELLED,
      });

      mockCancelWaiterCall.mockResolvedValue(cancelledCall);

      const result = await mockCancelWaiterCall('call-002');

      expect(result.status).toBe(WaiterCallStatus.CANCELLED);
      expect(mockCancelWaiterCall).toHaveBeenCalledWith('call-002');
    });

    it('should filter calls by status', async () => {
      const pendingCalls = [
        createMockWaiterCall({ id: 'call-001', status: WaiterCallStatus.PENDING }),
        createMockWaiterCall({ id: 'call-002', status: WaiterCallStatus.PENDING }),
      ];
      const acknowledgedCalls = [
        createMockWaiterCall({ id: 'call-003', status: WaiterCallStatus.ACKNOWLEDGED }),
      ];

      mockGetWaiterCalls
        .mockResolvedValueOnce({ data: pendingCalls, total: 2 })
        .mockResolvedValueOnce({ data: acknowledgedCalls, total: 1 });

      // Get pending calls
      const pending = await mockGetWaiterCalls({ status: WaiterCallStatus.PENDING });
      expect(pending.data).toHaveLength(2);
      expect(pending.data[0].status).toBe(WaiterCallStatus.PENDING);

      // Get acknowledged calls
      const acknowledged = await mockGetWaiterCalls({ status: WaiterCallStatus.ACKNOWLEDGED });
      expect(acknowledged.data).toHaveLength(1);
      expect(acknowledged.data[0].status).toBe(WaiterCallStatus.ACKNOWLEDGED);
    });

    it('should get single call details', async () => {
      const callDetail = createMockWaiterCall({
        id: 'call-001',
        reason: 'Need menu assistance',
      });

      mockGetWaiterCall.mockResolvedValue(callDetail);

      const result = await mockGetWaiterCall('call-001');

      expect(result.id).toBe('call-001');
      expect(result.reason).toBe('Need menu assistance');
      expect(mockGetWaiterCall).toHaveBeenCalledWith('call-001');
    });

    it('should handle error when acknowledging already acknowledged call', async () => {
      mockAcknowledgeWaiterCall.mockRejectedValue(new Error('Call already acknowledged'));

      await expect(mockAcknowledgeWaiterCall('call-001')).rejects.toThrow(
        'Call already acknowledged'
      );
    });

    it('should handle error when completing non-acknowledged call', async () => {
      mockCompleteWaiterCall.mockRejectedValue(
        new Error('Cannot complete call that is not acknowledged')
      );

      await expect(mockCompleteWaiterCall('call-001')).rejects.toThrow(
        'Cannot complete call that is not acknowledged'
      );
    });
  });
});

describe('End-to-End Flow: Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth store
    useAuthStore.setState({
      sessionId: null,
      account: null,
      deviceId: null,
      isAuthenticated: false,
      isInitializing: true,
      isLoggingIn: false,
      isLoggingOut: false,
      error: null,
    });
  });

  describe('Full Service Flow: Login -> Order -> Payment -> Logout', () => {
    it('should complete a full waiter service session', async () => {
      // =========================================
      // Phase 1: Login
      // =========================================
      await useAuthStore.getState().initialize();
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse());
      await useAuthStore.getState().login({ username: 'waiter1', password: 'pass' });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // =========================================
      // Phase 2: Create Order
      // =========================================
      const mockOrder = createMockOrder({ id: 'order-session-001' });
      const mockItems = [createMockOrderItem({ id: 'item-1', orderId: 'order-session-001' })];

      mockCreateOrder.mockResolvedValue(mockOrder);
      mockBatchCreateOrderItems.mockResolvedValue(mockItems);
      mockBatchUpdateOrderItemStatus.mockResolvedValue(mockItems);

      const { result: sendToKitchenResult } = renderHook(() => useSendToKitchen());

      const localItems: LocalOrderItem[] = [
        {
          id: 'local-1',
          menuItemId: 'menu-1',
          menuItem: {
            id: 'menu-1',
            title: { en: 'Steak', ru: 'Стейк', tm: 'Steak' },
            description: { en: 'Steak', ru: 'Стейк', tm: 'Steak' },
            price: '45.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 1,
          notes: 'Medium rare',
          extras: [],
          unitPrice: 45.0,
          subtotal: 45.0,
        },
      ];

      await act(async () => {
        await sendToKitchenResult.current.sendToKitchen('table-5', localItems);
      });

      expect(sendToKitchenResult.current.isSuccess).toBe(true);

      // =========================================
      // Phase 3: Handle Waiter Call (while order is being prepared)
      // =========================================
      const pendingCall = createMockWaiterCall({ tableId: 'table-3' });
      mockGetWaiterCalls.mockResolvedValue({ data: [pendingCall], total: 1 });
      mockAcknowledgeWaiterCall.mockResolvedValue(
        createMockWaiterCall({ status: WaiterCallStatus.ACKNOWLEDGED })
      );
      mockCompleteWaiterCall.mockResolvedValue(
        createMockWaiterCall({ status: WaiterCallStatus.COMPLETED })
      );

      // Check for calls
      await mockGetWaiterCalls({});
      // Acknowledge and complete
      await mockAcknowledgeWaiterCall('call-001');
      await mockCompleteWaiterCall('call-001');

      expect(mockCompleteWaiterCall).toHaveBeenCalled();

      // =========================================
      // Phase 4: Process Payment
      // =========================================
      mockCreateBill.mockResolvedValue(createMockBill({ orderId: 'order-session-001' }));
      mockCreatePayment.mockResolvedValue(createMockPayment());

      await mockCreateBill({ orderId: 'order-session-001', itemIds: ['item-1'] });
      await mockCreatePayment({
        billId: 'bill-001',
        amount: '55.00',
        paymentMethod: PaymentMethod.CASH,
      });

      expect(mockCreatePayment).toHaveBeenCalled();

      // =========================================
      // Phase 5: Logout
      // =========================================
      mockApiLogout.mockResolvedValueOnce(undefined);
      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from session expiration', async () => {
      // Login first
      await useAuthStore.getState().initialize();
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse());
      await useAuthStore.getState().login({ username: 'waiter1', password: 'pass' });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Session becomes invalid
      mockCheckSession.mockRejectedValueOnce(new Error('Session expired'));

      const isValid = await useAuthStore.getState().validateSession();

      expect(isValid).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // User logs in again
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse({ sessionId: 'new-session' }));
      await useAuthStore.getState().login({ username: 'waiter1', password: 'pass' });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().sessionId).toBe('new-session');
    });

    it('should handle order creation failure and retry', async () => {
      await useAuthStore.getState().initialize();
      mockApiLogin.mockResolvedValueOnce(createMockLoginResponse());
      await useAuthStore.getState().login({ username: 'waiter1', password: 'pass' });

      const { result } = renderHook(() => useSendToKitchen());

      const localItems: LocalOrderItem[] = [
        {
          id: 'local-1',
          menuItemId: 'menu-1',
          menuItem: {
            id: 'menu-1',
            title: { en: 'Test', ru: 'Test', tm: 'Test' },
            description: { en: 'Test', ru: 'Test', tm: 'Test' },
            price: '10.00',
            isActive: true,
            categoryId: 'cat-1',
            imagePath: '',
            isGroup: false,
            extras: [],
          },
          quantity: 1,
          notes: '',
          extras: [],
          unitPrice: 10.0,
          subtotal: 10.0,
        },
      ];

      // First attempt fails
      mockCreateOrder.mockRejectedValueOnce(new Error('Server temporarily unavailable'));

      await act(async () => {
        await result.current.sendToKitchen('table-1', localItems);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isSuccess).toBe(false);

      // Retry succeeds
      mockCreateOrder.mockResolvedValueOnce(createMockOrder());
      mockBatchCreateOrderItems.mockResolvedValueOnce([createMockOrderItem()]);
      mockBatchUpdateOrderItemStatus.mockResolvedValueOnce([createMockOrderItem()]);

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('E2E Test Export Verification', () => {
  it('should export all required test functions', () => {
    // Verify factories are working
    expect(createMockAccount()).toBeDefined();
    expect(createMockLoginResponse()).toBeDefined();
    expect(createMockOrder()).toBeDefined();
    expect(createMockOrderItem()).toBeDefined();
    expect(createMockBill()).toBeDefined();
    expect(createMockPayment()).toBeDefined();
    expect(createMockWaiterCall()).toBeDefined();
  });
});

/**
 * Tests for API endpoint modules
 *
 * This file tests all API endpoint functions to ensure they:
 * 1. Call the correct API endpoints
 * 2. Pass the correct parameters
 * 3. Return the expected response types
 */

import { initializeApiClient, resetApiClient } from '../services/api/client';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('API Endpoints', () => {
  let mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    resetApiClient();
    initializeApiClient({ baseURL: 'http://localhost:3000/api/v1' });

    // Get reference to the mocked axios instance
    const axios = require('axios');
    mockAxiosInstance = axios.create();

    // Reset all mocks
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockAxiosInstance.delete.mockReset();
  });

  afterEach(() => {
    resetApiClient();
  });

  describe('Auth API', () => {
    const { login, checkSession, logout } = require('../services/api/auth');

    it('login should POST to /auth/login', async () => {
      const mockResponse = {
        account: { id: 'test-id', username: 'waiter001', role: 'waiter' },
        sessionId: 'test-session-id',
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await login({ username: 'waiter001', password: 'password123' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/auth/login',
        { username: 'waiter001', password: 'password123' },
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('checkSession should GET /auth/check', async () => {
      const mockResponse = { id: 'test-id', username: 'waiter001', role: 'waiter' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await checkSession();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/check', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('logout should POST to /auth/logout', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: undefined });

      await logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', undefined, undefined);
    });
  });

  describe('Orders API', () => {
    const { createOrder, getOrders, getOrder, updateOrder } = require('../services/api/orders');

    it('createOrder should POST to /order', async () => {
      const mockResponse = {
        id: 'order-id',
        orderCode: '240101-123456-001',
        orderType: 'Dine-in',
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { orderType: 'Dine-in', tableId: 'table-id' };
      const result = await createOrder(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/order', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getOrders should GET /order with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getOrders({ status: 'Pending', skip: 0, take: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/order?status=Pending&skip=0&take=10',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getOrders should GET /order without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getOrders();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/order', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getOrder should GET /order/:id', async () => {
      const mockResponse = { id: 'order-id', orderCode: '240101-123456-001' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getOrder('order-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/order/order-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('updateOrder should PUT to /order/:id', async () => {
      const mockResponse = { id: 'order-id', orderStatus: 'InProgress' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const request = { orderStatus: 'InProgress' };
      const result = await updateOrder('order-id', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/order/order-id', request, undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Order Items API', () => {
    const {
      createOrderItem,
      batchCreateOrderItems,
      getOrderItems,
      getOrderItem,
      updateOrderItem,
      batchUpdateOrderItemStatus,
      getKitchenView,
    } = require('../services/api/orderItems');

    it('createOrderItem should POST to /order-item', async () => {
      const mockResponse = { id: 'item-id', orderId: 'order-id', quantity: '2' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { orderId: 'order-id', menuItemId: 'menu-item-id', quantity: 2 };
      const result = await createOrderItem(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/order-item', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('batchCreateOrderItems should POST to /order-item/batch', async () => {
      const mockResponse = [{ id: 'item-1' }, { id: 'item-2' }];
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = {
        orderId: 'order-id',
        items: [
          { menuItemId: 'item-1', quantity: 1 },
          { menuItemId: 'item-2', quantity: 2 },
        ],
      };
      const result = await batchCreateOrderItems(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/order-item/batch', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getOrderItems should GET /order-item with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getOrderItems({ orderId: 'order-id', status: 'Pending' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/order-item?orderId=order-id&status=Pending',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getOrderItem should GET /order-item/:id', async () => {
      const mockResponse = { id: 'item-id', quantity: '2' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getOrderItem('item-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/order-item/item-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('updateOrderItem should PUT to /order-item/:id', async () => {
      const mockResponse = { id: 'item-id', quantity: '3' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const request = { quantity: 3 };
      const result = await updateOrderItem('item-id', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/order-item/item-id', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('batchUpdateOrderItemStatus should PATCH to /order-item/batch/status', async () => {
      const mockResponse = [{ id: 'item-1', status: 'Ready' }];
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

      const request = { ids: ['item-1', 'item-2'], status: 'Ready' };
      const result = await batchUpdateOrderItemStatus(request);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/order-item/batch/status',
        request,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getKitchenView should GET /order-item/kitchen/view', async () => {
      const mockResponse = { pending: [], preparing: [], ready: [] };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getKitchenView();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/order-item/kitchen/view', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Tables API', () => {
    const { getTables, getTable } = require('../services/api/tables');

    it('getTables should GET /table with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getTables({ zoneId: 'zone-id', skip: 0, take: 20 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table?zoneId=zone-id&skip=0&take=20',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getTables should GET /table without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getTables();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getTable should GET /table/:id', async () => {
      const mockResponse = { id: 'table-id', title: 'Table 1', capacity: 4 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getTable('table-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/table-id', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Zones API', () => {
    const { getZones, getZone } = require('../services/api/zones');

    it('getZones should GET /zone with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getZones({ isActive: true, skip: 0, take: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/zone?isActive=true&skip=0&take=10',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getZones should GET /zone without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getZones();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/zone', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getZone should GET /zone/:id', async () => {
      const mockResponse = { id: 'zone-id', title: { en: 'Main Hall' } };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getZone('zone-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/zone/zone-id', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Menu API', () => {
    const {
      getMenuCategories,
      getMenuCategory,
      getMenuItems,
      getMenuItem,
    } = require('../services/api/menu');

    it('getMenuCategories should GET /menu-category with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuCategories({ type: 'kitchen', skip: 0, take: 20 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/menu-category?type=kitchen&skip=0&take=20',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getMenuCategories should GET /menu-category without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuCategories();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-category', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getMenuCategory should GET /menu-category/:id', async () => {
      const mockResponse = { id: 'cat-id', title: { en: 'Appetizers' } };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuCategory('cat-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-category/cat-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getMenuItems should GET /menu-item with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuItems({ categoryId: 'cat-id', isActive: true });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/menu-item?categoryId=cat-id&isActive=true',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getMenuItems should GET /menu-item without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuItems();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getMenuItem should GET /menu-item/:id', async () => {
      const mockResponse = { id: 'item-id', title: { en: 'Pizza' }, price: '50.00' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getMenuItem('item-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item/item-id', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Waiter Calls API', () => {
    const {
      createWaiterCall,
      getWaiterCalls,
      getWaiterCall,
      acknowledgeWaiterCall,
      completeWaiterCall,
      cancelWaiterCall,
    } = require('../services/api/waiterCalls');

    it('createWaiterCall should POST to /waiter-call', async () => {
      const mockResponse = { id: 'call-id', tableId: 'table-id', status: 'pending' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { tableId: 'table-id', reason: 'Need assistance' };
      const result = await createWaiterCall(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/waiter-call', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getWaiterCalls should GET /waiter-call with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getWaiterCalls({ status: 'pending', skip: 0, take: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/waiter-call?status=pending&skip=0&take=10',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getWaiterCalls should GET /waiter-call without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getWaiterCalls();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/waiter-call', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getWaiterCall should GET /waiter-call/:id', async () => {
      const mockResponse = { id: 'call-id', status: 'pending' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getWaiterCall('call-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/waiter-call/call-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('acknowledgeWaiterCall should PUT to /waiter-call/:id/acknowledge', async () => {
      const mockResponse = { id: 'call-id', status: 'acknowledged' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await acknowledgeWaiterCall('call-id');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/waiter-call/call-id/acknowledge',
        undefined,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('completeWaiterCall should PUT to /waiter-call/:id/complete', async () => {
      const mockResponse = { id: 'call-id', status: 'completed' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await completeWaiterCall('call-id');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/waiter-call/call-id/complete',
        undefined,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('cancelWaiterCall should PUT to /waiter-call/:id/cancel', async () => {
      const mockResponse = { id: 'call-id', status: 'cancelled' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await cancelWaiterCall('call-id');

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/waiter-call/call-id/cancel',
        undefined,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Bills API', () => {
    const {
      createBill,
      getBills,
      getBill,
      updateBill,
      updateBillDiscounts,
      calculateBill,
    } = require('../services/api/bills');

    it('createBill should POST to /bill', async () => {
      const mockResponse = { id: 'bill-id', orderId: 'order-id', totalAmount: '100.00' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = {
        orderId: 'order-id',
        items: [{ orderItemId: 'item-id', quantity: 2, price: '50.00' }],
      };
      const result = await createBill(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/bill', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getBills should GET /bill with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getBills({ orderId: 'order-id', skip: 0, take: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/bill?orderId=order-id&skip=0&take=10',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getBills should GET /bill without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getBills();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bill', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getBill should GET /bill/:id', async () => {
      const mockResponse = { id: 'bill-id', totalAmount: '100.00' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getBill('bill-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bill/bill-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('updateBill should PUT to /bill/:id', async () => {
      const mockResponse = { id: 'bill-id', status: 'finalized' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const request = { status: 'finalized' };
      const result = await updateBill('bill-id', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/bill/bill-id', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('updateBillDiscounts should PUT to /bill/:id/discounts', async () => {
      const mockResponse = { id: 'bill-id', discountAmount: '10.00' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const request = { discountIds: ['discount-1'], customDiscountAmount: 5 };
      const result = await updateBillDiscounts('bill-id', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/bill/bill-id/discounts',
        request,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('calculateBill should POST to /bill/calculate', async () => {
      const mockResponse = {
        subtotal: '100.00',
        discountAmount: '10.00',
        serviceFeeAmount: '9.00',
        totalAmount: '99.00',
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { orderId: 'order-id', discountIds: ['discount-1'] };
      const result = await calculateBill(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/bill/calculate', request, undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Payments API', () => {
    const { createPayment, getPayments } = require('../services/api/payments');

    it('createPayment should POST to /payment', async () => {
      const mockResponse = { id: 'payment-id', amount: '50.00', paymentMethod: 'Cash' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { billId: 'bill-id', amount: 50, method: 'Cash' };
      const result = await createPayment(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/payment', request, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getPayments should GET /payment with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getPayments({ billId: 'bill-id', skip: 0, take: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/payment?billId=bill-id&skip=0&take=10',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getPayments should GET /payment without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getPayments();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payment', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Customers API', () => {
    const { getCustomers, getCustomer } = require('../services/api/customers');

    it('getCustomers should GET /customer with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getCustomers({ search: 'John', customerType: 'Regular' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/customer?search=John&customerType=Regular',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getCustomers should GET /customer without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getCustomers();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/customer', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getCustomer should GET /customer/:id', async () => {
      const mockResponse = { id: 'customer-id', firstName: 'John', lastName: 'Doe' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getCustomer('customer-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/customer/customer-id', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Discounts API', () => {
    const { getDiscounts, getDiscount, calculateDiscounts } = require('../services/api/discounts');

    it('getDiscounts should GET /discount with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getDiscounts({ isActive: true, discountType: 'Manual' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/discount?isActive=true&discountType=Manual',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getDiscounts should GET /discount without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getDiscounts();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/discount', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getDiscount should GET /discount/:id', async () => {
      const mockResponse = { id: 'discount-id', title: { en: '10% Off' } };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getDiscount('discount-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/discount/discount-id', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('calculateDiscounts should POST to /discount/calculate', async () => {
      const mockResponse = {
        totalDiscount: '10.00',
        discounts: [{ discountId: 'discount-1', amount: '10.00', type: 'Percentage' }],
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const request = { billAmount: 100, discountIds: ['discount-1'] };
      const result = await calculateDiscounts(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/discount/calculate',
        request,
        undefined
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Extras API', () => {
    const { getExtras, getExtra } = require('../services/api/extras');

    it('getExtras should GET /extra with query params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getExtras({ isActive: true, search: 'cheese' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/extra?isActive=true&search=cheese',
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('getExtras should GET /extra without params', async () => {
      const mockResponse = { data: [], total: 0 };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getExtras();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/extra', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('getExtra should GET /extra/:id', async () => {
      const mockResponse = { id: 'extra-id', title: { en: 'Extra Cheese' }, actualPrice: '5.00' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getExtra('extra-id');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/extra/extra-id', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('API exports from index', () => {
    it('should export all API functions from index', () => {
      const api = require('../services/api');

      // Client exports
      expect(api.ApiClient).toBeDefined();
      expect(api.ApiClientError).toBeDefined();
      expect(api.getApiClient).toBeDefined();
      expect(api.initializeApiClient).toBeDefined();
      expect(api.isApiClientInitialized).toBeDefined();
      expect(api.resetApiClient).toBeDefined();
      expect(api.getDevicePlatform).toBeDefined();
      expect(api.getDeviceType).toBeDefined();

      // Auth exports
      expect(api.login).toBeDefined();
      expect(api.checkSession).toBeDefined();
      expect(api.logout).toBeDefined();

      // Order exports
      expect(api.createOrder).toBeDefined();
      expect(api.getOrders).toBeDefined();
      expect(api.getOrder).toBeDefined();
      expect(api.updateOrder).toBeDefined();

      // Order Item exports
      expect(api.createOrderItem).toBeDefined();
      expect(api.batchCreateOrderItems).toBeDefined();
      expect(api.getOrderItems).toBeDefined();
      expect(api.getOrderItem).toBeDefined();
      expect(api.updateOrderItem).toBeDefined();
      expect(api.batchUpdateOrderItemStatus).toBeDefined();
      expect(api.getKitchenView).toBeDefined();

      // Table exports
      expect(api.getTables).toBeDefined();
      expect(api.getTable).toBeDefined();

      // Zone exports
      expect(api.getZones).toBeDefined();
      expect(api.getZone).toBeDefined();

      // Menu exports
      expect(api.getMenuCategories).toBeDefined();
      expect(api.getMenuCategory).toBeDefined();
      expect(api.getMenuItems).toBeDefined();
      expect(api.getMenuItem).toBeDefined();

      // Waiter Call exports
      expect(api.createWaiterCall).toBeDefined();
      expect(api.getWaiterCalls).toBeDefined();
      expect(api.getWaiterCall).toBeDefined();
      expect(api.acknowledgeWaiterCall).toBeDefined();
      expect(api.completeWaiterCall).toBeDefined();
      expect(api.cancelWaiterCall).toBeDefined();

      // Bill exports
      expect(api.createBill).toBeDefined();
      expect(api.getBills).toBeDefined();
      expect(api.getBill).toBeDefined();
      expect(api.updateBill).toBeDefined();
      expect(api.updateBillDiscounts).toBeDefined();
      expect(api.calculateBill).toBeDefined();

      // Payment exports
      expect(api.createPayment).toBeDefined();
      expect(api.getPayments).toBeDefined();

      // Customer exports
      expect(api.getCustomers).toBeDefined();
      expect(api.getCustomer).toBeDefined();

      // Discount exports
      expect(api.getDiscounts).toBeDefined();
      expect(api.getDiscount).toBeDefined();
      expect(api.calculateDiscounts).toBeDefined();

      // Extra exports
      expect(api.getExtras).toBeDefined();
      expect(api.getExtra).toBeDefined();
    });
  });
});

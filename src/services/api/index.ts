/**
 * API services exports
 */

// Auth exports
export { checkSession, login, logout } from './auth';
// Bill exports
export {
  calculateBill,
  createBill,
  getBill,
  getBills,
  updateBill,
  updateBillDiscounts,
} from './bills';
// Client exports
export type {
  ApiClientConfig,
  AuthErrorCallback,
  SessionInfo,
} from './client';
export {
  ApiClient,
  ApiClientError,
  getApiClient,
  getDevicePlatform,
  getDeviceType,
  initializeApiClient,
  isApiClientInitialized,
  resetApiClient,
} from './client';
// Customer exports
export { getCustomer, getCustomers } from './customers';
// Discount exports
export { calculateDiscounts, getDiscount, getDiscounts } from './discounts';
// Extra exports
export { getExtra, getExtras } from './extras';

// Menu exports
export {
  getMenuCategories,
  getMenuCategory,
  getMenuItem,
  getMenuItems,
} from './menu';
// Order Item exports
export {
  batchCreateOrderItems,
  batchUpdateOrderItemStatus,
  createOrderItem,
  getKitchenView,
  getOrderItem,
  getOrderItems,
  updateOrderItem,
} from './orderItems';
// Order exports
export { createOrder, getOrder, getOrders, updateOrder } from './orders';

// Payment exports
export { createPayment, getPayments } from './payments';
// Table exports
export { getTable, getTables } from './tables';
// Waiter Call exports
export {
  acknowledgeWaiterCall,
  cancelWaiterCall,
  completeWaiterCall,
  createWaiterCall,
  getWaiterCall,
  getWaiterCalls,
} from './waiterCalls';
// Zone exports
export { getZone, getZones } from './zones';

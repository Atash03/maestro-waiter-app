/**
 * API request and response types for the Maestro Waiter App
 * Based on the backend API documentation
 */

import type {
  BillStatus,
  CustomerType,
  DiscountType,
  MenuCategoryType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  ReasonTemplateType,
  ReservationStatus,
  SortOrder,
  WaiterCallStatus,
} from './enums';
import type {
  Account,
  Bill,
  BillItem,
  Customer,
  Discount,
  Extra,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  ReasonTemplate,
  Reservation,
  ServiceFee,
  Table,
  WaiterCall,
  Zone,
} from './models';

// ============================================================================
// Common Types
// ============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

/**
 * Common pagination query parameters
 */
export interface PaginationParams {
  skip?: number;
  take?: number;
}

/**
 * Common sort query parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * API error response
 */
export interface ApiError {
  status: 'error';
  message: string;
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Login request body
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  account: Account;
  sessionId: string;
}

/**
 * Check session response (returns Account)
 */
export type CheckSessionResponse = Account;

// ============================================================================
// Waiter Calls
// ============================================================================

/**
 * Create waiter call request
 */
export interface CreateWaiterCallRequest {
  tableId: string;
  reason?: string;
}

/**
 * Create waiter call response
 */
export interface CreateWaiterCallResponse {
  id: string;
  tableId: string;
  waiterId: string | null;
  status: WaiterCallStatus;
  createdAt: string;
}

/**
 * Get waiter calls query parameters
 */
export interface GetWaiterCallsParams extends PaginationParams {
  status?: WaiterCallStatus;
  tableId?: string;
  waiterId?: string;
}

/**
 * Get waiter calls response
 */
export type GetWaiterCallsResponse = PaginatedResponse<WaiterCall>;

/**
 * Get waiter call by ID response
 */
export type GetWaiterCallResponse = WaiterCall;

/**
 * Acknowledge waiter call response
 */
export interface AcknowledgeWaiterCallResponse {
  id: string;
  status: WaiterCallStatus;
  acknowledgedAt: string;
}

/**
 * Complete waiter call response
 */
export interface CompleteWaiterCallResponse {
  id: string;
  status: WaiterCallStatus;
  completedAt: string;
}

/**
 * Cancel waiter call response
 */
export interface CancelWaiterCallResponse {
  id: string;
  status: WaiterCallStatus;
}

// ============================================================================
// Orders
// ============================================================================

/**
 * Create order request
 */
export interface CreateOrderRequest {
  orderType: OrderType;
  tableId?: string;
  customerId?: string;
  serviceFeeId?: string;
  description?: string;
  notes?: string;
  address?: string;
  pickupTime?: string;
}

/**
 * Create order response
 */
export type CreateOrderResponse = Order;

/**
 * Get orders query parameters
 */
export interface GetOrdersParams extends PaginationParams, SortParams {
  search?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  tableId?: string;
  waiterId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Get orders response
 */
export type GetOrdersResponse = PaginatedResponse<Order>;

/**
 * Get order by ID response
 */
export type GetOrderResponse = Order;

/**
 * Update order request
 */
export interface UpdateOrderRequest {
  orderStatus?: OrderStatus;
  tableId?: string;
  customerId?: string;
  description?: string;
  notes?: string;
  cancelReason?: string;
}

/**
 * Update order response
 */
export type UpdateOrderResponse = Order;

// ============================================================================
// Order Items
// ============================================================================

/**
 * Extra to add to an order item
 */
export interface OrderItemExtraInput {
  extraId: string;
  quantity: number;
}

/**
 * Create order item request
 */
export interface CreateOrderItemRequest {
  orderId: string;
  menuItemId?: string;
  stockId?: string;
  quantity: number;
  notes?: string;
  orderType?: OrderType;
  extras?: OrderItemExtraInput[];
}

/**
 * Create order item response
 */
export type CreateOrderItemResponse = OrderItem;

/**
 * Batch create order items request
 */
export interface BatchCreateOrderItemsRequest {
  orderId: string;
  items: Array<{
    menuItemId?: string;
    stockId?: string;
    quantity: number;
    notes?: string;
    extras?: OrderItemExtraInput[];
  }>;
}

/**
 * Batch create order items response
 */
export type BatchCreateOrderItemsResponse = OrderItem[];

/**
 * Get order items query parameters
 */
export interface GetOrderItemsParams extends PaginationParams, SortParams {
  orderId?: string;
  status?: OrderItemStatus;
  menuType?: MenuCategoryType;
}

/**
 * Get order items response
 */
export type GetOrderItemsResponse = PaginatedResponse<OrderItem>;

/**
 * Get order item by ID response
 */
export type GetOrderItemResponse = OrderItem;

/**
 * Update order item request
 */
export interface UpdateOrderItemRequest {
  quantity?: number;
  notes?: string;
  extras?: OrderItemExtraInput[];
}

/**
 * Update order item response
 */
export type UpdateOrderItemResponse = OrderItem;

/**
 * Batch update order item status request
 */
export interface BatchUpdateOrderItemStatusRequest {
  ids: string[];
  status: OrderItemStatus;
  declineReason?: string;
  declineReasonId?: string;
  cancelReason?: string;
  cancelReasonId?: string;
}

/**
 * Batch update order item status response
 */
export type BatchUpdateOrderItemStatusResponse = OrderItem[];

/**
 * Kitchen view response
 */
export interface KitchenViewResponse {
  pending: OrderItem[];
  preparing: OrderItem[];
  ready: OrderItem[];
}

// ============================================================================
// Tables & Zones
// ============================================================================

/**
 * Get tables query parameters
 */
export interface GetTablesParams extends PaginationParams, SortParams {
  search?: string;
  zoneId?: string;
}

/**
 * Get tables response
 */
export type GetTablesResponse = PaginatedResponse<Table>;

/**
 * Get table by ID response
 */
export type GetTableResponse = Table;

/**
 * Get zones query parameters
 */
export interface GetZonesParams extends PaginationParams, SortParams {
  search?: string;
  isActive?: boolean;
}

/**
 * Get zones response
 */
export type GetZonesResponse = PaginatedResponse<Zone>;

/**
 * Get zone by ID response
 */
export type GetZoneResponse = Zone;

// ============================================================================
// Menu
// ============================================================================

/**
 * Get menu categories query parameters
 */
export interface GetMenuCategoriesParams extends PaginationParams, SortParams {
  search?: string;
  type?: MenuCategoryType;
  parentId?: string;
}

/**
 * Get menu categories response
 */
export type GetMenuCategoriesResponse = PaginatedResponse<MenuCategory>;

/**
 * Get menu category by ID response
 */
export type GetMenuCategoryResponse = MenuCategory;

/**
 * Get menu items query parameters
 */
export interface GetMenuItemsParams extends PaginationParams, SortParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  isGroup?: boolean;
}

/**
 * Get menu items response
 */
export type GetMenuItemsResponse = PaginatedResponse<MenuItem>;

/**
 * Get menu item by ID response
 */
export type GetMenuItemResponse = MenuItem;

// ============================================================================
// Customers
// ============================================================================

/**
 * Get customers query parameters
 */
export interface GetCustomersParams extends PaginationParams, SortParams {
  search?: string;
  customerType?: CustomerType;
}

/**
 * Get customers response
 */
export type GetCustomersResponse = PaginatedResponse<Customer>;

/**
 * Get customer by ID response
 */
export type GetCustomerResponse = Customer;

// ============================================================================
// Bills & Payments
// ============================================================================

/**
 * Create bill request
 */
export interface CreateBillRequest {
  orderId: string;
  customerId?: string;
  items: BillItem[];
}

/**
 * Create bill response
 */
export type CreateBillResponse = Bill;

/**
 * Get bills query parameters
 */
export interface GetBillsParams extends PaginationParams, SortParams {
  orderId?: string;
  customerId?: string;
  status?: BillStatus;
}

/**
 * Get bills response
 */
export type GetBillsResponse = PaginatedResponse<Bill>;

/**
 * Get bill by ID response
 */
export type GetBillResponse = Bill;

/**
 * Update bill request
 */
export interface UpdateBillRequest {
  status?: BillStatus;
  notes?: string;
}

/**
 * Update bill response
 */
export type UpdateBillResponse = Bill;

/**
 * Update bill discounts request
 */
export interface UpdateBillDiscountsRequest {
  discountIds: string[];
  customDiscountAmount?: number;
}

/**
 * Update bill discounts response
 */
export type UpdateBillDiscountsResponse = Bill;

/**
 * Calculate bill request
 */
export interface CalculateBillRequest {
  orderId: string;
  discountIds?: string[];
  customDiscountAmount?: number;
}

/**
 * Calculate bill response
 */
export interface CalculateBillResponse {
  subtotal: string;
  discountAmount: string;
  serviceFeeAmount: string;
  totalAmount: string;
}

/**
 * Create payment request
 */
export interface CreatePaymentRequest {
  billId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

/**
 * Create payment response
 */
export type CreatePaymentResponse = Payment;

/**
 * Get payments query parameters
 */
export interface GetPaymentsParams extends PaginationParams {
  billId?: string;
}

/**
 * Get payments response
 */
export type GetPaymentsResponse = PaginatedResponse<Payment>;

// ============================================================================
// Discounts
// ============================================================================

/**
 * Get discounts query parameters
 */
export interface GetDiscountsParams extends PaginationParams, SortParams {
  search?: string;
  isActive?: boolean;
  discountType?: DiscountType;
}

/**
 * Get discounts response
 */
export type GetDiscountsResponse = PaginatedResponse<Discount>;

/**
 * Get discount by ID response
 */
export type GetDiscountResponse = Discount;

/**
 * Calculate discounts request
 */
export interface CalculateDiscountsRequest {
  billAmount: number;
  itemIds?: string[];
  discountIds: string[];
  customerId?: string;
}

/**
 * Calculated discount result
 */
export interface CalculatedDiscount {
  discountId: string;
  amount: string;
  type: string;
}

/**
 * Calculate discounts response
 */
export interface CalculateDiscountsResponse {
  totalDiscount: string;
  discounts: CalculatedDiscount[];
}

// ============================================================================
// Extras
// ============================================================================

/**
 * Get extras query parameters
 */
export interface GetExtrasParams extends PaginationParams, SortParams {
  search?: string;
  isActive?: boolean;
}

/**
 * Get extras response
 */
export type GetExtrasResponse = PaginatedResponse<Extra>;

/**
 * Get extra by ID response
 */
export type GetExtraResponse = Extra;

// ============================================================================
// Reservations
// ============================================================================

/**
 * Get reservations query parameters
 */
export interface GetReservationsParams extends PaginationParams, SortParams {
  search?: string;
  status?: ReservationStatus;
  tableId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Get reservations response
 */
export type GetReservationsResponse = PaginatedResponse<Reservation>;

/**
 * Get reservation by ID response
 */
export type GetReservationResponse = Reservation;

/**
 * Create reservation request
 */
export interface CreateReservationRequest {
  customerId?: string;
  tableId: string;
  dateTime: string;
  numberOfGuests: number;
  notes?: string;
}

/**
 * Create reservation response
 */
export type CreateReservationResponse = Reservation;

/**
 * Update reservation request
 */
export interface UpdateReservationRequest {
  tableId?: string;
  dateTime?: string;
  numberOfGuests?: number;
  status?: ReservationStatus;
  notes?: string;
}

/**
 * Update reservation response
 */
export type UpdateReservationResponse = Reservation;

// ============================================================================
// Service Fees
// ============================================================================

/**
 * Get service fees query parameters
 */
export interface GetServiceFeesParams extends PaginationParams {
  orderType?: OrderType;
}

/**
 * Get service fees response
 */
export type GetServiceFeesResponse = PaginatedResponse<ServiceFee>;

/**
 * Get delivery options response
 */
export type GetDeliveryOptionsResponse = ServiceFee[];

// ============================================================================
// Reason Templates
// ============================================================================

/**
 * Get reason templates query parameters
 */
export interface GetReasonTemplatesParams extends PaginationParams {
  search?: string;
  type?: ReasonTemplateType;
}

/**
 * Get reason templates response
 */
export type GetReasonTemplatesResponse = PaginatedResponse<ReasonTemplate>;

/**
 * Create reason template request
 */
export interface CreateReasonTemplateRequest {
  name: string;
  type: ReasonTemplateType;
  description?: string;
}

/**
 * Create reason template response
 */
export type CreateReasonTemplateResponse = ReasonTemplate;

// ============================================================================
// SSE Events
// ============================================================================

/**
 * Waiter call SSE event payload
 */
export interface WaiterCallEvent {
  callId: string;
  tableId: string;
  tableTitle: string;
  zoneName: string;
  zoneId: string;
  waiterId: string | null;
  timestamp: string;
}

/**
 * Waiter call acknowledged SSE event payload
 */
export interface WaiterCallAcknowledgedEvent {
  callId: string;
  waiterId: string;
  timestamp: string;
}

/**
 * Waiter call completed SSE event payload
 */
export interface WaiterCallCompletedEvent {
  callId: string;
  waiterId: string;
  timestamp: string;
}

/**
 * Waiter call cancelled SSE event payload
 */
export interface WaiterCallCancelledEvent {
  callId: string;
  timestamp: string;
}

/**
 * Order created SSE event payload
 */
export interface OrderCreatedEvent {
  id: string;
  orderNumber: number;
  orderCode: string;
  orderType: OrderType;
  tableId: string | null;
  waiterId: string | null;
  totalAmount: string;
  timestamp: string;
}

/**
 * Order updated SSE event payload
 */
export interface OrderUpdatedEvent {
  id: string;
  orderStatus: OrderStatus;
  totalAmount: string;
  timestamp: string;
}

/**
 * Order item created SSE event payload
 */
export interface OrderItemCreatedEvent {
  id: string;
  orderId: string;
  menuItemId: string;
  itemTitle: {
    en: string;
    ru: string;
    tm: string;
  };
  quantity: string;
  status: OrderItemStatus;
  menuType: MenuCategoryType;
  timestamp: string;
}

/**
 * Order item updated SSE event payload
 */
export interface OrderItemUpdatedEvent {
  id: string;
  status: OrderItemStatus;
  timestamp: string;
}

/**
 * SSE event types
 */
export type SSEEventType =
  | 'waiter:call'
  | 'waiter:call-acknowledged'
  | 'waiter:call-completed'
  | 'waiter:call-cancelled'
  | 'order:created'
  | 'order:updated'
  | 'order-item:created'
  | 'order-item:updated';

/**
 * SSE topics
 */
export type SSETopic = 'org' | 'waiter' | 'kitchen' | 'bar';

/**
 * Domain models for the Maestro Waiter App
 * Based on the backend API documentation
 */

import type {
  BillStatus,
  CustomerType,
  DayOfWeek,
  DiscountApplicableTo,
  DiscountType,
  DiscountValueType,
  MenuCategoryType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  ReasonTemplateType,
  ReservationStatus,
  Role,
  ServiceFeeType,
  WaiterCallStatus,
} from './enums';

/**
 * Multi-language translation object
 */
export interface Translation {
  en: string;
  ru: string;
  tm: string;
}

/**
 * User account information
 */
export interface Account {
  id: string;
  username: string;
  role: Role;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Zone (area in the restaurant)
 */
export interface Zone {
  id: string;
  title: Translation;
  isActive: boolean;
  x: string;
  y: string;
  tables?: Table[];
}

/**
 * Table in a zone
 */
export interface Table {
  id: string;
  title: string;
  capacity: number;
  zoneId: string;
  x: string;
  y: string;
  width: string;
  height: string;
  color: string;
  zone?: Pick<Zone, 'id' | 'title'>;
}

/**
 * Waiter call from a table
 */
export interface WaiterCall {
  id: string;
  tableId: string;
  waiterId: string | null;
  status: WaiterCallStatus;
  reason?: string;
  createdAt: string;
  acknowledgedAt: string | null;
  completedAt: string | null;
  table?: {
    id: string;
    title: string;
    zone?: Pick<Zone, 'id' | 'title'>;
  };
}

/**
 * Menu category
 */
export interface MenuCategory {
  id: string;
  title: Translation;
  type: MenuCategoryType;
  imagePath: string | null;
  parentId: string | null;
  children?: MenuCategory[];
}

/**
 * Menu item availability schedule
 */
export interface MenuItemAvailability {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

/**
 * Extra/add-on for menu items
 */
export interface Extra {
  id: string;
  title: Translation;
  description?: Translation;
  actualPrice: string;
  isActive: boolean;
}

/**
 * Menu item
 */
export interface MenuItem {
  id: string;
  title: Translation;
  description?: Translation;
  price: string;
  categoryId: string;
  imagePath: string | null;
  isActive: boolean;
  isGroup: boolean;
  timeForPreparation?: string;
  availability?: MenuItemAvailability[];
  category?: Pick<MenuCategory, 'id' | 'title' | 'type'>;
  extras?: Extra[];
}

/**
 * Customer address
 */
export interface CustomerAddress {
  address: string;
  isDefault: boolean;
}

/**
 * Customer
 */
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  deposit: string;
  credit: string;
  dateOfBirth?: string;
  customerType: CustomerType;
  addresses?: CustomerAddress[];
}

/**
 * Extra attached to an order item
 */
export interface OrderItemExtra {
  extraId: string;
  quantity: number;
  title?: Translation;
  price?: string;
}

/**
 * Order item
 */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  stockId?: string | null;
  quantity: string;
  status: OrderItemStatus;
  itemTitle: Translation;
  itemPrice: string;
  subtotal: string;
  notes?: string;
  menuType?: MenuCategoryType;
  declineReason?: string;
  cancelReason?: string;
  createdAt: string;
  order?: Pick<Order, 'id' | 'orderCode' | 'tableId'>;
  menuItem?: Pick<MenuItem, 'id' | 'title' | 'price' | 'imagePath'>;
  extras?: OrderItemExtra[];
}

/**
 * Order
 */
export interface Order {
  id: string;
  orderNumber: number;
  orderCode: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  totalAmount: string;
  tableId: string | null;
  waiterId: string | null;
  issuedById: string;
  customerId?: string | null;
  serviceFeeId?: string | null;
  serviceFeeTitle?: Translation;
  serviceFeeType?: ServiceFeeType;
  serviceFeePercent?: string;
  serviceFeeAmount?: string;
  description?: string;
  notes?: string;
  address?: string;
  pickupTime?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
  table?: Pick<Table, 'id' | 'title'>;
  waiter?: Pick<Account, 'id' | 'username'>;
  customer?: Customer;
  orderItems?: OrderItem[];
}

/**
 * Bill item
 */
export interface BillItem {
  orderItemId: string;
  quantity: number;
  price: string;
}

/**
 * Bill
 */
export interface Bill {
  id: string;
  orderId: string;
  customerId?: string | null;
  subtotal: string;
  discountAmount: string;
  serviceFeeAmount?: string;
  totalAmount: string;
  paidAmount: string;
  status?: BillStatus;
  notes?: string;
  createdAt: string;
  order?: Order;
  customer?: Customer;
  billItems?: BillItem[];
  payments?: Payment[];
  discounts?: BillDiscount[];
}

/**
 * Discount applied to a bill
 */
export interface BillDiscount {
  discountId: string;
  amount: string;
  discount?: Discount;
}

/**
 * Payment
 */
export interface Payment {
  id: string;
  billId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Discount
 */
export interface Discount {
  id: string;
  title: Translation;
  description?: Translation;
  discountType: DiscountType;
  discountValueType: DiscountValueType;
  discountValue: string;
  applicableTo: DiscountApplicableTo;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Service fee
 */
export interface ServiceFee {
  id: string;
  title: Translation;
  type: ServiceFeeType;
  percent?: string;
  amount?: string;
  orderType?: OrderType;
}

/**
 * Reservation
 */
export interface Reservation {
  id: string;
  reservationNumber: string;
  status: ReservationStatus;
  dateTime: string;
  numberOfGuests: number;
  tableId: string;
  customerId?: string | null;
  notes?: string;
  table?: Table;
  customer?: Customer;
}

/**
 * Reason template for cancellation, refund, or discount
 */
export interface ReasonTemplate {
  id: string;
  name: string;
  type: ReasonTemplateType;
  description?: string;
}

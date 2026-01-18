/**
 * Enums for the Maestro Waiter App
 * Based on the backend API documentation
 */

/**
 * User roles in the system
 */
export enum Role {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  BAR = 'bar',
  KITCHEN = 'kitchen',
}

/**
 * Type of order
 */
export enum OrderType {
  DELIVERY = 'Delivery',
  DINE_IN = 'Dine-in',
  TO_GO = 'To go',
}

/**
 * Status of an order
 */
export enum OrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

/**
 * Status of an individual order item
 */
export enum OrderItemStatus {
  PENDING = 'Pending',
  SENT_TO_PREPARE = 'SentToPrepare',
  PREPARING = 'Preparing',
  READY = 'Ready',
  SERVED = 'Served',
  DECLINED = 'Declined',
  CANCELED = 'Canceled',
}

/**
 * Status of a waiter call
 */
export enum WaiterCallStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Type of menu category (determines which station prepares items)
 */
export enum MenuCategoryType {
  BAR = 'bar',
  KITCHEN = 'kitchen',
}

/**
 * Payment methods available
 */
export enum PaymentMethod {
  CASH = 'Cash',
  BANK_CARD = 'BankCard',
  GAPJYK_PAY = 'GapjykPay',
  CUSTOMER_ACCOUNT = 'CustomerAccount',
}

/**
 * Status of a reservation
 */
export enum ReservationStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed',
}

/**
 * Type of customer
 */
export enum CustomerType {
  NEW = 'New',
  REGULAR = 'Regular',
  VIP = 'VIP',
}

/**
 * Device type for authentication
 */
export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

/**
 * Device platform for authentication
 */
export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  WEB = 'web',
}

/**
 * Sort order direction
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Service fee type
 */
export enum ServiceFeeType {
  PERCENTAGE = 'Percentage',
  FIXED = 'Fixed',
}

/**
 * Discount type (how discount is triggered)
 */
export enum DiscountType {
  MANUAL = 'Manual',
  AUTOMATIC = 'Automatic',
}

/**
 * Discount value type (how discount amount is calculated)
 */
export enum DiscountValueType {
  PERCENTAGE = 'Percentage',
  FIXED = 'Fixed',
}

/**
 * What the discount applies to
 */
export enum DiscountApplicableTo {
  ORDER = 'Order',
  ITEM = 'Item',
}

/**
 * Bill status
 */
export enum BillStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

/**
 * Reason template types
 */
export enum ReasonTemplateType {
  DISCOUNT = 'discount',
  REFUND = 'refund',
  CANCELLATION = 'cancellation',
}

/**
 * Days of the week for availability
 */
export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

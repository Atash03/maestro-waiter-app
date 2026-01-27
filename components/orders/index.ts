/**
 * Orders Components
 *
 * Reusable components for order management in the Maestro Waiter App.
 */

// OrderCard - Order card component for orders list
export {
  countItemsByStatus,
  formatOrderDate,
  formatPrice as formatOrderPrice,
  formatTimeSince,
  getItemCount,
  getOrderStatusBadgeVariant,
  getOrderStatusLabel,
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
  getTranslatedText as getOrderTranslatedText,
  OrderCard,
  type OrderCardProps,
} from './OrderCard';
// OrderItemStatus - Order item status indicator with actions
export {
  canCancelItem,
  canMarkAsServed,
  getOrderItemBadgeVariant,
  getOrderItemStatusColor,
  getOrderItemStatusLabel,
  isItemCancelled,
  isTerminalStatus,
  OrderItemStatus,
  OrderItemStatusCompact,
  type OrderItemStatusCompactProps,
  type OrderItemStatusProps,
} from './OrderItemStatus';
// OrderSummary - Live order summary component
// Default export
export {
  calculateExtrasTotal,
  calculateItemSubtotal,
  calculateOrderTotal,
  default,
  formatPrice,
  getExtrasText,
  getFormattedPrice,
  // Helper functions
  getTranslatedText,
  // Types
  type LocalOrderItem,
  OrderSummary,
  OrderSummaryItem,
  type OrderSummaryItemProps,
  type OrderSummaryProps,
  parsePrice,
  type ServiceFeeInfo,
} from './OrderSummary';
// SendToKitchenModal - Confirmation modal for sending orders to kitchen
export {
  SendToKitchenModal,
  type SendToKitchenModalProps,
  type SendToKitchenModalState,
} from './SendToKitchenModal';

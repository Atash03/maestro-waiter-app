/**
 * Orders Components
 *
 * Reusable components for order management in the Maestro Waiter App.
 */

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

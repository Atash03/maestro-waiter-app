/**
 * Live Order Summary Component
 *
 * A reusable component for displaying and managing order items in real-time.
 * Features:
 * - Fixed sidebar (tablet) or bottom sheet (phone)
 * - Real-time updates as items are added
 * - Each item shows: name, quantity, customizations, price
 * - Edit icon to modify item
 * - Swipe-to-delete with confirmation
 * - Running subtotal, service fee display, and total amount
 */

import { useCallback, useState } from 'react';
import {
  Alert,
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Extra, MenuItem, OrderItemExtra, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

/**
 * Order item in the local order state (before sending to API)
 */
export interface LocalOrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  extras: OrderItemExtra[];
  unitPrice: number;
  subtotal: number;
}

/**
 * Service fee information for display
 */
export interface ServiceFeeInfo {
  id: string;
  title: Translation;
  amount: number;
  percent?: string;
}

/**
 * Props for the OrderSummaryItem component
 */
export interface OrderSummaryItemProps {
  item: LocalOrderItem;
  onEdit?: (item: LocalOrderItem) => void;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  availableExtras?: Extra[];
  confirmBeforeRemove?: boolean;
  testID?: string;
}

/**
 * Props for the OrderSummary component
 */
export interface OrderSummaryProps {
  items: LocalOrderItem[];
  total: number;
  subtotal?: number;
  serviceFee?: ServiceFeeInfo | null;
  onEditItem?: (item: LocalOrderItem) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onSendOrder: () => void;
  isSending?: boolean;
  isTablet?: boolean;
  variant?: 'sidebar' | 'bottomSheet';
  availableExtras?: Extra[];
  confirmBeforeRemove?: boolean;
  sendButtonText?: string;
  emptyMessage?: string;
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get translated text from a Translation object
 */
export function getTranslatedText(
  translation: Translation | undefined,
  fallback = '',
  preferredLang: 'en' | 'ru' | 'tm' = 'en'
): string {
  if (!translation) return fallback;
  return (
    translation[preferredLang] || translation.en || translation.ru || translation.tm || fallback
  );
}

/**
 * Parse price string to number
 */
export function parsePrice(price: string | undefined): number {
  if (!price) return 0;
  const parsed = Number.parseFloat(price);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format price for display with 2 decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Get formatted price with currency symbol
 */
export function getFormattedPrice(price: number | string | undefined): string {
  const numPrice = typeof price === 'number' ? price : parsePrice(price as string);
  return `$${formatPrice(numPrice)}`;
}

/**
 * Calculate extras total for an order item
 */
export function calculateExtrasTotal(extras: OrderItemExtra[], availableExtras: Extra[]): number {
  return extras.reduce((total, orderExtra) => {
    const extra = availableExtras.find((e) => e.id === orderExtra.extraId);
    if (extra) {
      return total + parsePrice(extra.actualPrice) * orderExtra.quantity;
    }
    // Use the price from the OrderItemExtra if available (fallback)
    if (orderExtra.price) {
      return total + parsePrice(orderExtra.price) * orderExtra.quantity;
    }
    return total;
  }, 0);
}

/**
 * Calculate order item subtotal including extras
 */
export function calculateItemSubtotal(item: LocalOrderItem, availableExtras: Extra[]): number {
  const basePrice = item.unitPrice * item.quantity;
  const extrasPrice = calculateExtrasTotal(item.extras, availableExtras) * item.quantity;
  return basePrice + extrasPrice;
}

/**
 * Calculate total order amount
 */
export function calculateOrderTotal(items: LocalOrderItem[]): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

/**
 * Get formatted extras text for display
 */
export function getExtrasText(extras: OrderItemExtra[]): string {
  if (extras.length === 0) return '';
  return extras.map((e) => getTranslatedText(e.title, 'Extra')).join(', ');
}

// ============================================================================
// Order Summary Item Component
// ============================================================================

export function OrderSummaryItem({
  item,
  onEdit,
  onRemove,
  onUpdateQuantity,
  confirmBeforeRemove = false,
  testID,
}: OrderSummaryItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const handleRemove = useCallback(() => {
    if (confirmBeforeRemove) {
      Alert.alert('Remove Item', `Remove "${getTranslatedText(item.menuItem.title)}" from order?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(item.id),
        },
      ]);
    } else {
      onRemove(item.id);
    }
  }, [confirmBeforeRemove, item, onRemove]);

  const handleDecrease = useCallback(() => {
    if (item.quantity > MIN_QUANTITY) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  }, [item, onUpdateQuantity]);

  const handleIncrease = useCallback(() => {
    if (item.quantity < MAX_QUANTITY) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  }, [item, onUpdateQuantity]);

  const canDecrease = item.quantity > MIN_QUANTITY;
  const canIncrease = item.quantity < MAX_QUANTITY;
  const extrasText = getExtrasText(item.extras);

  return (
    <Animated.View
      entering={SlideInRight.duration(200)}
      exiting={SlideOutRight.duration(200)}
      layout={Layout.springify()}
      style={[animatedStyle, styles.orderItem, { borderBottomColor: colors.border }]}
      testID={testID ?? `order-item-${item.id}`}
    >
      <TouchableOpacity
        style={styles.orderItemTouchable}
        onPress={onEdit ? () => onEdit(item) : undefined}
        onPressIn={onEdit ? handlePressIn : undefined}
        onPressOut={onEdit ? handlePressOut : undefined}
        disabled={!onEdit}
        activeOpacity={0.8}
      >
        <View style={styles.orderItemContent}>
          <View style={styles.orderItemHeader}>
            <ThemedText style={styles.orderItemTitle} numberOfLines={1}>
              {getTranslatedText(item.menuItem.title)}
            </ThemedText>
            <View style={styles.orderItemActions}>
              {onEdit && (
                <TouchableOpacity
                  testID={`edit-item-${item.id}`}
                  onPress={() => onEdit(item)}
                  style={styles.editButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText style={[styles.editButtonText, { color: colors.textSecondary }]}>
                    ✎
                  </ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID={`remove-item-${item.id}`}
                onPress={handleRemove}
                style={styles.removeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ThemedText style={[styles.removeButtonText, { color: colors.error }]}>
                  ✕
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Extras display */}
          {extrasText.length > 0 && (
            <ThemedText
              style={[styles.orderItemExtras, { color: colors.textSecondary }]}
              numberOfLines={1}
              testID={`extras-${item.id}`}
            >
              + {extrasText}
            </ThemedText>
          )}

          {/* Notes */}
          {item.notes && (
            <ThemedText
              style={[styles.orderItemNotes, { color: colors.textMuted }]}
              numberOfLines={1}
              testID={`notes-${item.id}`}
            >
              Note: {item.notes}
            </ThemedText>
          )}

          <View style={styles.orderItemFooter}>
            {/* Quantity controls */}
            <View style={styles.quantityControls}>
              <TouchableOpacity
                testID={`decrease-qty-${item.id}`}
                style={[
                  styles.quantityButton,
                  { backgroundColor: colors.backgroundSecondary },
                  !canDecrease && styles.quantityButtonDisabled,
                ]}
                onPress={handleDecrease}
                disabled={!canDecrease}
              >
                <ThemedText style={[styles.quantityButtonText, !canDecrease && { opacity: 0.3 }]}>
                  −
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.quantityText} testID={`quantity-${item.id}`}>
                {item.quantity}
              </ThemedText>
              <TouchableOpacity
                testID={`increase-qty-${item.id}`}
                style={[
                  styles.quantityButton,
                  { backgroundColor: colors.backgroundSecondary },
                  !canIncrease && styles.quantityButtonDisabled,
                ]}
                onPress={handleIncrease}
                disabled={!canIncrease}
              >
                <ThemedText style={[styles.quantityButtonText, !canIncrease && { opacity: 0.3 }]}>
                  +
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Subtotal */}
            <ThemedText style={styles.orderItemSubtotal} testID={`subtotal-${item.id}`}>
              {getFormattedPrice(item.subtotal)}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Order Summary Empty State Component
// ============================================================================

interface OrderSummaryEmptyProps {
  message?: string;
  testID?: string;
}

function OrderSummaryEmpty({ message, testID }: OrderSummaryEmptyProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.orderSummaryEmpty, { backgroundColor: colors.backgroundSecondary }]}
      testID={testID ?? 'order-summary-empty'}
    >
      <ThemedText style={[styles.orderSummaryEmptyIcon]}>🛒</ThemedText>
      <ThemedText style={[styles.orderSummaryEmptyText, { color: colors.textMuted }]}>
        {message ?? 'Tap items to add to order'}
      </ThemedText>
    </Animated.View>
  );
}

// ============================================================================
// Order Summary Totals Component
// ============================================================================

interface OrderSummaryTotalsProps {
  itemCount: number;
  subtotal: number;
  serviceFee?: ServiceFeeInfo | null;
  total: number;
  onSendOrder: () => void;
  isSending?: boolean;
  sendButtonText?: string;
  disabled?: boolean;
  testID?: string;
}

function OrderSummaryTotals({
  itemCount,
  subtotal,
  serviceFee,
  total,
  onSendOrder,
  isSending = false,
  sendButtonText = 'Send to Kitchen',
  disabled = false,
  testID,
}: OrderSummaryTotalsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const hasServiceFee = serviceFee && serviceFee.amount > 0;
  const showSubtotal = hasServiceFee && subtotal !== total;

  return (
    <View
      style={[styles.orderTotals, { borderTopColor: colors.border }]}
      testID={testID ?? 'order-totals'}
    >
      {/* Subtotal row (only if different from total due to service fee) */}
      {showSubtotal && (
        <View style={styles.totalRow} testID="subtotal-row">
          <ThemedText style={[styles.subtotalLabel, { color: colors.textSecondary }]}>
            Subtotal
          </ThemedText>
          <ThemedText style={[styles.subtotalValue, { color: colors.textSecondary }]}>
            {getFormattedPrice(subtotal)}
          </ThemedText>
        </View>
      )}

      {/* Service fee row */}
      {hasServiceFee && (
        <View style={styles.totalRow} testID="service-fee-row">
          <ThemedText style={[styles.serviceFeeLabel, { color: colors.textSecondary }]}>
            {getTranslatedText(serviceFee.title, 'Service Fee')}
            {serviceFee.percent && ` (${serviceFee.percent}%)`}
          </ThemedText>
          <ThemedText style={[styles.serviceFeeValue, { color: colors.textSecondary }]}>
            {getFormattedPrice(serviceFee.amount)}
          </ThemedText>
        </View>
      )}

      {/* Total row */}
      <View style={styles.totalRow} testID="total-row">
        <ThemedText style={styles.totalLabel}>
          {hasServiceFee ? 'Total' : `Items (${itemCount})`}
        </ThemedText>
        <ThemedText style={styles.totalValue} testID="total-amount">
          {getFormattedPrice(total)}
        </ThemedText>
      </View>

      {/* Send button */}
      <Button
        testID="send-order-button"
        variant="primary"
        size="lg"
        onPress={onSendOrder}
        loading={isSending}
        disabled={disabled || isSending || itemCount === 0}
        fullWidth
      >
        {sendButtonText}
      </Button>
    </View>
  );
}

// ============================================================================
// Main Order Summary Component
// ============================================================================

export function OrderSummary({
  items,
  total,
  subtotal,
  serviceFee,
  onEditItem,
  onRemoveItem,
  onUpdateQuantity,
  onSendOrder,
  isSending = false,
  isTablet = false,
  variant = 'sidebar',
  availableExtras = [],
  confirmBeforeRemove = false,
  sendButtonText = 'Send to Kitchen',
  emptyMessage,
  testID,
}: OrderSummaryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [_listHeight, setListHeight] = useState(0);

  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  }, []);

  // Calculate item count
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Use provided subtotal or calculate from items
  const actualSubtotal = subtotal ?? calculateOrderTotal(items);

  // Show empty state if no items
  if (items.length === 0) {
    return <OrderSummaryEmpty message={emptyMessage} testID={`${testID}-empty`} />;
  }

  const isBottomSheet = variant === 'bottomSheet' && !isTablet;

  return (
    <View
      style={[
        styles.orderSummary,
        isTablet && styles.orderSummaryTablet,
        isBottomSheet && styles.orderSummaryBottomSheet,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
      testID={testID ?? 'order-summary'}
    >
      {/* Order items list */}
      <ScrollView
        style={styles.orderItemsList}
        contentContainerStyle={styles.orderItemsListContent}
        showsVerticalScrollIndicator={false}
        testID="order-items-list"
        onLayout={handleListLayout}
      >
        {items.map((item) => (
          <OrderSummaryItem
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onRemove={onRemoveItem}
            onUpdateQuantity={onUpdateQuantity}
            availableExtras={availableExtras}
            confirmBeforeRemove={confirmBeforeRemove}
          />
        ))}
      </ScrollView>

      {/* Order totals and actions */}
      <OrderSummaryTotals
        itemCount={itemCount}
        subtotal={actualSubtotal}
        serviceFee={serviceFee}
        total={total}
        onSendOrder={onSendOrder}
        isSending={isSending}
        sendButtonText={sendButtonText}
        disabled={items.length === 0}
      />
    </View>
  );
}

// Default export
export default OrderSummary;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  orderSummary: {
    flex: 1,
    borderTopWidth: 1,
  },
  orderSummaryTablet: {
    borderTopWidth: 0,
    borderLeftWidth: 1,
  },
  orderSummaryBottomSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  orderSummaryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  orderSummaryEmptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  orderSummaryEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  orderItemsList: {
    flex: 1,
  },
  orderItemsListContent: {
    paddingBottom: Spacing.sm,
  },
  orderItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  orderItemTouchable: {
    flex: 1,
  },
  orderItemContent: {
    gap: 4,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  orderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontSize: 14,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemExtras: {
    fontSize: 12,
  },
  orderItemNotes: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  orderItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  orderItemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderTotals: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
  },
  subtotalValue: {
    fontSize: 14,
  },
  serviceFeeLabel: {
    fontSize: 14,
  },
  serviceFeeValue: {
    fontSize: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});

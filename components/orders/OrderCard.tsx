/**
 * Order Card Component
 *
 * Displays an order summary in a card format for the orders list.
 * Shows order code, table/customer info, status, type, total amount, and time.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { BorderRadius, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OrderItemStatus, OrderStatus, OrderType } from '@/src/types/enums';
import type { Order, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface OrderCardProps {
  /** The order to display */
  order: Order;
  /** Called when the card is pressed */
  onPress?: (order: Order) => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get translated text from Translation object
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
 * Get badge variant for order status
 */
export function getOrderStatusBadgeVariant(status: OrderStatus): BadgeVariant {
  switch (status) {
    case OrderStatus.PENDING:
      return 'pending';
    case OrderStatus.IN_PROGRESS:
      return 'preparing';
    case OrderStatus.COMPLETED:
      return 'success';
    case OrderStatus.CANCELLED:
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get human-readable label for order status
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending';
    case OrderStatus.IN_PROGRESS:
      return 'In Progress';
    case OrderStatus.COMPLETED:
      return 'Completed';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Get badge variant for order type
 */
export function getOrderTypeBadgeVariant(orderType: OrderType): BadgeVariant {
  switch (orderType) {
    case OrderType.DINE_IN:
      return 'primary';
    case OrderType.DELIVERY:
      return 'info';
    case OrderType.TO_GO:
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get human-readable label for order type
 */
export function getOrderTypeLabel(orderType: OrderType): string {
  switch (orderType) {
    case OrderType.DINE_IN:
      return 'Dine-in';
    case OrderType.DELIVERY:
      return 'Delivery';
    case OrderType.TO_GO:
      return 'To Go';
    default:
      return orderType;
  }
}

/**
 * Format time since creation
 */
export function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m ago` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Format price for display
 */
export function formatPrice(price: string | undefined): string {
  if (!price) return '$0.00';
  const num = Number.parseFloat(price);
  if (Number.isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

/**
 * Count items by status
 */
export function countItemsByStatus(order: Order, status: OrderItemStatus): number {
  if (!order.orderItems) return 0;
  return order.orderItems.filter((item) => item.status === status).length;
}

/**
 * Get total item count for order
 */
export function getItemCount(order: Order): number {
  if (!order.orderItems) return 0;
  return order.orderItems.reduce((sum, item) => {
    const qty = Number.parseInt(item.quantity, 10);
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
}

// ============================================================================
// Component
// ============================================================================

export function OrderCard({ order, onPress, testID }: OrderCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animation
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    onPress?.(order);
  };

  // Compute display values
  const readyCount = countItemsByStatus(order, OrderItemStatus.READY);
  const itemCount = getItemCount(order);
  const tableTitle = order.table?.title;
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : null;

  // Determine location/customer display
  const locationDisplay =
    order.orderType === OrderType.DINE_IN
      ? tableTitle
        ? `Table ${tableTitle}`
        : 'Table N/A'
      : customerName || (order.orderType === OrderType.DELIVERY ? 'Delivery' : 'To Go');

  return (
    <Animated.View style={animatedStyle}>
      <Card
        pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        padding="md"
        elevated
        style={styles.card}
        testID={testID}
      >
        {/* Header Row: Order Code + Status */}
        <View style={styles.headerRow}>
          <View style={styles.orderCodeContainer}>
            <ThemedText style={styles.orderCode}>{order.orderCode}</ThemedText>
            {readyCount > 0 && (
              <View style={[styles.readyBadge, { backgroundColor: StatusColors.ready }]}>
                <ThemedText style={styles.readyBadgeText}>{readyCount} ready</ThemedText>
              </View>
            )}
          </View>
          <Badge variant={getOrderStatusBadgeVariant(order.orderStatus)} size="sm">
            {getOrderStatusLabel(order.orderStatus)}
          </Badge>
        </View>

        {/* Info Row: Location/Customer + Order Type */}
        <View style={styles.infoRow}>
          <View style={styles.locationContainer}>
            <ThemedText style={[styles.locationText, { color: colors.text }]}>
              {locationDisplay}
            </ThemedText>
          </View>
          <Badge variant={getOrderTypeBadgeVariant(order.orderType)} size="sm">
            {getOrderTypeLabel(order.orderType)}
          </Badge>
        </View>

        {/* Footer Row: Item Count, Total, Time */}
        <View style={styles.footerRow}>
          <ThemedText style={[styles.itemCount, { color: colors.textSecondary }]}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </ThemedText>
          <ThemedText style={[styles.totalAmount, { color: colors.text }]}>
            {formatPrice(order.totalAmount)}
          </ThemedText>
          <ThemedText style={[styles.timeAgo, { color: colors.textMuted }]}>
            {formatTimeSince(order.createdAt)}
          </ThemedText>
        </View>
      </Card>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '700',
  },
  readyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  readyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 12,
    flex: 1,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: Spacing.md,
  },
  timeAgo: {
    fontSize: 12,
  },
});

export default OrderCard;

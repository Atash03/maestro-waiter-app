/**
 * Order Card Component
 *
 * Displays an order summary in a card format for the orders list.
 * Shows order code, date/time, location (zone + table), and status
 * with a colored left accent strip indicating order status.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  BorderRadius,
  Colors,
  OrderAccentColors,
  OrderStatusBadgeColors,
  Spacing,
} from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { type OrderItemStatus, OrderStatus, OrderType } from '@/src/types/enums';
import type { Order, Translation } from '@/src/types/models';
import { getTranslatedText } from '@/src/utils/translations';

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
// Helper Functions (exported for use by other components via index.ts)
// ============================================================================

/**
 * Get translated text from Translation object
 * @deprecated Use getTranslatedText from '@/src/utils/translations' instead
 */
export { getTranslatedText };

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

/**
 * Format date for order card display (e.g. "2025.12.04 - 12:04")
 */
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} - ${hours}:${minutes}`;
}

// ============================================================================
// Private Helpers
// ============================================================================

function getAccentColor(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.IN_PROGRESS:
      return OrderAccentColors.inProgress;
    case OrderStatus.COMPLETED:
      return OrderAccentColors.completed;
    case OrderStatus.CANCELLED:
      return OrderAccentColors.cancelled;
    case OrderStatus.PENDING:
    default:
      return OrderAccentColors.pending;
  }
}

function getStatusBadgeColors(
  status: OrderStatus,
  scheme: 'light' | 'dark'
): { text: string; bg: string } {
  const palette = OrderStatusBadgeColors[scheme];
  switch (status) {
    case OrderStatus.IN_PROGRESS:
      return palette.inProgress;
    case OrderStatus.COMPLETED:
      return palette.completed;
    case OrderStatus.CANCELLED:
      return palette.cancelled;
    case OrderStatus.PENDING:
    default:
      return palette.pending;
  }
}

// ============================================================================
// Component
// ============================================================================

export function OrderCard({ order, onPress, testID }: OrderCardProps) {
  const colorScheme = useEffectiveColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    onPress?.(order);
  };

  const accentColor = getAccentColor(order.orderStatus);
  const badgeColors = getStatusBadgeColors(order.orderStatus, colorScheme);

  // Build location parts: zone title, table title
  const zoneTitle = order.table?.zone?.title ? getTranslatedText(order.table.zone.title, '') : '';
  const tableTitle = order.table?.title ?? '';

  const locationParts: string[] = [];
  if (zoneTitle) locationParts.push(zoneTitle);
  if (tableTitle) locationParts.push(tableTitle);

  // Fallback for non-dine-in orders
  const hasLocation = locationParts.length > 0;
  const fallbackLocation =
    order.orderType === OrderType.DELIVERY
      ? 'Delivery'
      : order.orderType === OrderType.TO_GO
        ? 'To Go'
        : '';

  // Theme-aware colors
  const cardBg = isDark ? colors.backgroundSecondary : '#fcfcfc';
  const cardBorder = isDark ? colors.border : '#e8e8e8';
  const orderCodeColor = isDark ? colors.text : '#000000';
  const dateColor = isDark ? colors.textMuted : '#838383';
  const locationColor = isDark ? colors.textSecondary : '#646464';
  const dotColor = isDark ? colors.textMuted : '#8D8D8D';

  return (
    <Card
      pressable
      onPress={handlePress}
      padding="none"
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}
      testID={testID}
    >
      <View style={styles.cardInner}>
        {/* Left accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

        {/* Content */}
        <View style={styles.content}>
          {/* Row 1: Order code + date */}
          <View style={styles.orderInfoRow}>
            <ThemedText style={[styles.orderCode, { color: orderCodeColor }]}>
              Order: #{order.orderNumber}
            </ThemedText>
            <ThemedText style={[styles.dateText, { color: dateColor }]}>
              {formatOrderDate(order.createdAt)}
            </ThemedText>
          </View>

          {/* Row 2: Location (zone · table) */}
          {hasLocation ? (
            <View style={styles.locationRow}>
              {locationParts.map((part, index) => (
                <View key={part} style={styles.locationRow}>
                  {index > 0 && (
                    <View style={[styles.dotSeparator, { backgroundColor: dotColor }]} />
                  )}
                  <ThemedText style={[styles.locationText, { color: locationColor }]}>
                    {part}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : fallbackLocation ? (
            <ThemedText style={[styles.locationText, { color: locationColor }]}>
              {fallbackLocation}
            </ThemedText>
          ) : null}

          {/* Row 3: Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
            <ThemedText style={[styles.statusBadgeText, { color: badgeColors.text }]}>
              {getOrderStatusLabel(order.orderStatus)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
  },
  accentStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.xl,
    paddingRight: 10,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.04,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.04,
  },
});

export default OrderCard;

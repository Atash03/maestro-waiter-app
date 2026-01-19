/**
 * TableInfoPopup Component
 *
 * A popup overlay that displays detailed table information:
 * - Table name and capacity
 * - Current guest count
 * - Time seated (for occupied tables)
 * - Active order summary (if exists)
 * - Quick actions: View Order, New Order, Call Info
 *
 * Triggered by long-press on a table in the floor plan.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BorderRadius, Spacing, StatusColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Order, Table, Translation } from '@/src/types/models';
import type { TableItemData, TableStatus } from './TableItem';
import { getStatusColor } from './TableItem';

// ============================================================================
// Types
// ============================================================================

export interface TableInfoPopupProps {
  /** Whether the popup is visible */
  visible: boolean;
  /** Callback when the popup should close */
  onClose: () => void;
  /** The table to display info for */
  table: TableItemData | null;
  /** Active order for this table (if any) */
  activeOrder?: Order | null;
  /** Callback when "View Order" is pressed */
  onViewOrder?: (order: Order) => void;
  /** Callback when "New Order" is pressed */
  onNewOrder?: (table: Table) => void;
  /** Callback when "Call Info" is pressed (view waiter calls for this table) */
  onCallInfo?: (table: Table) => void;
  /** Time when guests were seated (ISO string) */
  seatedAt?: string | null;
  /** Test ID prefix for testing */
  testID?: string;
}

export interface OrderSummary {
  itemCount: number;
  totalAmount: string;
  orderCode: string;
  status: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display text for a translation object based on current language
 * Defaults to English if translation is missing
 */
function getTranslatedText(translation: Translation | undefined, fallback = ''): string {
  if (!translation) return fallback;
  // TODO: Use language from settings store when implemented
  return translation.en || translation.ru || translation.tm || fallback;
}

/**
 * Format time duration from a date string to now
 */
function formatDuration(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Get badge variant for table status
 */
function getStatusBadgeVariant(
  status: TableStatus
): 'available' | 'occupied' | 'reserved' | 'warning' {
  switch (status) {
    case 'available':
      return 'available';
    case 'occupied':
      return 'occupied';
    case 'reserved':
      return 'reserved';
    case 'needsAttention':
      return 'warning';
    default:
      return 'available';
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: TableStatus): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'occupied':
      return 'Occupied';
    case 'reserved':
      return 'Reserved';
    case 'needsAttention':
      return 'Needs Attention';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate order summary from an order
 */
function calculateOrderSummary(order: Order | null | undefined): OrderSummary | null {
  if (!order) return null;

  const itemCount = order.orderItems?.length ?? 0;

  return {
    itemCount,
    totalAmount: order.totalAmount,
    orderCode: order.orderCode,
    status: order.orderStatus,
  };
}

// ============================================================================
// Component
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TableInfoPopup({
  visible,
  onClose,
  table,
  activeOrder,
  onViewOrder,
  onNewOrder,
  onCallInfo,
  seatedAt,
  testID = 'table-info-popup',
}: TableInfoPopupProps) {
  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'overlay');

  // Derived values
  const orderSummary = useMemo(() => calculateOrderSummary(activeOrder), [activeOrder]);
  const seatedDuration = useMemo(() => formatDuration(seatedAt), [seatedAt]);
  const statusColor = table ? getStatusColor(table.status) : StatusColors.available;

  // Animation effects
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0.9, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity, backdropOpacity]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Handlers
  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleViewOrder = useCallback(() => {
    if (activeOrder && onViewOrder) {
      onViewOrder(activeOrder);
    }
  }, [activeOrder, onViewOrder]);

  const handleNewOrder = useCallback(() => {
    if (table && onNewOrder) {
      onNewOrder(table);
    }
  }, [table, onNewOrder]);

  const handleCallInfo = useCallback(() => {
    if (table && onCallInfo) {
      onCallInfo(table);
    }
  }, [table, onCallInfo]);

  // Don't render if not visible or no table
  if (!visible || !table) {
    return null;
  }

  const showOrderSection = orderSummary !== null;
  const showSeatedTime = table.status === 'occupied' && seatedAt;
  const hasActiveOrder = activeOrder !== null && activeOrder !== undefined;

  return (
    <View style={styles.overlay} testID={testID}>
      {/* Backdrop */}
      <AnimatedPressable
        style={[styles.backdrop, { backgroundColor: overlayColor }, backdropAnimatedStyle]}
        onPress={handleBackdropPress}
        testID={`${testID}-backdrop`}
      />

      {/* Content */}
      <Animated.View
        style={[styles.content, { backgroundColor }, contentAnimatedStyle]}
        testID={`${testID}-content`}
      >
        {/* Header with table name and status */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={[styles.tableName, { color: textColor }]}>{table.title}</Text>
          </View>
          <Badge variant={getStatusBadgeVariant(table.status)} size="sm">
            {getStatusLabel(table.status)}
          </Badge>
        </View>

        {/* Table Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Capacity</Text>
            <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-capacity`}>
              {table.capacity} seats
            </Text>
          </View>

          {table.guestCount !== undefined && table.guestCount > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Guests</Text>
              <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-guests`}>
                {table.guestCount}
              </Text>
            </View>
          )}

          {showSeatedTime && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Time Seated</Text>
              <Text
                style={[styles.infoValue, { color: textColor }]}
                testID={`${testID}-seated-time`}
              >
                {seatedDuration}
              </Text>
            </View>
          )}

          {table.zone && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Zone</Text>
              <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-zone`}>
                {getTranslatedText(table.zone.title, 'Unknown')}
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary Section */}
        {showOrderSection && (
          <View style={[styles.orderSection, { borderTopColor: borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Active Order</Text>
            <View style={styles.orderSummary}>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, { color: textSecondaryColor }]}>Order Code</Text>
                <Text
                  style={[styles.orderValue, { color: textColor }]}
                  testID={`${testID}-order-code`}
                >
                  #{orderSummary.orderCode}
                </Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, { color: textSecondaryColor }]}>Items</Text>
                <Text
                  style={[styles.orderValue, { color: textColor }]}
                  testID={`${testID}-item-count`}
                >
                  {orderSummary.itemCount}
                </Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, { color: textSecondaryColor }]}>Total</Text>
                <Text
                  style={[styles.orderTotal, { color: textColor }]}
                  testID={`${testID}-order-total`}
                >
                  {orderSummary.totalAmount} TMT
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: borderColor }]}>
          {hasActiveOrder && onViewOrder && (
            <Button
              variant="primary"
              size="sm"
              onPress={handleViewOrder}
              style={styles.actionButton}
              testID={`${testID}-view-order`}
            >
              View Order
            </Button>
          )}

          {onNewOrder && (
            <Button
              variant={hasActiveOrder ? 'outline' : 'primary'}
              size="sm"
              onPress={handleNewOrder}
              style={styles.actionButton}
              testID={`${testID}-new-order`}
            >
              {hasActiveOrder ? 'Add Items' : 'New Order'}
            </Button>
          )}

          {table.hasPendingCall && onCallInfo && (
            <Button
              variant="outline"
              size="sm"
              onPress={handleCallInfo}
              style={[styles.actionButton, { borderColor: StatusColors.needsAttention }]}
              textStyle={{ color: StatusColors.needsAttention }}
              testID={`${testID}-call-info`}
            >
              View Call
            </Button>
          )}
        </View>

        {/* Close button */}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
          testID={`${testID}-close`}
        >
          <Text style={[styles.closeButtonText, { color: textSecondaryColor }]}>Close</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '85%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tableName: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  orderSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  orderSummary: {
    gap: Spacing.xs,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 13,
  },
  orderValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 0,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TableInfoPopup;

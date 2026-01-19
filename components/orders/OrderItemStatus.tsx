/**
 * Order Item Status Component
 *
 * Displays the status of an order item with visual indicators and action buttons.
 * Supports swipe actions for quick status updates.
 *
 * Features:
 * - Visual status indicator with color-coding
 * - Status badge showing current state
 * - Mark as Served button (when item is Ready)
 * - Cancel item button (when item can be cancelled)
 * - Shows decline/cancel reason if applicable
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BorderRadius, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OrderItemStatus as OrderItemStatusEnum } from '@/src/types/enums';

// ============================================================================
// Types
// ============================================================================

export interface OrderItemStatusProps {
  /** Current status of the order item */
  status: OrderItemStatusEnum;
  /** Decline reason if the item was declined */
  declineReason?: string | null;
  /** Cancel reason if the item was cancelled */
  cancelReason?: string | null;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Callback when mark as served is pressed */
  onMarkServed?: () => void;
  /** Callback when cancel is pressed */
  onCancel?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get badge variant for order item status
 */
export function getOrderItemBadgeVariant(status: OrderItemStatusEnum): BadgeVariant {
  switch (status) {
    case OrderItemStatusEnum.PENDING:
      return 'pending';
    case OrderItemStatusEnum.SENT_TO_PREPARE:
      return 'warning';
    case OrderItemStatusEnum.PREPARING:
      return 'preparing';
    case OrderItemStatusEnum.READY:
      return 'ready';
    case OrderItemStatusEnum.SERVED:
      return 'default';
    case OrderItemStatusEnum.DECLINED:
    case OrderItemStatusEnum.CANCELED:
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get human-readable label for order item status
 */
export function getOrderItemStatusLabel(status: OrderItemStatusEnum): string {
  switch (status) {
    case OrderItemStatusEnum.PENDING:
      return 'Pending';
    case OrderItemStatusEnum.SENT_TO_PREPARE:
      return 'Sent';
    case OrderItemStatusEnum.PREPARING:
      return 'Preparing';
    case OrderItemStatusEnum.READY:
      return 'Ready';
    case OrderItemStatusEnum.SERVED:
      return 'Served';
    case OrderItemStatusEnum.DECLINED:
      return 'Declined';
    case OrderItemStatusEnum.CANCELED:
      return 'Canceled';
    default:
      return 'Unknown';
  }
}

/**
 * Get color for order item status indicator
 */
export function getOrderItemStatusColor(status: OrderItemStatusEnum): string {
  switch (status) {
    case OrderItemStatusEnum.PENDING:
      return StatusColors.pending;
    case OrderItemStatusEnum.SENT_TO_PREPARE:
      return '#EAB308'; // Yellow
    case OrderItemStatusEnum.PREPARING:
      return StatusColors.preparing;
    case OrderItemStatusEnum.READY:
      return StatusColors.ready;
    case OrderItemStatusEnum.SERVED:
      return '#9CA3AF'; // Muted gray
    case OrderItemStatusEnum.DECLINED:
    case OrderItemStatusEnum.CANCELED:
      return '#EF4444'; // Red
    default:
      return StatusColors.pending;
  }
}

/**
 * Check if item status can be marked as served
 */
export function canMarkAsServed(status: OrderItemStatusEnum): boolean {
  return status === OrderItemStatusEnum.READY;
}

/**
 * Check if item can be cancelled
 */
export function canCancelItem(status: OrderItemStatusEnum): boolean {
  return (
    status === OrderItemStatusEnum.PENDING ||
    status === OrderItemStatusEnum.SENT_TO_PREPARE ||
    status === OrderItemStatusEnum.PREPARING
  );
}

/**
 * Check if item is in a cancelled/declined state
 */
export function isItemCancelled(status: OrderItemStatusEnum): boolean {
  return status === OrderItemStatusEnum.DECLINED || status === OrderItemStatusEnum.CANCELED;
}

/**
 * Check if item is in a terminal state (served, declined, or canceled)
 */
export function isTerminalStatus(status: OrderItemStatusEnum): boolean {
  return (
    status === OrderItemStatusEnum.SERVED ||
    status === OrderItemStatusEnum.DECLINED ||
    status === OrderItemStatusEnum.CANCELED
  );
}

// ============================================================================
// Component
// ============================================================================

export function OrderItemStatus({
  status,
  declineReason,
  cancelReason,
  showActions = true,
  onMarkServed,
  onCancel,
  size = 'md',
  testID,
}: OrderItemStatusProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animation for press feedback
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  // Computed values
  const statusColor = getOrderItemStatusColor(status);
  const canServe = canMarkAsServed(status);
  const canCancel = canCancelItem(status);
  const hasReason = !!declineReason || !!cancelReason;

  // Determine badge size based on component size
  const badgeSize = size === 'lg' ? 'md' : 'sm';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={animatedStyle}
      testID={testID}
    >
      <View style={[styles.container, sizeStyles[size].container]}>
        {/* Status Indicator Dot */}
        <View style={[styles.indicatorWrapper, sizeStyles[size].indicatorWrapper]}>
          <View
            style={[
              styles.indicator,
              sizeStyles[size].indicator,
              { backgroundColor: statusColor },
              status === OrderItemStatusEnum.READY && styles.indicatorPulse,
            ]}
          />
        </View>

        {/* Status Content */}
        <View style={styles.content}>
          {/* Badge */}
          <Badge
            variant={getOrderItemBadgeVariant(status)}
            size={badgeSize}
            testID={`${testID}-badge`}
          >
            {getOrderItemStatusLabel(status)}
          </Badge>

          {/* Decline/Cancel Reason */}
          {hasReason && (
            <ThemedText
              style={[styles.reasonText, sizeStyles[size].reasonText, { color: colors.error }]}
              numberOfLines={2}
              testID={`${testID}-reason`}
            >
              {declineReason ? `Declined: ${declineReason}` : `Cancelled: ${cancelReason}`}
            </ThemedText>
          )}
        </View>

        {/* Action Buttons */}
        {showActions && (canServe || canCancel) && (
          <View style={[styles.actions, sizeStyles[size].actions]}>
            {canServe && onMarkServed && (
              <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Button
                  size={size === 'lg' ? 'md' : 'sm'}
                  variant="primary"
                  onPress={onMarkServed}
                  testID={`${testID}-serve-btn`}
                >
                  Mark Served
                </Button>
              </Pressable>
            )}
            {canCancel && onCancel && (
              <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Button
                  size={size === 'lg' ? 'md' : 'sm'}
                  variant="outline"
                  onPress={onCancel}
                  testID={`${testID}-cancel-btn`}
                >
                  Cancel
                </Button>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// Compact Variant - Just the status indicator and badge
// ============================================================================

export interface OrderItemStatusCompactProps {
  /** Current status of the order item */
  status: OrderItemStatusEnum;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Test ID for testing */
  testID?: string;
}

export function OrderItemStatusCompact({
  status,
  size = 'sm',
  testID,
}: OrderItemStatusCompactProps) {
  const statusColor = getOrderItemStatusColor(status);

  return (
    <View style={styles.compactContainer} testID={testID}>
      <View
        style={[
          styles.compactIndicator,
          size === 'sm' ? styles.compactIndicatorSm : styles.compactIndicatorMd,
          { backgroundColor: statusColor },
        ]}
      />
      <Badge variant={getOrderItemBadgeVariant(status)} size={size}>
        {getOrderItemStatusLabel(status)}
      </Badge>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const sizeStyles = {
  sm: StyleSheet.create({
    container: {
      paddingVertical: Spacing.xs,
    },
    indicatorWrapper: {
      width: 20,
    },
    indicator: {
      width: 8,
      height: 8,
    },
    reasonText: {
      fontSize: 11,
      marginTop: 2,
    },
    actions: {
      gap: Spacing.xs,
    },
  }),
  md: StyleSheet.create({
    container: {
      paddingVertical: Spacing.sm,
    },
    indicatorWrapper: {
      width: 24,
    },
    indicator: {
      width: 10,
      height: 10,
    },
    reasonText: {
      fontSize: 12,
      marginTop: 4,
    },
    actions: {
      gap: Spacing.sm,
    },
  }),
  lg: StyleSheet.create({
    container: {
      paddingVertical: Spacing.md,
    },
    indicatorWrapper: {
      width: 28,
    },
    indicator: {
      width: 12,
      height: 12,
    },
    reasonText: {
      fontSize: 13,
      marginTop: Spacing.xs,
    },
    actions: {
      gap: Spacing.sm,
    },
  }),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorWrapper: {
    alignItems: 'center',
  },
  indicator: {
    borderRadius: BorderRadius.full,
  },
  indicatorPulse: {
    // Note: For actual pulse animation, use Animated API with opacity
    // This is a placeholder for the visual distinction
    shadowColor: StatusColors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reasonText: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: Spacing.sm,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactIndicator: {
    borderRadius: BorderRadius.full,
  },
  compactIndicatorSm: {
    width: 6,
    height: 6,
  },
  compactIndicatorMd: {
    width: 8,
    height: 8,
  },
});

export default OrderItemStatus;

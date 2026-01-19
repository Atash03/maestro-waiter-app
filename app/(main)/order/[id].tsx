/**
 * Order Detail Screen
 *
 * Displays full order information including:
 * - Order header with code, status, type, and table/customer info
 * - List of order items with status badges and swipe actions
 * - Action buttons: Add Items, Mark Served, Create Bill
 * - Item-level actions: Mark as Served, Cancel item
 * - Order modification actions: Change Table, Edit Notes, Cancel Order
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { CancelItemModal } from '@/components/orders/CancelItemModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { ChangeTableModal } from '@/components/orders/ChangeTableModal';
import { EditNotesModal } from '@/components/orders/EditNotesModal';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOrder, useOrderCacheActions } from '@/src/hooks/useOrderQueries';
import { batchUpdateOrderItemStatus } from '@/src/services/api/orderItems';
import { updateOrder } from '@/src/services/api/orders';
import { OrderItemStatus, OrderStatus, OrderType } from '@/src/types/enums';
import type { OrderItem, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface OrderItemRowProps {
  item: OrderItem;
  onMarkServed?: (item: OrderItem) => void;
  onCancelItem?: (item: OrderItem) => void;
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
 * Format price for display
 */
export function formatPrice(price: string | undefined): string {
  if (!price) return '$0.00';
  const num = Number.parseFloat(price);
  if (Number.isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

/**
 * Format date time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
 * Get badge variant for order item status
 */
export function getOrderItemBadgeVariant(status: OrderItemStatus): BadgeVariant {
  switch (status) {
    case OrderItemStatus.PENDING:
      return 'pending';
    case OrderItemStatus.SENT_TO_PREPARE:
      return 'warning';
    case OrderItemStatus.PREPARING:
      return 'preparing';
    case OrderItemStatus.READY:
      return 'ready';
    case OrderItemStatus.SERVED:
      return 'default';
    case OrderItemStatus.DECLINED:
    case OrderItemStatus.CANCELED:
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get human-readable label for order item status
 */
export function getOrderItemStatusLabel(status: OrderItemStatus): string {
  switch (status) {
    case OrderItemStatus.PENDING:
      return 'Pending';
    case OrderItemStatus.SENT_TO_PREPARE:
      return 'Sent';
    case OrderItemStatus.PREPARING:
      return 'Preparing';
    case OrderItemStatus.READY:
      return 'Ready';
    case OrderItemStatus.SERVED:
      return 'Served';
    case OrderItemStatus.DECLINED:
      return 'Declined';
    case OrderItemStatus.CANCELED:
      return 'Canceled';
    default:
      return 'Unknown';
  }
}

/**
 * Get color for order item status
 */
export function getOrderItemStatusColor(status: OrderItemStatus): string {
  switch (status) {
    case OrderItemStatus.PENDING:
      return StatusColors.pending;
    case OrderItemStatus.SENT_TO_PREPARE:
      return '#EAB308'; // Yellow
    case OrderItemStatus.PREPARING:
      return StatusColors.preparing;
    case OrderItemStatus.READY:
      return StatusColors.ready;
    case OrderItemStatus.SERVED:
      return '#9CA3AF'; // Muted gray
    case OrderItemStatus.DECLINED:
    case OrderItemStatus.CANCELED:
      return '#EF4444'; // Red
    default:
      return StatusColors.pending;
  }
}

/**
 * Check if item status can be marked as served
 */
export function canMarkAsServed(status: OrderItemStatus): boolean {
  return status === OrderItemStatus.READY;
}

/**
 * Check if item can be cancelled
 */
export function canCancelItem(status: OrderItemStatus): boolean {
  return (
    status === OrderItemStatus.PENDING ||
    status === OrderItemStatus.SENT_TO_PREPARE ||
    status === OrderItemStatus.PREPARING
  );
}

/**
 * Check if item is in a cancelled/declined state
 */
export function isItemCancelled(status: OrderItemStatus): boolean {
  return status === OrderItemStatus.DECLINED || status === OrderItemStatus.CANCELED;
}

/**
 * Count items by status
 */
export function countItemsByStatus(
  items: OrderItem[] | undefined,
  status: OrderItemStatus
): number {
  if (!items) return 0;
  return items.filter((item) => item.status === status).length;
}

/**
 * Get total quantity of items
 */
export function getTotalQuantity(items: OrderItem[] | undefined): number {
  if (!items) return 0;
  return items.reduce((sum, item) => {
    const qty = Number.parseInt(item.quantity, 10);
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
}

// ============================================================================
// Order Item Row Component
// ============================================================================

function OrderItemRow({ item, onMarkServed, onCancelItem, testID }: OrderItemRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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

  const isCancelled = isItemCancelled(item.status);
  const canServe = canMarkAsServed(item.status);
  const canCancel = canCancelItem(item.status);
  const isReady = item.status === OrderItemStatus.READY;

  const quantity = Number.parseInt(item.quantity, 10) || 0;
  const extrasText = item.extras
    ?.map((extra) => {
      const name = getTranslatedText(extra.title, 'Extra');
      return extra.quantity > 1 ? `${extra.quantity}x ${name}` : name;
    })
    .join(', ');

  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={FadeOut.duration(200)}
      style={animatedStyle}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} testID={testID}>
        <Card
          padding="md"
          style={[
            styles.itemCard,
            isReady && styles.itemCardReady,
            isCancelled && styles.itemCardCancelled,
          ]}
        >
          {/* Item Header: Name + Status */}
          <View style={styles.itemHeader}>
            <View style={styles.itemNameContainer}>
              <ThemedText
                style={[styles.itemName, isCancelled && styles.itemNameCancelled]}
                numberOfLines={1}
              >
                {getTranslatedText(item.itemTitle, 'Unknown Item')}
              </ThemedText>
              <ThemedText style={[styles.itemQuantity, { color: colors.textSecondary }]}>
                x{quantity}
              </ThemedText>
            </View>
            <Badge variant={getOrderItemBadgeVariant(item.status)} size="sm">
              {getOrderItemStatusLabel(item.status)}
            </Badge>
          </View>

          {/* Extras */}
          {extrasText && (
            <ThemedText
              style={[
                styles.itemExtras,
                { color: colors.textMuted },
                isCancelled && styles.textMuted,
              ]}
              numberOfLines={1}
            >
              {extrasText}
            </ThemedText>
          )}

          {/* Notes */}
          {item.notes && (
            <ThemedText
              style={[
                styles.itemNotes,
                { color: colors.textSecondary },
                isCancelled && styles.textMuted,
              ]}
              numberOfLines={2}
            >
              Note: {item.notes}
            </ThemedText>
          )}

          {/* Decline/Cancel Reason */}
          {(item.declineReason || item.cancelReason) && (
            <ThemedText style={styles.declineReason} numberOfLines={2}>
              {item.declineReason
                ? `Declined: ${item.declineReason}`
                : `Cancelled: ${item.cancelReason}`}
            </ThemedText>
          )}

          {/* Footer: Price + Actions */}
          <View style={styles.itemFooter}>
            <ThemedText style={[styles.itemPrice, isCancelled && styles.itemPriceCancelled]}>
              {formatPrice(item.subtotal)}
            </ThemedText>

            <View style={styles.itemActions}>
              {canServe && onMarkServed && (
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => onMarkServed(item)}
                  testID={`${testID}-serve-btn`}
                >
                  Mark Served
                </Button>
              )}
              {canCancel && onCancelItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onCancelItem(item)}
                  testID={`${testID}-cancel-btn`}
                >
                  Cancel
                </Button>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function OrderDetailSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Header Skeleton */}
      <Card padding="md" style={styles.headerCard}>
        <SkeletonGroup count={2} spacing={Spacing.sm}>
          <Skeleton width="60%" height={24} variant="text" />
        </SkeletonGroup>
        <SkeletonGroup count={3} spacing={Spacing.xs} style={{ marginTop: Spacing.md }}>
          <Skeleton width="80%" height={16} variant="text" />
        </SkeletonGroup>
      </Card>

      {/* Items Skeleton */}
      <SkeletonGroup count={4} spacing={Spacing.sm} style={{ marginTop: Spacing.md }}>
        <Card padding="md">
          <Skeleton width="70%" height={20} variant="text" />
          <Skeleton width="40%" height={14} variant="text" style={{ marginTop: Spacing.sm }} />
          <Skeleton width="30%" height={16} variant="text" style={{ marginTop: Spacing.sm }} />
        </Card>
      </SkeletonGroup>
    </View>
  );
}

// ============================================================================
// Order Detail Screen
// ============================================================================

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data fetching
  const { data: order, isLoading, error, refetch, isRefetching } = useOrder({ id: id ?? '' });
  const { invalidateOrder, invalidateOrders } = useOrderCacheActions();

  // State for refreshing
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showChangeTableModal, setShowChangeTableModal] = useState(false);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<OrderItem | null>(null);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Mark item as served
  const handleMarkServed = useCallback(
    (item: OrderItem) => {
      Alert.alert(
        'Mark as Served',
        `Mark "${getTranslatedText(item.itemTitle, 'Item')}" as served?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Served',
            onPress: async () => {
              try {
                await batchUpdateOrderItemStatus({
                  ids: [item.id],
                  status: OrderItemStatus.SERVED,
                });
                Toast.show({
                  type: 'success',
                  text1: 'Item Served',
                  text2: `${getTranslatedText(item.itemTitle, 'Item')} marked as served`,
                });
                invalidateOrder(id ?? '');
                refetch();
              } catch (err) {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: err instanceof Error ? err.message : 'Failed to update item status',
                });
              }
            },
          },
        ]
      );
    },
    [id, invalidateOrder, refetch]
  );

  // Open cancel item modal
  const handleCancelItem = useCallback((item: OrderItem) => {
    setItemToCancel(item);
    setShowCancelItemModal(true);
  }, []);

  // Confirm cancel item with reason
  const handleConfirmCancelItem = useCallback(
    async (reason: string, reasonId?: string) => {
      if (!itemToCancel) return;

      try {
        await batchUpdateOrderItemStatus({
          ids: [itemToCancel.id],
          status: OrderItemStatus.CANCELED,
          cancelReason: reason,
          cancelReasonId: reasonId,
        });
        Toast.show({
          type: 'success',
          text1: 'Item Cancelled',
          text2: `${getTranslatedText(itemToCancel.itemTitle, 'Item')} has been cancelled`,
        });
        setShowCancelItemModal(false);
        setItemToCancel(null);
        invalidateOrder(id ?? '');
        refetch();
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to cancel item');
      }
    },
    [itemToCancel, id, invalidateOrder, refetch]
  );

  // Close cancel item modal
  const handleCloseCancelItemModal = useCallback(() => {
    setShowCancelItemModal(false);
    setItemToCancel(null);
  }, []);

  // Navigate to add more items
  const handleAddItems = useCallback(() => {
    if (order?.tableId) {
      router.push({
        pathname: '/(main)/order/new',
        params: { tableId: order.tableId, orderId: order.id },
      });
    }
  }, [order, router]);

  // Navigate to bill
  const handleCreateBill = useCallback(() => {
    if (order) {
      router.push({
        pathname: '/(main)/bill/[orderId]',
        params: { orderId: order.id },
      });
    }
  }, [order, router]);

  // Change table handler
  const handleChangeTable = useCallback(
    async (newTableId: string) => {
      if (!order?.id) return;

      try {
        await updateOrder(order.id, { tableId: newTableId });
        invalidateOrder(order.id);
        invalidateOrders();
        await refetch();
        setShowChangeTableModal(false);
        Toast.show({
          type: 'success',
          text1: 'Table Changed',
          text2: 'Order has been moved to the new table',
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to change table');
      }
    },
    [order?.id, invalidateOrder, invalidateOrders, refetch]
  );

  // Edit notes handler
  const handleEditNotes = useCallback(
    async (notes: string) => {
      if (!order?.id) return;

      try {
        await updateOrder(order.id, { notes });
        invalidateOrder(order.id);
        await refetch();
        setShowEditNotesModal(false);
        Toast.show({
          type: 'success',
          text1: 'Notes Updated',
          text2: notes ? 'Order notes have been saved' : 'Order notes have been cleared',
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to update notes');
      }
    },
    [order?.id, invalidateOrder, refetch]
  );

  // Cancel order handler
  const handleCancelOrder = useCallback(
    async (reason: string) => {
      if (!order?.id) return;

      try {
        await updateOrder(order.id, {
          orderStatus: OrderStatus.CANCELLED,
          cancelReason: reason,
        });
        invalidateOrder(order.id);
        invalidateOrders();
        await refetch();
        setShowCancelOrderModal(false);
        Toast.show({
          type: 'success',
          text1: 'Order Cancelled',
          text2: `Order ${order.orderCode} has been cancelled`,
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to cancel order');
      }
    },
    [order?.id, order?.orderCode, invalidateOrder, invalidateOrders, refetch]
  );

  // Computed values
  const readyCount = useMemo(
    () => countItemsByStatus(order?.orderItems, OrderItemStatus.READY),
    [order?.orderItems]
  );

  const totalQuantity = useMemo(() => getTotalQuantity(order?.orderItems), [order?.orderItems]);

  const locationDisplay = useMemo(() => {
    if (!order) return '';
    if (order.orderType === OrderType.DINE_IN) {
      return order.table?.title ? `Table ${order.table.title}` : 'Table N/A';
    }
    const customerName = order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : null;
    return customerName || (order.orderType === OrderType.DELIVERY ? 'Delivery' : 'To Go');
  }, [order]);

  const isOrderActive = useMemo(() => {
    if (!order) return false;
    return (
      order.orderStatus === OrderStatus.PENDING || order.orderStatus === OrderStatus.IN_PROGRESS
    );
  }, [order]);

  const isDineIn = order?.orderType === OrderType.DINE_IN;

  // Error state
  if (error && !isLoading) {
    return (
      <View
        style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}
      >
        <ThemedText style={styles.errorText}>Failed to load order</ThemedText>
        <ThemedText style={[styles.errorSubtext, { color: colors.textMuted }]}>
          {error.message}
        </ThemedText>
        <Button variant="primary" onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
          Retry
        </Button>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OrderDetailSkeleton />
      </View>
    );
  }

  // No order found
  if (!order) {
    return (
      <View
        style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}
      >
        <ThemedText style={styles.errorText}>Order not found</ThemedText>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          testID="order-detail-back-btn"
        >
          <ThemedText style={styles.backButtonText}>{'<'} Back</ThemedText>
        </Pressable>

        {/* Title */}
        <ThemedText style={styles.headerTitle}>{order.orderCode}</ThemedText>

        {/* Empty spacer for alignment */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        testID="order-detail-scroll"
      >
        {/* Order Info Card */}
        <Animated.View entering={FadeIn.duration(300)}>
          <Card padding="md" elevated style={styles.infoCard}>
            {/* Status Row */}
            <View style={styles.statusRow}>
              <Badge variant={getOrderStatusBadgeVariant(order.orderStatus)} size="md">
                {getOrderStatusLabel(order.orderStatus)}
              </Badge>
              <Badge variant={getOrderTypeBadgeVariant(order.orderType)} size="md">
                {getOrderTypeLabel(order.orderType)}
              </Badge>
              {readyCount > 0 && (
                <View style={[styles.readyBadge, { backgroundColor: StatusColors.ready }]}>
                  <ThemedText style={styles.readyBadgeText}>{readyCount} ready</ThemedText>
                </View>
              )}
            </View>

            {/* Location/Customer */}
            <ThemedText style={[styles.locationText, { color: colors.text }]}>
              {locationDisplay}
            </ThemedText>

            {/* Customer Info (for delivery/to-go) */}
            {order.customer && order.orderType !== OrderType.DINE_IN && (
              <View style={styles.customerInfo}>
                {order.customer.phoneNumber && (
                  <ThemedText style={[styles.customerPhone, { color: colors.textSecondary }]}>
                    {order.customer.phoneNumber}
                  </ThemedText>
                )}
                {order.address && (
                  <ThemedText style={[styles.customerAddress, { color: colors.textSecondary }]}>
                    {order.address}
                  </ThemedText>
                )}
              </View>
            )}

            {/* Order Notes */}
            {order.notes && (
              <View style={[styles.orderNotes, { borderTopColor: colors.border }]}>
                <ThemedText style={[styles.orderNotesLabel, { color: colors.textMuted }]}>
                  Notes:
                </ThemedText>
                <ThemedText style={[styles.orderNotesText, { color: colors.textSecondary }]}>
                  {order.notes}
                </ThemedText>
              </View>
            )}

            {/* Meta Info */}
            <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
              <ThemedText style={[styles.metaText, { color: colors.textMuted }]}>
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} •{' '}
                {formatDateTime(order.createdAt)}
              </ThemedText>
              {order.waiter && (
                <ThemedText style={[styles.metaText, { color: colors.textMuted }]}>
                  Waiter: {order.waiter.username}
                </ThemedText>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <ThemedText style={styles.sectionTitle}>Order Items</ThemedText>

          {order.orderItems && order.orderItems.length > 0 ? (
            order.orderItems.map((item, index) => (
              <OrderItemRow
                key={item.id}
                item={item}
                onMarkServed={isOrderActive ? handleMarkServed : undefined}
                onCancelItem={isOrderActive ? handleCancelItem : undefined}
                testID={`order-item-${index}`}
              />
            ))
          ) : (
            <Card padding="md" style={styles.emptyCard}>
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                No items in this order
              </ThemedText>
            </Card>
          )}
        </View>

        {/* Total */}
        <Card padding="md" elevated style={styles.totalCard}>
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalAmount}>{formatPrice(order.totalAmount)}</ThemedText>
          </View>
          {order.serviceFeeAmount && (
            <ThemedText style={[styles.serviceFeeText, { color: colors.textSecondary }]}>
              Includes {order.serviceFeePercent ? `${order.serviceFeePercent}%` : ''} service fee:{' '}
              {formatPrice(order.serviceFeeAmount)}
            </ThemedText>
          )}
        </Card>

        {/* Action Buttons */}
        {isOrderActive && (
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              onPress={handleAddItems}
              style={styles.actionButton}
              testID="order-detail-add-items-btn"
            >
              Add Items
            </Button>
            <Button
              variant="primary"
              onPress={handleCreateBill}
              style={styles.actionButton}
              testID="order-detail-create-bill-btn"
            >
              Create Bill
            </Button>
          </View>
        )}

        {/* Order Modification Actions */}
        {isOrderActive && (
          <View style={styles.modificationSection}>
            <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>
              Order Actions
            </ThemedText>
            <View style={styles.modificationButtons}>
              {isDineIn && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setShowChangeTableModal(true)}
                  style={styles.modButton}
                  testID="order-detail-change-table-btn"
                >
                  Change Table
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowEditNotesModal(true)}
                style={styles.modButton}
                testID="order-detail-edit-notes-btn"
              >
                {order?.notes ? 'Edit Notes' : 'Add Notes'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onPress={() => setShowCancelOrderModal(true)}
                style={styles.modButton}
                testID="order-detail-cancel-order-btn"
              >
                Cancel Order
              </Button>
            </View>
          </View>
        )}

        {/* Cancelled Order Message */}
        {order.orderStatus === OrderStatus.CANCELLED && order.cancelReason && (
          <Card padding="md" style={[styles.cancelledCard, { backgroundColor: '#FEE2E2' }]}>
            <ThemedText style={styles.cancelledLabel}>Order Cancelled</ThemedText>
            <ThemedText style={styles.cancelledReason}>{order.cancelReason}</ThemedText>
          </Card>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isRefetching && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
        </View>
      )}

      {/* Modals */}
      <ChangeTableModal
        visible={showChangeTableModal}
        currentTableId={order?.tableId ?? null}
        onConfirm={handleChangeTable}
        onCancel={() => setShowChangeTableModal(false)}
        testID="order-detail-change-table-modal"
      />

      <EditNotesModal
        visible={showEditNotesModal}
        currentNotes={order?.notes}
        onConfirm={handleEditNotes}
        onCancel={() => setShowEditNotesModal(false)}
        testID="order-detail-edit-notes-modal"
      />

      <CancelOrderModal
        visible={showCancelOrderModal}
        orderCode={order?.orderCode ?? ''}
        onConfirm={handleCancelOrder}
        onCancel={() => setShowCancelOrderModal(false)}
        testID="order-detail-cancel-order-modal"
      />

      <CancelItemModal
        visible={showCancelItemModal}
        itemName={itemToCancel?.itemTitle ?? 'Item'}
        quantity={Number.parseInt(itemToCancel?.quantity ?? '1', 10)}
        onConfirm={handleConfirmCancelItem}
        onCancel={handleCloseCancelItemModal}
        testID="order-detail-cancel-item-modal"
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: BrandColors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  skeletonContainer: {
    padding: Spacing.md,
  },
  headerCard: {
    marginBottom: Spacing.md,
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  readyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  readyBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  customerInfo: {
    marginTop: Spacing.xs,
  },
  customerPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 14,
  },
  orderNotes: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  orderNotesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  orderNotesText: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  metaText: {
    fontSize: 12,
  },
  itemsSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemCardReady: {
    borderLeftWidth: 4,
    borderLeftColor: StatusColors.ready,
  },
  itemCardCancelled: {
    opacity: 0.7,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  itemNameCancelled: {
    textDecorationLine: 'line-through',
  },
  itemQuantity: {
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  itemExtras: {
    fontSize: 13,
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  declineReason: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemPriceCancelled: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textMuted: {
    opacity: 0.6,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  totalCard: {
    marginBottom: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  serviceFeeText: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  modificationSection: {
    marginBottom: Spacing.md,
  },
  modificationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modButton: {
    minWidth: 100,
  },
  cancelledCard: {
    marginBottom: Spacing.md,
  },
  cancelledLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  cancelledReason: {
    fontSize: 14,
    color: '#991B1B',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

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

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { CancelItemModal } from '@/components/orders/CancelItemModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { ChangeTableModal } from '@/components/orders/ChangeTableModal';
import { EditNotesModal } from '@/components/orders/EditNotesModal';
import { formatOrderDate } from '@/components/orders/OrderCard';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LocationInfo } from '@/components/ui/LocationInfo';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useHapticRefresh } from '@/src/hooks';
import { useOrder, useOrderCacheActions } from '@/src/hooks/useOrderQueries';
import { getImageUrl } from '@/src/services/api/client';
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

// ============================================================================
// Order Item Row Component
// ============================================================================

function OrderItemRow({ item, onMarkServed, onCancelItem, testID }: OrderItemRowProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const isCancelled = isItemCancelled(item.status);
  const canServe = canMarkAsServed(item.status);
  const canCancel = canCancelItem(item.status);

  const quantity = Number.parseInt(item.quantity, 10) || 0;
  const hasExtras = item.extras && item.extras.length > 0;
  const hasBottomRow = hasExtras || item.notes;

  const borderColor = isDark ? colors.border : '#e0e0e0';
  const bgColor = isDark ? colors.backgroundSecondary : '#fff';
  const secondaryText = isDark ? colors.textSecondary : '#646464';

  return (
      <View
        style={[styles.itemContainer, { borderBottomColor: borderColor, backgroundColor: bgColor }]}
        testID={testID}
      >
        {/* Top Row: Image + Info + Actions */}
        <View style={styles.itemTopRow}>
          {item.menuItem?.imagePath && (
            <Image
              source={{ uri: getImageUrl(item.menuItem.imagePath)! }}
              style={[styles.itemImage, isCancelled && styles.itemOpacity]}
              contentFit="cover"
              transition={200}
            />
          )}

          <View style={styles.itemInfoCol}>
            <ThemedText
              style={[styles.itemName, isCancelled && styles.itemNameCancelled]}
              numberOfLines={2}
            >
              {getTranslatedText(item.itemTitle, 'Unknown Item')}
              {quantity > 1 ? ` x${quantity}` : ''}
            </ThemedText>
            <ThemedText style={[styles.itemPrice, { color: secondaryText }]}>
              {formatPrice(item.subtotal)}
            </ThemedText>
            <Badge variant={getOrderItemBadgeVariant(item.status)} size="sm">
              {getOrderItemStatusLabel(item.status)}
            </Badge>
          </View>

          {/* Action buttons */}
          <View style={styles.itemActions}>
            {canServe && onMarkServed && (
              <Pressable
                style={[styles.itemActionBtn, styles.itemServeBtn]}
                onPress={() => onMarkServed(item)}
                testID={`${testID}-serve-btn`}
              >
                <MaterialIcons name="check" size={24} color="#2B9A66" />
              </Pressable>
            )}
            {canCancel && onCancelItem && (
              <Pressable
                style={[styles.itemActionBtn, styles.itemCancelBtn]}
                onPress={() => onCancelItem(item)}
                testID={`${testID}-cancel-btn`}
              >
                <MaterialIcons name="delete-outline" size={24} color="#CE2C31" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Decline/Cancel Reason */}
        {(item.declineReason || item.cancelReason) && (
          <ThemedText style={styles.declineReason} numberOfLines={2}>
            {item.declineReason
              ? `Declined: ${item.declineReason}`
              : `Cancelled: ${item.cancelReason}`}
          </ThemedText>
        )}

        {/* Bottom Row: Extras + Notes */}
        {hasBottomRow && (
          <View style={styles.itemBottomRow}>
            {hasExtras && (
              <View style={styles.itemExtrasCol}>
                {item.extras!.map((extra) => (
                  <View key={extra.extraId} style={styles.itemExtraRow}>
                    <ThemedText style={styles.itemExtraName}>
                      {getTranslatedText(extra.extraTitle, 'Extra')}
                      {extra.quantity > 1 ? ` x${extra.quantity}` : ''}:
                    </ThemedText>
                    {extra.totalPrice && (
                      <View
                        style={[
                          styles.itemExtraPricePill,
                          { backgroundColor: isDark ? colors.border : '#f0f0f0' },
                        ]}
                      >
                        <ThemedText style={styles.itemExtraPriceText}>
                          {formatPrice(extra.totalPrice)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {item.notes && (
              <View
                style={[
                  styles.itemNotesCol,
                  hasExtras && {
                    borderLeftWidth: 1,
                    borderLeftColor: isDark ? colors.border : '#e8e8e8',
                  },
                ]}
              >
                <ThemedText
                  style={[styles.itemNotesText, { color: secondaryText }]}
                  numberOfLines={3}
                >
                  {item.notes}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
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
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Data fetching
  const { data: order, isLoading, error, refetch, isRefetching } = useOrder({ id: id ?? '' });
  const { invalidateOrder, invalidateOrders } = useOrderCacheActions();

  // Modal states
  const [showChangeTableModal, setShowChangeTableModal] = useState(false);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<OrderItem | null>(null);

  // Pull to refresh with haptic feedback
  const { isRefreshing, handleRefresh } = useHapticRefresh({
    onRefresh: async () => {
      await refetch();
    },
  });

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
                toast.success('Item Served', {
                  description: `${getTranslatedText(item.itemTitle, 'Item')} marked as served`,
                });
                invalidateOrder(id ?? '');
                refetch();
              } catch (err) {
                toast.error('Error', {
                  description: err instanceof Error ? err.message : 'Failed to update item status',
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
        toast.success('Item Cancelled', {
          description: `${getTranslatedText(itemToCancel.itemTitle, 'Item')} has been cancelled`,
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
        toast.success('Table Changed', {
          description: 'Order has been moved to the new table',
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
        toast.success('Notes Updated', {
          description: notes ? 'Order notes have been saved' : 'Order notes have been cleared',
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
        toast.success('Order Cancelled', {
          description: `Order ${order.orderCode} has been cancelled`,
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

  const locationDisplay = useMemo(() => {
    if (!order) return '';
    const customerName = order.customer
      ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim()
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
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + Spacing.sm,
          },
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

        {/* Title + Status */}
        <View style={styles.headerTitleRow}>
          <ThemedText style={styles.headerTitle}>Order #{order.orderNumber}</ThemedText>
          <Badge variant={getOrderStatusBadgeVariant(order.orderStatus)} size="sm">
            {getOrderStatusLabel(order.orderStatus)}
          </Badge>
        </View>

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
          <Card padding="none" elevated style={styles.infoCard}>
            {/* Status Row: order type badge (non-DINE_IN) + ready count */}
            {(order.orderType !== OrderType.DINE_IN || readyCount > 0) && (
              <View style={styles.statusRow}>
                {order.orderType !== OrderType.DINE_IN && (
                  <Badge variant={getOrderTypeBadgeVariant(order.orderType)} size="md">
                    {getOrderTypeLabel(order.orderType)}
                  </Badge>
                )}
                {readyCount > 0 && (
                  <View style={[styles.readyBadge, { backgroundColor: StatusColors.ready }]}>
                    <ThemedText style={styles.readyBadgeText}>{readyCount} ready</ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* Location + Date */}
            <View style={styles.locationDateRow}>
              {order.orderType === OrderType.DINE_IN && order.table ? (
                <LocationInfo
                  zoneTitle={order.table.zone?.title}
                  tableTitle={order.table.title}
                  testID="order-detail-location"
                />
              ) : (
                <ThemedText style={[styles.locationText, { color: colors.text }]}>
                  {locationDisplay}
                </ThemedText>
              )}
              <ThemedText style={[styles.metaText, { color: colors.textMuted }]}>
                {formatOrderDate(order.createdAt)}
              </ThemedText>
            </View>

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

            {/* Waiter Info */}
            {order.waiter && (
              <ThemedText style={[styles.metaText, { color: colors.textMuted }]}>
                Waiter: {order.waiter.username}
              </ThemedText>
            )}
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
          <Card
            padding="md"
            style={[styles.cancelledCard, { backgroundColor: '#FEE2E2' as const }]}
          >
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  locationDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  itemContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 10,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  itemImage: {
    width: 76,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  itemOpacity: {
    opacity: 0.5,
  },
  itemInfoCol: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  itemNameCancelled: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  declineReason: {
    fontSize: 12,
    color: '#EF4444',
  },
  itemActions: {
    flexDirection: 'column',
    gap: 5,
  },
  itemActionBtn: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemServeBtn: {
    backgroundColor: '#e6f6eb',
  },
  itemCancelBtn: {
    backgroundColor: '#ffdbdc',
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemExtrasCol: {
    gap: 3,
  },
  itemExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemExtraName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  itemExtraPricePill: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  itemExtraPriceText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  itemNotesCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  itemNotesText: {
    fontSize: 14,
    lineHeight: 20,
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

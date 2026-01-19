/**
 * TableDetailModal Component
 *
 * A full modal that displays detailed table information:
 * - Full table information (name, capacity, zone, status)
 * - Active order details with items and their statuses
 * - Order history for the table (today's orders)
 * - Action buttons: New Order, View Bill, Transfer Table
 *
 * This is a more comprehensive view compared to TableInfoPopup.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BorderRadius, BrandColors, Spacing, StatusColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { OrderItemStatus, OrderStatus } from '@/src/types/enums';
import type { Order, OrderItem, Table, Translation } from '@/src/types/models';
import type { TableItemData, TableStatus } from './TableItem';
import { getStatusColor } from './TableItem';

// ============================================================================
// Types
// ============================================================================

export interface TableDetailModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** The table to display details for */
  table: TableItemData | null;
  /** Active order for this table (if any) */
  activeOrder?: Order | null;
  /** Order history for today (array of orders) */
  orderHistory?: Order[];
  /** Whether order history is loading */
  isLoadingHistory?: boolean;
  /** Callback when "New Order" is pressed */
  onNewOrder?: (table: Table) => void;
  /** Callback when "View Bill" is pressed */
  onViewBill?: (order: Order) => void;
  /** Callback when "Transfer Table" is pressed */
  onTransferTable?: (table: Table) => void;
  /** Callback when an order is selected from history */
  onSelectOrder?: (order: Order) => void;
  /** Callback when an order item is pressed */
  onSelectOrderItem?: (item: OrderItem) => void;
  /** Test ID prefix for testing */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display text for a translation object based on current language
 * Defaults to English if translation is missing
 */
export function getTranslatedText(translation: Translation | undefined, fallback = ''): string {
  if (!translation) return fallback;
  // TODO: Use language from settings store when implemented
  return translation.en || translation.ru || translation.tm || fallback;
}

/**
 * Get badge variant for table status
 */
export function getStatusBadgeVariant(
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
 * Get human-readable status label for table status
 */
export function getTableStatusLabel(status: TableStatus): string {
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
 * Get badge variant for order item status
 */
export function getOrderItemBadgeVariant(
  status: OrderItemStatus
): 'pending' | 'warning' | 'preparing' | 'ready' | 'default' | 'error' {
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
 * Get badge variant for order status
 */
export function getOrderStatusBadgeVariant(
  status: OrderStatus
): 'pending' | 'info' | 'success' | 'error' {
  switch (status) {
    case OrderStatus.PENDING:
      return 'pending';
    case OrderStatus.IN_PROGRESS:
      return 'info';
    case OrderStatus.COMPLETED:
      return 'success';
    case OrderStatus.CANCELLED:
      return 'error';
    default:
      return 'pending';
  }
}

/**
 * Format time to display (e.g., "14:30")
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// Sub-Components
// ============================================================================

interface OrderItemRowProps {
  item: OrderItem;
  onPress?: (item: OrderItem) => void;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  testID?: string;
}

function OrderItemRow({
  item,
  onPress,
  textColor,
  textSecondaryColor,
  borderColor,
  testID,
}: OrderItemRowProps) {
  const isDeclinedOrCanceled =
    item.status === OrderItemStatus.DECLINED || item.status === OrderItemStatus.CANCELED;

  return (
    <Pressable
      style={[styles.orderItemRow, { borderBottomColor: borderColor }]}
      onPress={onPress ? () => onPress(item) : undefined}
      testID={testID}
    >
      <View style={styles.orderItemInfo}>
        <Text
          style={[
            styles.orderItemName,
            { color: textColor },
            isDeclinedOrCanceled && styles.textStrikethrough,
          ]}
          numberOfLines={1}
        >
          {getTranslatedText(item.itemTitle, 'Unknown Item')}
        </Text>
        <View style={styles.orderItemMeta}>
          <Text style={[styles.orderItemQuantity, { color: textSecondaryColor }]}>
            x{item.quantity}
          </Text>
          {item.notes && (
            <Text style={[styles.orderItemNotes, { color: textSecondaryColor }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
        {item.declineReason && (
          <Text style={[styles.declineReason, { color: '#EF4444' }]} numberOfLines={1}>
            Declined: {item.declineReason}
          </Text>
        )}
      </View>
      <View style={styles.orderItemRight}>
        <Badge variant={getOrderItemBadgeVariant(item.status)} size="sm">
          {getOrderItemStatusLabel(item.status)}
        </Badge>
        <Text style={[styles.orderItemPrice, { color: textColor }]}>{item.subtotal} TMT</Text>
      </View>
    </Pressable>
  );
}

interface OrderHistoryCardProps {
  order: Order;
  onPress?: (order: Order) => void;
  textColor: string;
  textSecondaryColor: string;
  backgroundColor: string;
  borderColor: string;
  testID?: string;
}

function OrderHistoryCard({
  order,
  onPress,
  textColor,
  textSecondaryColor,
  backgroundColor,
  borderColor,
  testID,
}: OrderHistoryCardProps) {
  return (
    <Pressable
      style={[styles.historyCard, { backgroundColor, borderColor }]}
      onPress={onPress ? () => onPress(order) : undefined}
      testID={testID}
    >
      <View style={styles.historyCardHeader}>
        <Text style={[styles.historyOrderCode, { color: textColor }]}>#{order.orderCode}</Text>
        <Badge variant={getOrderStatusBadgeVariant(order.orderStatus)} size="sm">
          {order.orderStatus}
        </Badge>
      </View>
      <View style={styles.historyCardBody}>
        <Text style={[styles.historyTime, { color: textSecondaryColor }]}>
          {formatTime(order.createdAt)}
        </Text>
        <Text style={[styles.historyItemCount, { color: textSecondaryColor }]}>
          {order.orderItems?.length ?? 0} items
        </Text>
        <Text style={[styles.historyTotal, { color: textColor }]}>{order.totalAmount} TMT</Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TableDetailModal({
  visible,
  onClose,
  table,
  activeOrder,
  orderHistory = [],
  isLoadingHistory = false,
  onNewOrder,
  onViewBill,
  onTransferTable,
  onSelectOrder,
  onSelectOrderItem,
  testID = 'table-detail-modal',
}: TableDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');

  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'overlay');

  // Derived values
  const statusColor = table ? getStatusColor(table.status) : StatusColors.available;
  const hasActiveOrder = activeOrder !== null && activeOrder !== undefined;
  const orderItems = activeOrder?.orderItems ?? [];
  const readyItemsCount = orderItems.filter((item) => item.status === OrderItemStatus.READY).length;

  // Reset tab when modal opens with new table
  useEffect(() => {
    if (visible && table) {
      setActiveTab(hasActiveOrder ? 'order' : 'history');
    }
  }, [visible, table, hasActiveOrder]);

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

  const handleNewOrder = useCallback(() => {
    if (table && onNewOrder) {
      onNewOrder(table);
    }
  }, [table, onNewOrder]);

  const handleViewBill = useCallback(() => {
    if (activeOrder && onViewBill) {
      onViewBill(activeOrder);
    }
  }, [activeOrder, onViewBill]);

  const handleTransferTable = useCallback(() => {
    if (table && onTransferTable) {
      onTransferTable(table);
    }
  }, [table, onTransferTable]);

  // Render nothing if not visible or no table
  if (!visible || !table) {
    return null;
  }

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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={[styles.tableName, { color: textColor }]} testID={`${testID}-title`}>
              {table.title}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Badge variant={getStatusBadgeVariant(table.status)} size="sm">
              {getTableStatusLabel(table.status)}
            </Badge>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
              testID={`${testID}-close`}
            >
              <Text style={[styles.closeButtonText, { color: textSecondaryColor }]}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Table Info Section */}
        <View style={[styles.tableInfo, { borderBottomColor: borderColor }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Capacity</Text>
            <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-capacity`}>
              {table.capacity} seats
            </Text>
          </View>
          {table.zone && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Zone</Text>
              <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-zone`}>
                {getTranslatedText(table.zone.title, 'Unknown')}
              </Text>
            </View>
          )}
          {table.guestCount !== undefined && table.guestCount > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Guests</Text>
              <Text style={[styles.infoValue, { color: textColor }]} testID={`${testID}-guests`}>
                {table.guestCount}
              </Text>
            </View>
          )}
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'order' && [
                styles.tabActive,
                { borderBottomColor: BrandColors.primary },
              ],
            ]}
            onPress={() => setActiveTab('order')}
            testID={`${testID}-tab-order`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'order' ? BrandColors.primary : textSecondaryColor },
              ]}
            >
              Active Order
              {readyItemsCount > 0 && (
                <Text style={{ color: StatusColors.ready }}> ({readyItemsCount} ready)</Text>
              )}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'history' && [
                styles.tabActive,
                { borderBottomColor: BrandColors.primary },
              ],
            ]}
            onPress={() => setActiveTab('history')}
            testID={`${testID}-tab-history`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'history' ? BrandColors.primary : textSecondaryColor },
              ]}
            >
              History ({orderHistory.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'order' ? (
            hasActiveOrder ? (
              <ScrollView
                style={styles.orderScrollView}
                showsVerticalScrollIndicator={false}
                testID={`${testID}-order-items`}
              >
                {/* Order Header */}
                <View style={[styles.orderHeader, { backgroundColor: backgroundSecondary }]}>
                  <View style={styles.orderHeaderRow}>
                    <Text style={[styles.orderCode, { color: textColor }]}>
                      #{activeOrder?.orderCode}
                    </Text>
                    <Badge
                      variant={getOrderStatusBadgeVariant(activeOrder?.orderStatus as OrderStatus)}
                      size="sm"
                    >
                      {activeOrder?.orderStatus}
                    </Badge>
                  </View>
                  <View style={styles.orderHeaderRow}>
                    <Text style={[styles.orderMeta, { color: textSecondaryColor }]}>
                      {orderItems.length} items
                    </Text>
                    <Text style={[styles.orderTotal, { color: textColor }]}>
                      Total: {activeOrder?.totalAmount} TMT
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                {orderItems.map((item, index) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    onPress={onSelectOrderItem}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                    borderColor={borderColor}
                    testID={`${testID}-order-item-${index}`}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState} testID={`${testID}-no-order`}>
                <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                  No active order for this table
                </Text>
                {onNewOrder && (
                  <Button
                    variant="primary"
                    size="md"
                    onPress={handleNewOrder}
                    style={styles.emptyStateButton}
                    testID={`${testID}-empty-new-order`}
                  >
                    Create Order
                  </Button>
                )}
              </View>
            )
          ) : isLoadingHistory ? (
            <View style={styles.loadingState} testID={`${testID}-history-loading`}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
                Loading order history...
              </Text>
            </View>
          ) : orderHistory.length > 0 ? (
            <FlatList
              data={orderHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <OrderHistoryCard
                  order={item}
                  onPress={onSelectOrder}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                  backgroundColor={backgroundSecondary}
                  borderColor={borderColor}
                  testID={`${testID}-history-${index}`}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              testID={`${testID}-history-list`}
            />
          ) : (
            <View style={styles.emptyState} testID={`${testID}-no-history`}>
              <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                No orders today for this table
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: borderColor }]}>
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

          {hasActiveOrder && onViewBill && (
            <Button
              variant="outline"
              size="sm"
              onPress={handleViewBill}
              style={styles.actionButton}
              testID={`${testID}-view-bill`}
            >
              View Bill
            </Button>
          )}

          {onTransferTable && (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleTransferTable}
              style={styles.actionButton}
              testID={`${testID}-transfer`}
            >
              Transfer
            </Button>
          )}
        </View>
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
    width: '92%',
    maxWidth: 420,
    maxHeight: '85%',
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
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    opacity: 0.6,
  },
  tableInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    minHeight: 200,
  },
  orderScrollView: {
    flex: 1,
  },
  orderHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderMeta: {
    fontSize: 13,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  orderItemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  orderItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderItemQuantity: {
    fontSize: 13,
  },
  orderItemNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  orderItemRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '500',
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  declineReason: {
    fontSize: 11,
    marginTop: 2,
  },
  historyList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  historyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  historyOrderCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyTime: {
    fontSize: 13,
  },
  historyItemCount: {
    fontSize: 13,
    flex: 1,
  },
  historyTotal: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    minWidth: 150,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
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
    minWidth: 90,
  },
});

export default TableDetailModal;

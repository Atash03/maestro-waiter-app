/**
 * Order Entry Screen
 *
 * Main screen for creating new orders. Features:
 * - Split-screen layout: Menu (left/top) + Order Summary (right/bottom)
 * - Responsive to screen orientation
 * - Menu categories with items
 * - Live order summary with running totals
 * - Table information header
 * - Uses orderStore for state management (Task 3.9)
 * - Send to Kitchen flow with confirmation modal (Task 3.10)
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CategoryList } from '@/components/menu';
import { SendToKitchenModal, type SendToKitchenModalState } from '@/components/orders';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMenuData } from '@/src/hooks/useMenuQueries';
import { useSendToKitchen } from '@/src/hooks/useSendToKitchen';
import { useTable } from '@/src/hooks/useTableQueries';
import { getTranslatedText, useMenuStore } from '@/src/stores/menuStore';
import {
  formatPrice as formatOrderPrice,
  type LocalOrderItem,
  parsePrice as parseOrderPrice,
  useOrderActions,
  useOrderItems,
  useOrderNotes,
  useOrderTotals,
} from '@/src/stores/orderStore';
import type { Extra, MenuItem, OrderItemExtra } from '@/src/types/models';

// ============================================================================
// Constants
// ============================================================================

const TABLET_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 360;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse price string to number (re-export for component use)
 */
export function parsePrice(price: string | undefined): number {
  return parseOrderPrice(price);
}

/**
 * Format price for display (re-export for component use)
 */
export function formatPrice(price: number): string {
  return formatOrderPrice(price);
}

/**
 * Calculate extras total
 */
export function calculateExtrasTotal(extras: OrderItemExtra[], availableExtras: Extra[]): number {
  return extras.reduce((total, orderExtra) => {
    const extra = availableExtras.find((e) => e.id === orderExtra.extraId);
    if (extra) {
      return total + parsePrice(extra.actualPrice) * orderExtra.quantity;
    }
    return total;
  }, 0);
}

/**
 * Calculate order item subtotal
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

// ============================================================================
// Menu Search Component
// ============================================================================

interface MenuSearchProps {
  value: string;
  onChangeText: (text: string) => void;
}

function MenuSearch({ value, onChangeText }: MenuSearchProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.searchContainer}>
      <TextInput
        testID="menu-search-input"
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Search menu..."
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          testID="search-clear-button"
          style={styles.searchClearButton}
          onPress={() => onChangeText('')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.searchClearText, { color: colors.textMuted }]}>✕</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// Menu Item Card Component
// ============================================================================

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onPress: (item: MenuItem) => void;
}

function MenuItemCard({ item, quantity, onPress }: MenuItemCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isUnavailable = !item.isActive;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={`menu-item-${item.id}`}
        style={[
          styles.menuItemCard,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            opacity: isUnavailable ? 0.5 : 1,
          },
        ]}
        onPress={() => !isUnavailable && onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isUnavailable}
        activeOpacity={0.8}
      >
        {/* Quantity badge */}
        {quantity > 0 && (
          <View
            testID={`menu-item-quantity-${item.id}`}
            style={[styles.menuItemQuantityBadge, { backgroundColor: BrandColors.primary }]}
          >
            <ThemedText style={styles.menuItemQuantityText}>{quantity}</ThemedText>
          </View>
        )}

        {/* Item content */}
        <View style={styles.menuItemContent}>
          <ThemedText style={styles.menuItemTitle} numberOfLines={2}>
            {getTranslatedText(item.title)}
          </ThemedText>
          {item.description && (
            <ThemedText
              style={[styles.menuItemDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {getTranslatedText(item.description)}
            </ThemedText>
          )}
          <ThemedText style={[styles.menuItemPrice, { color: BrandColors.primary }]}>
            ${formatPrice(parsePrice(item.price))}
          </ThemedText>
        </View>

        {/* Unavailable overlay */}
        {isUnavailable && (
          <View style={styles.unavailableOverlay}>
            <ThemedText style={[styles.unavailableText, { color: colors.error }]}>
              Unavailable
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Menu Item Grid Component
// ============================================================================

interface MenuItemGridProps {
  items: MenuItem[];
  orderItems: LocalOrderItem[];
  onItemPress: (item: MenuItem) => void;
  isTablet: boolean;
}

function MenuItemGrid({ items, orderItems, onItemPress, isTablet }: MenuItemGridProps) {
  // Calculate quantity in order for each item
  const getQuantityInOrder = useCallback(
    (itemId: string) => {
      return orderItems
        .filter((orderItem) => orderItem.menuItemId === itemId)
        .reduce((total, orderItem) => total + orderItem.quantity, 0);
    },
    [orderItems]
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyState} testID="menu-empty-state">
        <ThemedText style={styles.emptyStateText}>No items found</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.menuItemGrid, isTablet && styles.menuItemGridTablet]}
      testID="menu-item-grid"
    >
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.menuItemGridCell, isTablet && styles.menuItemGridCellTablet]}
        >
          <MenuItemCard item={item} quantity={getQuantityInOrder(item.id)} onPress={onItemPress} />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// Order Summary Item Component
// ============================================================================

interface OrderSummaryItemProps {
  item: LocalOrderItem;
  onEdit: (item: LocalOrderItem) => void;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

function OrderSummaryItem({
  item,
  onRemove,
  onUpdateQuantity,
}: Omit<OrderSummaryItemProps, 'onEdit'>) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Animated.View
      entering={SlideInRight.duration(200)}
      exiting={SlideOutRight.duration(200)}
      style={[styles.orderItem, { borderBottomColor: colors.border }]}
      testID={`order-item-${item.id}`}
    >
      <View style={styles.orderItemContent}>
        <View style={styles.orderItemHeader}>
          <ThemedText style={styles.orderItemTitle} numberOfLines={1}>
            {getTranslatedText(item.menuItem.title)}
          </ThemedText>
          <TouchableOpacity
            testID={`remove-item-${item.id}`}
            onPress={() => onRemove(item.id)}
            style={styles.removeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText style={[styles.removeButtonText, { color: colors.error }]}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Extras display */}
        {item.extras.length > 0 && (
          <ThemedText
            style={[styles.orderItemExtras, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            + {item.extras.map((e) => e.title?.en || 'Extra').join(', ')}
          </ThemedText>
        )}

        {/* Notes */}
        {item.notes && (
          <ThemedText
            style={[styles.orderItemNotes, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            Note: {item.notes}
          </ThemedText>
        )}

        <View style={styles.orderItemFooter}>
          {/* Quantity controls */}
          <View style={styles.quantityControls}>
            <TouchableOpacity
              testID={`decrease-qty-${item.id}`}
              style={[styles.quantityButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <ThemedText style={styles.quantityButtonText}>−</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
            <TouchableOpacity
              testID={`increase-qty-${item.id}`}
              style={[styles.quantityButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <ThemedText style={styles.quantityButtonText}>+</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Subtotal */}
          <ThemedText style={styles.orderItemSubtotal}>${formatPrice(item.subtotal)}</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// Order Summary Component
// ============================================================================

interface OrderSummaryProps {
  items: LocalOrderItem[];
  total: number;
  onEditItem: (item: LocalOrderItem) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onSendOrder: () => void;
  isSending: boolean;
  isTablet: boolean;
}

function OrderSummary({
  items,
  total,
  onEditItem,
  onRemoveItem,
  onUpdateQuantity,
  onSendOrder,
  isSending,
  isTablet,
}: OrderSummaryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (items.length === 0) {
    return (
      <View
        style={[styles.orderSummaryEmpty, { backgroundColor: colors.backgroundSecondary }]}
        testID="order-summary-empty"
      >
        <ThemedText style={[styles.orderSummaryEmptyText, { color: colors.textMuted }]}>
          Tap items to add to order
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.orderSummary,
        isTablet && styles.orderSummaryTablet,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
      testID="order-summary"
    >
      {/* Order items list */}
      <ScrollView
        style={styles.orderItemsList}
        showsVerticalScrollIndicator={false}
        testID="order-items-list"
      >
        {items.map((item) => (
          <OrderSummaryItem
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onRemove={onRemoveItem}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </ScrollView>

      {/* Order totals and actions */}
      <View style={[styles.orderTotals, { borderTopColor: colors.border }]}>
        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>
            Items ({items.reduce((sum, i) => sum + i.quantity, 0)})
          </ThemedText>
          <ThemedText style={styles.totalValue}>${formatPrice(total)}</ThemedText>
        </View>

        <Button
          testID="send-order-button"
          variant="primary"
          size="lg"
          onPress={onSendOrder}
          loading={isSending}
          disabled={isSending || items.length === 0}
          fullWidth
        >
          Send to Kitchen
        </Button>
      </View>
    </View>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function OrderEntrySkeleton() {
  return (
    <ThemedView style={styles.container} testID="order-entry-skeleton">
      {/* Search skeleton */}
      <View style={styles.searchContainer}>
        <Skeleton variant="rounded" width="100%" height={44} />
      </View>

      {/* Categories skeleton */}
      <View style={styles.categoryListContent}>
        <SkeletonGroup count={5} direction="horizontal" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={80} height={36} />
        </SkeletonGroup>
      </View>

      {/* Menu grid skeleton */}
      <View style={styles.menuItemGrid}>
        <SkeletonGroup count={6} direction="horizontal" spacing={Spacing.md}>
          <Skeleton variant="rounded" width={160} height={140} />
        </SkeletonGroup>
      </View>
    </ThemedView>
  );
}

// ============================================================================
// Main Order Entry Screen
// ============================================================================

export default function OrderEntryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();

  // Get tableId from route params
  const params = useLocalSearchParams<{ tableId?: string }>();
  const tableId = params.tableId ?? '';

  // Determine if tablet layout
  const isTablet = width >= TABLET_BREAKPOINT;

  // Fetch table data
  const { data: tableData } = useTable({
    id: tableId,
    queryOptions: { enabled: Boolean(tableId) },
  });
  const table = tableData;

  // Fetch menu data
  const {
    categories,
    items,
    extras,
    isLoading: isLoadingMenu,
    refetchAll,
  } = useMenuData({
    itemParams: { isActive: true },
    extraParams: { isActive: true },
  });

  const categoriesData = categories.data?.data ?? [];
  const itemsData = items.data?.data ?? [];
  const extrasData = extras.data?.data ?? [];

  // Menu store for category selection and search
  const { selectedCategoryId, selectCategory, searchQuery, setSearchQuery } = useMenuStore();

  // Order store - state management for order items (Task 3.9)
  const orderItems = useOrderItems();
  const orderNotes = useOrderNotes();
  const { total: orderTotal, itemCount, totalQuantity, hasItems } = useOrderTotals();
  const {
    initializeOrder,
    clearOrder,
    addItem,
    removeItem,
    updateItemQuantity,
    duplicateItem,
    setAvailableExtras,
  } = useOrderActions();

  // Send to kitchen hook (Task 3.10)
  const {
    isSending,
    isSuccess,
    error: sendError,
    sendToKitchen,
    retry: retrySend,
    reset: resetSendState,
    clearError: clearSendError,
  } = useSendToKitchen();

  // Local UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDisabledUntil, setSendDisabledUntil] = useState<number | null>(null);

  // Calculate modal state based on hook state
  const modalState: SendToKitchenModalState = useMemo(() => {
    if (isSending) return 'sending';
    if (isSuccess) return 'success';
    if (sendError) return 'error';
    return 'confirm';
  }, [isSending, isSuccess, sendError]);

  // Check if send button should be temporarily disabled
  const isSendTemporarilyDisabled = useMemo(() => {
    if (sendDisabledUntil === null) return false;
    return Date.now() < sendDisabledUntil;
  }, [sendDisabledUntil]);

  // Initialize order when screen mounts
  useEffect(() => {
    initializeOrder(tableId);
    return () => {
      // Cleanup: clear order when leaving screen (optional - can be kept for persistence)
      // clearOrder();
    };
  }, [tableId, initializeOrder]);

  // Update available extras when extras data changes
  useEffect(() => {
    if (extrasData.length > 0) {
      setAvailableExtras(extrasData);
    }
  }, [extrasData, setAvailableExtras]);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    let result = itemsData;

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter((item) => item.categoryId === selectedCategoryId);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const titleMatch =
          item.title.en?.toLowerCase().includes(query) ||
          item.title.ru?.toLowerCase().includes(query) ||
          item.title.tm?.toLowerCase().includes(query);
        const descMatch =
          item.description?.en?.toLowerCase().includes(query) ||
          item.description?.ru?.toLowerCase().includes(query) ||
          item.description?.tm?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      });
    }

    return result;
  }, [itemsData, selectedCategoryId, searchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchAll();
    setIsRefreshing(false);
  }, [refetchAll]);

  // Handle category selection
  const handleSelectCategory = useCallback(
    (categoryId: string | null) => {
      selectCategory(categoryId);
    },
    [selectCategory]
  );

  // Handle menu item press - add to order using orderStore
  const handleMenuItemPress = useCallback(
    (menuItem: MenuItem) => {
      addItem(menuItem, 1, '', []);
    },
    [addItem]
  );

  // Handle edit order item (placeholder for future modal)
  const handleEditItem = useCallback((_item: LocalOrderItem) => {
    // TODO: Open MenuItemModal for editing existing item
  }, []);

  // Handle remove order item using orderStore
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      removeItem(itemId);
    },
    [removeItem]
  );

  // Handle update quantity using orderStore
  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      updateItemQuantity(itemId, quantity);
    },
    [updateItemQuantity]
  );

  // Handle duplicate item using orderStore (will be used by edit modal)
  const _handleDuplicateItem = useCallback(
    (itemId: string) => {
      duplicateItem(itemId);
    },
    [duplicateItem]
  );

  // Handle send order button press - show confirmation modal
  const handleSendOrderPress = useCallback(() => {
    if (!hasItems || isSendTemporarilyDisabled) return;
    setShowSendModal(true);
  }, [hasItems, isSendTemporarilyDisabled]);

  // Handle confirmed send to kitchen
  const handleConfirmSend = useCallback(async () => {
    if (!hasItems) return;

    const result = await sendToKitchen(tableId, orderItems, orderNotes);

    if (result.success) {
      // Temporarily disable send button for 3 seconds to prevent double-sends
      setSendDisabledUntil(Date.now() + 3000);
    }
  }, [hasItems, tableId, orderItems, orderNotes, sendToKitchen]);

  // Handle cancel send modal
  const handleCancelSend = useCallback(() => {
    setShowSendModal(false);
    resetSendState();
  }, [resetSendState]);

  // Handle retry send
  const handleRetrySend = useCallback(async () => {
    clearSendError();
    await retrySend();
  }, [clearSendError, retrySend]);

  // Handle dismiss success - clear order and navigate back
  const handleDismissSuccess = useCallback(() => {
    setShowSendModal(false);
    clearOrder();
    resetSendState();
    router.back();
  }, [clearOrder, resetSendState]);

  // Handle close
  const handleClose = useCallback(() => {
    // Clear order when closing (user cancelled)
    clearOrder();
    router.back();
  }, [clearOrder]);

  // Show loading skeleton
  if (isLoadingMenu && itemsData.length === 0) {
    return <OrderEntrySkeleton />;
  }

  return (
    <ThemedView style={styles.container} testID="order-entry-screen">
      {/* Header with table info */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            testID="close-button"
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <ThemedText style={styles.headerTitleText}>
              {table ? `Table ${table.title}` : 'New Order'}
            </ThemedText>
            {table?.zone && (
              <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {getTranslatedText(table.zone.title)}
              </ThemedText>
            )}
          </View>
        </View>
        <Badge variant="default" size="sm" testID="item-count-badge">
          {`${itemCount} items`}
        </Badge>
      </View>

      {/* Main content */}
      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {/* Menu section */}
        <View style={[styles.menuSection, isTablet && styles.menuSectionTablet]}>
          {/* Search */}
          <MenuSearch value={searchQuery} onChangeText={setSearchQuery} />

          {/* Categories */}
          <CategoryList
            categories={categoriesData}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
          />

          {/* Menu items */}
          <ScrollView
            style={styles.menuScrollView}
            contentContainerStyle={styles.menuScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            testID="menu-scroll-view"
          >
            <MenuItemGrid
              items={filteredItems}
              orderItems={orderItems}
              onItemPress={handleMenuItemPress}
              isTablet={isTablet}
            />
          </ScrollView>
        </View>

        {/* Order summary section */}
        <View style={[styles.summarySection, isTablet && styles.summarySectionTablet]}>
          <OrderSummary
            items={orderItems}
            total={orderTotal}
            onEditItem={handleEditItem}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onSendOrder={handleSendOrderPress}
            isSending={isSending || isSendTemporarilyDisabled}
            isTablet={isTablet}
          />
        </View>
      </View>

      {/* Send to Kitchen Modal (Task 3.10) */}
      <SendToKitchenModal
        visible={showSendModal}
        state={modalState}
        itemCount={itemCount}
        totalQuantity={totalQuantity}
        errorMessage={sendError}
        onConfirm={handleConfirmSend}
        onCancel={handleCancelSend}
        onRetry={handleRetrySend}
        onDismissSuccess={handleDismissSuccess}
        testID="send-to-kitchen-modal"
      />

      {/* Loading overlay */}
      {(categories.isFetching || items.isFetching) && !isRefreshing && (
        <View style={styles.loadingOverlay} testID="loading-overlay">
          <Spinner size="sm" />
        </View>
      )}
    </ThemedView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    gap: 2,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  contentTablet: {
    flexDirection: 'row',
  },
  menuSection: {
    flex: 1,
  },
  menuSectionTablet: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  summarySection: {
    height: 280,
  },
  summarySectionTablet: {
    width: SIDEBAR_WIDTH,
    height: 'auto',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  searchInput: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingRight: 40,
    fontSize: 16,
  },
  searchClearButton: {
    position: 'absolute',
    right: Spacing.lg + Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  searchClearText: {
    fontSize: 16,
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  menuItemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  menuItemGridTablet: {
    gap: Spacing.lg,
  },
  menuItemGridCell: {
    width: '48%',
  },
  menuItemGridCellTablet: {
    width: '31%',
  },
  menuItemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 120,
    position: 'relative',
  },
  menuItemQuantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  menuItemQuantityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 'auto',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
  orderSummary: {
    flex: 1,
    borderTopWidth: 1,
  },
  orderSummaryTablet: {
    borderTopWidth: 0,
    borderLeftWidth: 1,
  },
  orderSummaryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  orderSummaryEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  orderItemsList: {
    flex: 1,
  },
  orderItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
});

/**
 * Order Entry Screen
 *
 * Main screen for creating new orders. Features:
 * - Split-screen layout: Menu (left/top) + Order Summary (right/bottom)
 * - Responsive to screen orientation
 * - Menu categories with items
 * - Live order summary with running totals
 * - Table information header
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMenuData } from '@/src/hooks/useMenuQueries';
import { useTable } from '@/src/hooks/useTableQueries';
import { getTranslatedText, useMenuStore } from '@/src/stores/menuStore';
import type { Extra, MenuItem, OrderItemExtra } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

/**
 * Order item in the local order state (before sending to API)
 */
export interface LocalOrderItem {
  id: string; // Local unique ID
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  extras: OrderItemExtra[];
  unitPrice: number;
  subtotal: number;
}

/**
 * Local order state
 */
export interface LocalOrder {
  tableId: string;
  items: LocalOrderItem[];
  notes: string;
}

// ============================================================================
// Constants
// ============================================================================

const TABLET_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 360;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique local ID
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
 * Format price for display
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
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

  // Local order state
  const [order, setOrder] = useState<LocalOrder>({
    tableId,
    items: [],
    notes: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Calculate order total
  const orderTotal = useMemo(() => calculateOrderTotal(order.items), [order.items]);

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

  // Handle menu item press - add to order
  const handleMenuItemPress = useCallback((menuItem: MenuItem) => {
    const unitPrice = parsePrice(menuItem.price);
    const newItem: LocalOrderItem = {
      id: generateLocalId(),
      menuItemId: menuItem.id,
      menuItem,
      quantity: 1,
      notes: '',
      extras: [],
      unitPrice,
      subtotal: unitPrice,
    };

    setOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  // Handle edit order item
  const handleEditItem = useCallback((_item: LocalOrderItem) => {}, []);

  // Handle remove order item
  const handleRemoveItem = useCallback((itemId: string) => {
    setOrder((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }, []);

  // Handle update quantity
  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      setOrder((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          if (item.id === itemId) {
            const newSubtotal = calculateItemSubtotal({ ...item, quantity }, extrasData);
            return { ...item, quantity, subtotal: newSubtotal };
          }
          return item;
        }),
      }));
    },
    [extrasData]
  );

  // Handle send order
  const handleSendOrder = useCallback(async () => {
    if (order.items.length === 0) return;

    setIsSending(true);
    try {
      // For now, just simulate success and navigate back
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear order and navigate back
      setOrder({ tableId, items: [], notes: '' });
      router.back();
    } catch (_error) {
    } finally {
      setIsSending(false);
    }
  }, [order, tableId]);

  // Handle close
  const handleClose = useCallback(() => {
    router.back();
  }, []);

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
          {`${order.items.length} items`}
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
              orderItems={order.items}
              onItemPress={handleMenuItemPress}
              isTablet={isTablet}
            />
          </ScrollView>
        </View>

        {/* Order summary section */}
        <View style={[styles.summarySection, isTablet && styles.summarySectionTablet]}>
          <OrderSummary
            items={order.items}
            total={orderTotal}
            onEditItem={handleEditItem}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onSendOrder={handleSendOrder}
            isSending={isSending}
            isTablet={isTablet}
          />
        </View>
      </View>

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

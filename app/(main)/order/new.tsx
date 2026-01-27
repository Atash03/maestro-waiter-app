/**
 * Order Entry Screen
 *
 * Main screen for creating new orders or adding items to existing orders. Features:
 * - Full-screen menu with category drill-down
 * - Bottom card showing item count + subtotal (fixed at bottom)
 * - Expandable bottom sheet with order items, totals, and send button
 * - Direct "Send to Kitchen" (no confirmation modal)
 * - Uses orderStore for state management (Task 3.9)
 * - Add items to existing order (Task 4.5)
 */

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryCardGrid, CategoryList } from '@/components/menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackButton } from '@/components/ui/BackButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LocationInfo } from '@/components/ui/LocationInfo';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useMenuData } from '@/src/hooks/useMenuQueries';
import { useSendToKitchen } from '@/src/hooks/useSendToKitchen';
import { useTable } from '@/src/hooks/useTableQueries';
import { getImageUrl } from '@/src/services/api/client';
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
import type { Extra, MenuCategory, MenuItem, OrderItemExtra } from '@/src/types/models';

// ============================================================================
// Constants
// ============================================================================

const TABLET_BREAKPOINT = 768;
const SHEET_HEIGHT = 420;
const BOTTOM_CARD_HEIGHT = 56;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const placeholderImage = require('@/assets/images/placeholder.png');

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
  const colorScheme = useEffectiveColorScheme();
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
        placeholder="Search menu items..."
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
  const colorScheme = useEffectiveColorScheme();
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
  const resolvedUrl = getImageUrl(item.imagePath);
  const imageSource = resolvedUrl ? { uri: resolvedUrl } : placeholderImage;

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
        {/* Image */}
        <View style={styles.menuItemImageContainer}>
          <Image
            source={imageSource}
            style={styles.menuItemImage}
            contentFit="cover"
            transition={200}
          />

          {/* Prep time badge */}
          {item.timeForPreparation && (
            <View style={[styles.prepTimeBadge, { backgroundColor: colors.background }]}>
              <ThemedText style={[styles.prepTimeText, { color: colors.textMuted }]}>
                {typeof item.timeForPreparation === 'object'
                  ? `${item.timeForPreparation.minutes} min`
                  : `${item.timeForPreparation} min`}
              </ThemedText>
            </View>
          )}

          {/* Quantity badge or add button */}
          {quantity > 0 ? (
            <View
              testID={`menu-item-quantity-${item.id}`}
              style={[styles.menuItemActionButton, { backgroundColor: BrandColors.primary }]}
            >
              <ThemedText style={styles.menuItemActionText}>{quantity}</ThemedText>
            </View>
          ) : (
            <View style={[styles.menuItemActionButton, { backgroundColor: colors.background }]}>
              <ThemedText style={[styles.menuItemActionIcon, { color: colors.text }]}>+</ThemedText>
            </View>
          )}
        </View>

        {/* Item info */}
        <View style={styles.menuItemInfo}>
          <ThemedText style={styles.menuItemTitle} numberOfLines={1}>
            {getTranslatedText(item.title)}
          </ThemedText>
          <ThemedText style={[styles.menuItemPrice, { color: colors.textSecondary }]}>
            {formatPrice(parsePrice(item.price))} TMT
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
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

function OrderSummaryItem({ item, onRemove, onUpdateQuantity }: OrderSummaryItemProps) {
  const colorScheme = useEffectiveColorScheme();
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
            + {item.extras.map((e) => e.extraTitle?.en || 'Extra').join(', ')}
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
// Loading Skeleton
// ============================================================================

function OrderEntrySkeleton() {
  return (
    <ThemedView style={styles.container} testID="order-entry-skeleton">
      {/* Category card grid skeleton */}
      <View style={styles.skeletonGrid}>
        <SkeletonGroup count={4} direction="horizontal" spacing={Spacing.md}>
          <Skeleton variant="rounded" width={160} height={200} />
        </SkeletonGroup>
      </View>
    </ThemedView>
  );
}

// ============================================================================
// Main Order Entry Screen
// ============================================================================

export default function OrderEntryScreen() {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Get tableId and orderId from route params
  // orderId is present when adding items to an existing order (Task 4.5)
  const params = useLocalSearchParams<{ tableId?: string; orderId?: string }>();
  const tableId = params.tableId ?? '';
  const existingOrderId = params.orderId ?? '';
  const isAddingToExistingOrder = Boolean(existingOrderId);

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
    reset: resetSendState,
  } = useSendToKitchen();

  // Local UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendDisabledUntil, setSendDisabledUntil] = useState<number | null>(null);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);

  // Expandable card animation (UI thread via Reanimated)
  const sheetOpen = useSharedValue(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const sheetExpandedHeight = Math.min(SHEET_HEIGHT, height * 0.6);

  // Card height: collapsed = BOTTOM_CARD_HEIGHT, expanded = full
  const animatedCardStyle = useAnimatedStyle(() => ({
    height: BOTTOM_CARD_HEIGHT + sheetOpen.value * sheetExpandedHeight,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: sheetOpen.value * 0.4,
    pointerEvents: sheetOpen.value > 0.5 ? ('auto' as const) : ('none' as const),
  }));

  const toggleSheet = useCallback(() => {
    const opening = !isSheetOpen;
    setIsSheetOpen(opening);
    sheetOpen.value = withSpring(opening ? 1 : 0, {
      stiffness: 600,
    });
  }, [isSheetOpen, sheetOpen]);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    sheetOpen.value = withSpring(0, {
      stiffness: 600,
    });
  }, [sheetOpen]);

  // Derived category data for drill-down navigation
  const parentCategories = useMemo(
    () => categoriesData.filter((cat) => cat.parentId === null),
    [categoriesData]
  );

  const childCategories = useMemo(() => {
    if (!selectedParentCategoryId) return [];
    // Backend returns a flat list — filter by parentId to find children
    return categoriesData.filter((cat) => cat.parentId === selectedParentCategoryId);
  }, [categoriesData, selectedParentCategoryId]);

  const isDrilledDown = selectedParentCategoryId !== null;
  const selectedParentHasChildren = childCategories.length > 0;

  // Check if send button should be temporarily disabled
  const isSendTemporarilyDisabled = useMemo(() => {
    if (sendDisabledUntil === null) return false;
    return Date.now() < sendDisabledUntil;
  }, [sendDisabledUntil]);

  // Initialize order when screen mounts
  useEffect(() => {
    initializeOrder(tableId);
  }, [tableId, initializeOrder]);

  // Update available extras when extras data changes
  useEffect(() => {
    if (extrasData.length > 0) {
      setAvailableExtras(extrasData);
    }
  }, [extrasData, setAvailableExtras]);

  // Navigate back on successful send
  useEffect(() => {
    if (isSuccess) {
      clearOrder();
      resetSendState();
      router.back();
    }
  }, [isSuccess, clearOrder, resetSendState]);

  // Filter items by category and search (only when drilled down into a parent category)
  const filteredItems = useMemo(() => {
    // No items shown on the parent category grid view
    if (!isDrilledDown) return [];

    let result = itemsData;

    // When searching, search across all menu items (ignore category)
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
    } else {
      // No search — filter by category
      if (selectedParentHasChildren) {
        if (selectedCategoryId) {
          result = result.filter((item) => item.categoryId === selectedCategoryId);
        }
      } else {
        result = result.filter((item) => item.categoryId === selectedParentCategoryId);
      }
    }

    return result;
  }, [
    itemsData,
    isDrilledDown,
    selectedParentHasChildren,
    selectedCategoryId,
    selectedParentCategoryId,
    searchQuery,
  ]);

  // Global search across all menu items (used on parent category view)
  const globalSearchItems = useMemo(() => {
    if (isDrilledDown || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return itemsData.filter((item) => {
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
  }, [itemsData, isDrilledDown, searchQuery]);

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

  // Handle parent category card press - drill down to child categories
  const handleParentCategoryPress = useCallback(
    (category: MenuCategory) => {
      setSearchQuery('');
      setSelectedParentCategoryId(category.id);

      // Backend returns flat list — find children by parentId
      const children = categoriesData.filter((cat) => cat.parentId === category.id);
      if (children.length > 0) {
        // Auto-select first child category
        selectCategory(children[0].id);
      } else {
        // No children — select the parent itself to show its items
        selectCategory(category.id);
      }
    },
    [categoriesData, selectCategory, setSearchQuery]
  );

  // Handle back from child view to parent category grid
  const handleBackToParentCategories = useCallback(() => {
    setSelectedParentCategoryId(null);
    selectCategory(null);
    setSearchQuery('');
  }, [selectCategory, setSearchQuery]);

  // Handle menu item press - add to order using orderStore
  const handleMenuItemPress = useCallback(
    (menuItem: MenuItem) => {
      addItem(menuItem, 1, '', []);
    },
    [addItem]
  );

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

  // Handle send order — fire API call immediately (no modal)
  const handleSendOrder = useCallback(async () => {
    if (!hasItems || isSendTemporarilyDisabled || isSending) return;

    const result = await sendToKitchen(
      tableId,
      orderItems,
      orderNotes,
      existingOrderId || undefined
    );

    if (result.success) {
      // Temporarily disable send button for 3 seconds to prevent double-sends
      setSendDisabledUntil(Date.now() + 3000);
    }
  }, [
    hasItems,
    isSendTemporarilyDisabled,
    isSending,
    tableId,
    orderItems,
    orderNotes,
    existingOrderId,
    sendToKitchen,
  ]);

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

  const bottomInset = Math.max(insets.bottom, Spacing.md);

  return (
    <ThemedView style={styles.container} testID="order-entry-screen">
      {/* Header with table info */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top + Spacing.sm },
        ]}
      >
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
              {isAddingToExistingOrder ? 'Add Items' : 'New Order'}
            </ThemedText>
            {table && (
              <LocationInfo
                zoneTitle={table.zone?.title}
                tableTitle={table.title}
                testID="header-location-info"
              />
            )}
          </View>
        </View>
        <Badge variant="default" size="sm" testID="item-count-badge">
          {`${itemCount} items`}
        </Badge>
      </View>

      {/* Menu content — full height */}
      <View style={styles.menuSection}>
        {isDrilledDown ? (
          <>
            {/* Back button + search */}
            <View style={[styles.drillDownHeader, { borderBottomColor: colors.border }]}>
              <BackButton
                onPress={handleBackToParentCategories}
                testID="back-to-categories-button"
                size={28}
              />
              <View style={styles.drillDownSearchContainer}>
                <MenuSearch value={searchQuery} onChangeText={setSearchQuery} />
              </View>
            </View>

            {/* Child category tabs (only if parent has children) */}
            {selectedParentHasChildren && (
              <CategoryList
                categories={childCategories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                showAllOption={false}
              />
            )}

            {/* Menu items */}
            <ScrollView
              style={styles.menuScrollView}
              contentContainerStyle={[
                styles.menuScrollContent,
                { paddingBottom: BOTTOM_CARD_HEIGHT + bottomInset + Spacing.lg },
              ]}
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
          </>
        ) : (
          /* Parent category card grid */
          <>
          <MenuSearch value={searchQuery} onChangeText={setSearchQuery} />
          <ScrollView
            style={styles.menuScrollView}
            contentContainerStyle={[
              styles.menuScrollContent,
              { paddingBottom: BOTTOM_CARD_HEIGHT + bottomInset + Spacing.lg },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            testID="parent-category-scroll-view"
          >
            {searchQuery.trim() ? (
              <MenuItemGrid
                items={globalSearchItems}
                orderItems={orderItems}
                onItemPress={handleMenuItemPress}
                isTablet={isTablet}
              />
            ) : (
              <CategoryCardGrid
                categories={parentCategories}
                onCategoryPress={handleParentCategoryPress}
                isTablet={isTablet}
              />
            )}
          </ScrollView>
          </>
        )}
      </View>

      {/* Backdrop — dismiss on tap */}
      <Animated.View style={[styles.sheetBackdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      {/* Expandable bottom card */}
      <Animated.View
        testID="bottom-order-card"
        style={[
          styles.expandableCard,
          {
            bottom: bottomInset,
            borderColor: BrandColors.primary,
            backgroundColor: colors.background,
          },
          animatedCardStyle,
        ]}
      >
        {/* Expanded content — order items + totals + send button */}
        {isSheetOpen && (
          <View style={styles.expandedContent}>
            <ScrollView
              style={styles.orderItemsList}
              showsVerticalScrollIndicator={false}
              testID="order-items-list"
            >
              {orderItems.map((item) => (
                <OrderSummaryItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))}
            </ScrollView>

            <View style={[styles.orderTotals, { borderTopColor: colors.border }]}>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Items ({totalQuantity})</ThemedText>
                <ThemedText style={styles.totalValue}>${formatPrice(orderTotal)}</ThemedText>
              </View>

              {sendError && (
                <ThemedText style={[styles.sendErrorText, { color: colors.error }]}>
                  {sendError}
                </ThemedText>
              )}

              <Button
                testID="send-order-button"
                variant="primary"
                size="lg"
                onPress={handleSendOrder}
                loading={isSending}
                disabled={isSending || !hasItems || isSendTemporarilyDisabled}
                fullWidth
              >
                {isAddingToExistingOrder ? 'Add to Order' : 'Send to Kitchen'}
              </Button>
            </View>
          </View>
        )}

        {/* Card summary row (always visible at bottom) */}
        <Pressable style={styles.cardSummaryRow} onPress={hasItems ? toggleSheet : undefined}>
          {hasItems ? (
            <View style={styles.bottomCardContent}>
              <ThemedText style={styles.bottomCardItemCount}>
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </ThemedText>
              <ThemedText style={[styles.bottomCardTotal, { color: BrandColors.primary }]}>
                ${formatPrice(orderTotal)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.bottomCardEmpty, { color: colors.textMuted }]}>
              Tap items to add to order
            </ThemedText>
          )}
        </Pressable>
      </Animated.View>

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
    flexDirection: 'row',
    alignContent: 'center',
    gap: 10,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuSection: {
    flex: 1,
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
    gap: Spacing.xs,
  },
  menuItemGridTablet: {
    gap: Spacing.sm,
  },
  menuItemGridCell: {
    width: '31%',
  },
  menuItemGridCellTablet: {
    width: '23%',
  },
  menuItemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
  },
  menuItemImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  prepTimeBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderBottomRightRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  prepTimeText: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  menuItemActionButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    elevation: 2,
  },
  menuItemActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  menuItemActionIcon: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 16,
  },
  menuItemInfo: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 3,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuItemPrice: {
    fontSize: 11,
    fontWeight: '600',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: BorderRadius.xl,
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

  // Expandable bottom card
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  expandableCard: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    zIndex: 11,
  },
  expandedContent: {
    flex: 1,
  },
  cardSummaryRow: {
    height: BOTTOM_CARD_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bottomCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomCardItemCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomCardTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomCardEmpty: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Order items in sheet
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
  sendErrorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
  drillDownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
    borderBottomWidth: 1,
  },
  drillDownSearchContainer: {
    flex: 1,
  },
  skeletonGrid: {
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});

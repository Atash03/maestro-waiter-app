/**
 * Orders List Screen
 *
 * Displays a list of all active orders with filtering by status and type.
 * Features:
 * - Filter by status: All, Pending, In Progress, Completed, Cancelled
 * - Filter by type: Dine-in, Delivery, To Go
 * - Sort by: time created, table number
 * - Pull-to-refresh
 * - Real-time updates via SSE (future implementation)
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { NotificationBell } from '@/components/common';
import { OrderCard } from '@/components/orders/OrderCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  countOrdersWithReadyItems,
  filterOrdersByStatus,
  filterOrdersByType,
  sortOrdersByDate,
  useHapticRefresh,
  useOrders,
} from '@/src/hooks';
import { OrderStatus, OrderType } from '@/src/types/enums';
import type { Order } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

type StatusFilter = 'all' | OrderStatus;
type TypeFilter = 'all' | OrderType;
type SortOption = 'time' | 'table';

interface FilterTabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: OrderStatus.PENDING },
  { label: 'In Progress', value: OrderStatus.IN_PROGRESS },
  { label: 'Completed', value: OrderStatus.COMPLETED },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
];

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Dine-in', value: OrderType.DINE_IN },
  { label: 'Delivery', value: OrderType.DELIVERY },
  { label: 'To Go', value: OrderType.TO_GO },
];

// Performance optimization constants for FlatList
const ORDER_CARD_HEIGHT = 116; // Estimated height of OrderCard (padding + content)
const ORDER_CARD_MARGIN = 8; // Spacing.sm margin bottom

// ============================================================================
// Sub-Components
// ============================================================================

function FilterTab({ label, isActive, onPress, count, testID }: FilterTabProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterTab,
        {
          backgroundColor: isActive ? BrandColors.primary : colors.backgroundSecondary,
          borderColor: isActive ? BrandColors.primary : colors.border,
        },
      ]}
      testID={testID}
    >
      <ThemedText style={[styles.filterTabText, { color: isActive ? '#FFFFFF' : colors.text }]}>
        {label}
      </ThemedText>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.filterCountBadge,
            {
              backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.border,
            },
          ]}
        >
          <ThemedText
            style={[styles.filterCountText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}
          >
            {count}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

function OrdersListSkeleton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.skeletonContainer}>
      {/* Filter tabs skeleton */}
      <View style={styles.filterRow}>
        <SkeletonGroup count={4} direction="row" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={80} height={36} />
        </SkeletonGroup>
      </View>

      {/* Type filter skeleton */}
      <View style={[styles.typeFilterRow, { borderBottomColor: colors.border }]}>
        <SkeletonGroup count={3} direction="row" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={70} height={28} />
        </SkeletonGroup>
      </View>

      {/* Order cards skeleton */}
      <View style={styles.listContent}>
        <SkeletonGroup count={5} direction="column" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width="100%" height={100} />
        </SkeletonGroup>
      </View>
    </View>
  );
}

function EmptyState({ statusFilter }: { statusFilter: StatusFilter }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getMessage = () => {
    if (statusFilter === 'all') {
      return 'No orders found';
    }
    return `No ${statusFilter.toLowerCase()} orders`;
  };

  return (
    <View style={styles.emptyContainer}>
      <ThemedText style={[styles.emptyIcon]}>📋</ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>{getMessage()}</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Orders will appear here when created
      </ThemedText>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>⚠️</ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
        Failed to load orders
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Please check your connection and try again
      </ThemedText>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: BrandColors.primary }]}
        testID="retry-button"
      >
        <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OrdersListScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy] = useState<SortOption>('time');

  // Data fetching - get active orders by default
  const { data, isLoading, error, refetch, isFetching } = useOrders();

  // Haptic refresh
  const { isRefreshing, handleRefresh } = useHapticRefresh({
    onRefresh: async () => {
      await refetch();
    },
  });

  // Compute filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let orders = data?.data ?? [];

    // Filter by status
    if (statusFilter !== 'all') {
      orders = filterOrdersByStatus(orders, statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      orders = filterOrdersByType(orders, typeFilter);
    }

    // Sort
    if (sortBy === 'time') {
      orders = sortOrdersByDate(orders, false); // newest first
    } else if (sortBy === 'table') {
      orders = [...orders].sort((a, b) => {
        const tableA = a.table?.title ?? '';
        const tableB = b.table?.title ?? '';
        return tableA.localeCompare(tableB);
      });
    }

    return orders;
  }, [data?.data, statusFilter, typeFilter, sortBy]);

  // Compute counts for each status
  const statusCounts = useMemo(() => {
    const orders = data?.data ?? [];
    return {
      all: orders.length,
      [OrderStatus.PENDING]: filterOrdersByStatus(orders, OrderStatus.PENDING).length,
      [OrderStatus.IN_PROGRESS]: filterOrdersByStatus(orders, OrderStatus.IN_PROGRESS).length,
      [OrderStatus.COMPLETED]: filterOrdersByStatus(orders, OrderStatus.COMPLETED).length,
      [OrderStatus.CANCELLED]: filterOrdersByStatus(orders, OrderStatus.CANCELLED).length,
    };
  }, [data?.data]);

  // Count orders with ready items
  const readyOrdersCount = useMemo(() => {
    return countOrdersWithReadyItems(data?.data);
  }, [data?.data]);

  // Handlers
  const handleOrderPress = useCallback(
    (order: Order) => {
      router.push(`/(main)/order/${order.id}`);
    },
    [router]
  );

  const handleStatusFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
  }, []);

  const handleTypeFilterChange = useCallback((filter: TypeFilter) => {
    setTypeFilter(filter);
  }, []);

  // Render order item
  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard order={item} onPress={handleOrderPress} testID={`order-card-${item.id}`} />
    ),
    [handleOrderPress]
  );

  const keyExtractor = useCallback((item: Order) => item.id, []);

  // Optimized getItemLayout for better scroll performance
  const getItemLayout = useCallback(
    (_data: ArrayLike<Order> | null | undefined, index: number) => ({
      length: ORDER_CARD_HEIGHT,
      offset: (ORDER_CARD_HEIGHT + ORDER_CARD_MARGIN) * index,
      index,
    }),
    []
  );

  // Loading state
  if (isLoading && !data?.data?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.headerTitle}>Orders</ThemedText>
        </View>
        <OrdersListSkeleton />
      </ThemedView>
    );
  }

  // Error state
  if (error && !data?.data?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.headerTitle}>Orders</ThemedText>
        </View>
        <ErrorState onRetry={handleRefresh} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.headerTitle}>Orders</ThemedText>
          {readyOrdersCount > 0 && (
            <Badge variant="ready" size="sm">
              {readyOrdersCount} ready
            </Badge>
          )}
        </View>
        <View style={styles.headerRight}>
          <Badge variant="default" size="sm">
            {filteredOrders.length} orders
          </Badge>
          <NotificationBell testID="notification-bell" />
        </View>
      </View>

      {/* Status Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((filter) => (
          <FilterTab
            key={filter.value}
            label={filter.label}
            isActive={statusFilter === filter.value}
            onPress={() => handleStatusFilterChange(filter.value)}
            count={statusCounts[filter.value as keyof typeof statusCounts]}
            testID={`status-filter-${filter.value}`}
          />
        ))}
      </ScrollView>

      {/* Type Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.typeFilterScrollView, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.typeFilterRow}
      >
        {TYPE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => handleTypeFilterChange(filter.value)}
            style={[
              styles.typeFilterChip,
              {
                backgroundColor:
                  typeFilter === filter.value ? colors.backgroundSecondary : 'transparent',
                borderColor: typeFilter === filter.value ? colors.border : 'transparent',
              },
            ]}
            testID={`type-filter-${filter.value}`}
          >
            <ThemedText
              style={[
                styles.typeFilterText,
                {
                  color: typeFilter === filter.value ? colors.text : colors.textSecondary,
                  fontWeight: typeFilter === filter.value ? '600' : '400',
                },
              ]}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BrandColors.primary}
            />
          }
          testID="orders-list"
          // Performance optimizations
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
        />
      )}

      {/* Loading Overlay */}
      {isFetching && !isRefreshing && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.loadingOverlay}
        >
          <Spinner size="sm" />
        </Animated.View>
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
    paddingTop: Spacing['2xl'] + 20,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeFilterScrollView: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typeFilterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  typeFilterText: {
    fontSize: 12,
  },
  listContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonContainer: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: Spacing['2xl'] + 60,
    right: Spacing.lg,
  },
});

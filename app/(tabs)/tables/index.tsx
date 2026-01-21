/**
 * Tables Screen - Tables Tab
 *
 * Displays tables in a 2-column grid layout organized by zones.
 * Features:
 * - Zone tabs/segmented control for filtering
 * - 2-column grid of table cards
 * - Color-coded table status (available, occupied, reserved, etc.)
 * - Pull-to-refresh for data updates
 */

import { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '@/components/common';
import type { TableItemData, TableStatus } from '@/components/tables';
import { getStatusColor, StatusLegend } from '@/components/tables';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHapticRefresh } from '@/src/hooks';
import { useTablesAndZones, useTablesByZone } from '@/src/hooks/useTableQueries';
import { useTableStore } from '@/src/stores/tableStore';
import type { Table, Translation, Zone } from '@/src/types/models';
import { useEffect } from 'react';

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_HEIGHT = 100;
const NUM_COLUMNS = 2;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get translated text from a Translation object
 * Falls back to 'en' if the requested language is not available
 */
function getTranslatedText(translation: Translation, lang: 'en' | 'ru' | 'tm' = 'en'): string {
  return translation[lang] || translation.en || '';
}

/**
 * Get table status - for now returns 'available' as we don't have order data yet
 * This will be enhanced in Phase 4 when we integrate with orders
 */
function getTableStatus(_table: Table): TableStatus {
  // TODO: Integrate with orders/waiter calls in Phase 4
  // For now, return 'available' as default
  return 'available';
}

/**
 * Get a lighter variant of the status color for the pulse effect
 */
function getPulseColor(status: TableStatus): string {
  const color = getStatusColor(status);
  return `${color}40`; // 40 = 25% opacity in hex
}

// ============================================================================
// Zone Tabs Component
// ============================================================================

interface ZoneTabsProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
}

function ZoneTabs({ zones, selectedZoneId, onSelectZone }: ZoneTabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const activeZones = useMemo(() => zones.filter((zone) => zone.isActive), [zones]);

  return (
    <View style={styles.zoneTabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.zoneTabsContainer}
      >
        {/* All Zones Tab */}
        <TouchableOpacity
          testID="zone-tab-all"
          style={[
            styles.zoneTab,
            { borderColor: colors.border },
            selectedZoneId === null && {
              backgroundColor: colors.tint,
              borderColor: colors.tint,
            },
          ]}
          onPress={() => onSelectZone(null)}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[styles.zoneTabText, selectedZoneId === null && styles.zoneTabTextActive]}
          >
            All
          </ThemedText>
        </TouchableOpacity>

        {/* Zone Tabs */}
        {activeZones.map((zone) => (
          <TouchableOpacity
            key={zone.id}
            testID={`zone-tab-${zone.id}`}
            style={[
              styles.zoneTab,
              { borderColor: colors.border },
              selectedZoneId === zone.id && {
                backgroundColor: colors.tint,
                borderColor: colors.tint,
              },
            ]}
            onPress={() => onSelectZone(zone.id)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[styles.zoneTabText, selectedZoneId === zone.id && styles.zoneTabTextActive]}
            >
              {getTranslatedText(zone.title)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}


// ============================================================================
// Table Grid Item Component
// ============================================================================

interface TableGridItemProps {
  table: TableItemData;
  onPress?: (table: Table) => void;
  onLongPress?: (table: Table) => void;
  isSelected?: boolean;
}

function TableGridItem({
  table,
  onPress,
  onLongPress,
  isSelected = false,
}: TableGridItemProps) {
  const statusColor = getStatusColor(table.status);

  // Animation values
  const pressScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Determine if we should show guest count (occupied with guests)
  const showGuestCount = table.status === 'occupied' && (table.guestCount ?? 0) > 0;

  // Pulse animation for needsAttention status
  useEffect(() => {
    if (table.hasPendingCall || table.status === 'needsAttention') {
      // Start pulsing animation
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseOpacity);
      cancelAnimation(pulseScale);
      pulseOpacity.value = withTiming(0, { duration: 200 });
      pulseScale.value = withTiming(1, { duration: 200 });
    }

    return () => {
      cancelAnimation(pulseOpacity);
      cancelAnimation(pulseScale);
    };
  }, [table.hasPendingCall, table.status, pulseOpacity, pulseScale]);

  // Handle selection scale
  useEffect(() => {
    if (isSelected) {
      pressScale.value = withSpring(1.02, { damping: 15, stiffness: 150 });
    } else {
      pressScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [isSelected, pressScale]);

  // Press handlers
  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    const targetScale = isSelected ? 1.02 : 1;
    pressScale.value = withSpring(targetScale, { damping: 15, stiffness: 150 });
  }, [pressScale, isSelected]);

  const handlePress = useCallback(() => {
    onPress?.(table);
  }, [onPress, table]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(table);
  }, [onLongPress, table]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // Selection border style
  const selectionStyle = isSelected
    ? {
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: statusColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
      }
    : {};

  return (
    <Animated.View
      style={[styles.gridItemContainer, containerAnimatedStyle]}
      testID={`table-grid-item-${table.id}`}
    >
      {/* Pulse effect layer (behind the table) */}
      {(table.hasPendingCall || table.status === 'needsAttention') && (
        <Animated.View
          style={[
            styles.pulseLayer,
            pulseAnimatedStyle,
            {
              backgroundColor: getPulseColor(table.status),
              borderRadius: BorderRadius.lg,
            },
          ]}
          testID={`table-pulse-${table.id}`}
        />
      )}

      {/* Table body */}
      <TouchableOpacity
        style={[
          styles.gridItemBody,
          {
            backgroundColor: table.color || statusColor,
            borderColor: statusColor,
          },
          selectionStyle,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayLongPress={300}
        testID={`table-touchable-${table.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Table ${table.title}, ${table.status}${table.guestCount ? `, ${table.guestCount} guests` : ''}`}
        accessibilityHint="Tap to select, long press for options"
      >
        {/* Table title */}
        <ThemedText style={styles.gridItemTitle} numberOfLines={1}>
          {table.title}
        </ThemedText>

        {/* Guest count or capacity */}
        {showGuestCount ? (
          <View style={styles.guestCountContainer} testID={`table-guests-${table.id}`}>
            <ThemedText style={styles.guestCountText}>{table.guestCount} guests</ThemedText>
          </View>
        ) : (
          table.capacity > 0 && (
            <ThemedText style={styles.capacityText} testID={`table-capacity-${table.id}`}>
              Seats {table.capacity}
            </ThemedText>
          )
        )}

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <ThemedText style={styles.statusBadgeText}>
            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
          </ThemedText>
        </View>

        {/* Attention indicator (red dot) */}
        {table.status === 'needsAttention' && (
          <View style={styles.attentionIndicator} testID={`table-attention-${table.id}`} />
        )}

        {/* Active order indicator */}
        {table.hasActiveOrder && table.status !== 'needsAttention' && (
          <View style={styles.orderIndicator} testID={`table-order-${table.id}`} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TablesGridSkeleton() {
  return (
    <ThemedView style={styles.skeletonContainer} testID="tables-grid-skeleton">
      {/* Zone tabs skeleton */}
      <View style={styles.zoneTabsWrapper}>
        <SkeletonGroup count={4} direction="horizontal" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={80} height={36} />
        </SkeletonGroup>
      </View>

      {/* Grid skeleton */}
      <View style={styles.gridSkeletonContainer}>
        <SkeletonGroup count={6} direction="vertical" spacing={Spacing.md}>
          <View style={styles.gridSkeletonRow}>
            <Skeleton variant="rectangular" width={(SCREEN_WIDTH - Spacing.lg * 3) / 2} height={GRID_ITEM_HEIGHT} />
            <Skeleton variant="rectangular" width={(SCREEN_WIDTH - Spacing.lg * 3) / 2} height={GRID_ITEM_HEIGHT} />
          </View>
        </SkeletonGroup>
      </View>
    </ThemedView>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.errorContainer} testID="tables-error">
      <ThemedText style={[styles.errorText, { color: colors.error }]}>{message}</ThemedText>
      <TouchableOpacity
        testID="retry-button"
        style={[styles.retryButton, { backgroundColor: colors.tint }]}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <ThemedView style={styles.emptyContainer} testID="tables-empty">
      <ThemedText style={styles.emptyText}>No tables found</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Tables will appear here once added to the system
      </ThemedText>
    </ThemedView>
  );
}


// ============================================================================
// Main Tables Screen
// ============================================================================

export default function TablesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Table store for selection
  const { selectedZoneId, selectZone, selectTable } =
    useTableStore();

  // Fetch tables and zones data
  const { tables, zones, isLoading, error, refetchAll } = useTablesAndZones({
    zoneParams: { isActive: true },
  });

  // Get tables data
  const tablesData = tables.data?.data ?? [];
  const zonesData = zones.data?.data ?? [];

  // Filter tables by selected zone
  const tablesFilteredByZone = useTablesByZone(tablesData, selectedZoneId ?? undefined);

  // Map tables with status
  const tablesWithStatus: TableItemData[] = useMemo(
    () =>
      tablesFilteredByZone.map((table) => ({
        ...table,
        status: getTableStatus(table),
      })),
    [tablesFilteredByZone]
  );

  // Haptic refresh
  const { isRefreshing, handleRefresh } = useHapticRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
  });

  // Table press handlers
  const handleTablePress = useCallback(
    (table: Table) => {
      selectTable(table.id);
      // TODO: Navigate to table detail or show info popup in Phase 2.5
    },
    [selectTable]
  );

  const handleTableLongPress = useCallback(
    (table: Table) => {
      selectTable(table.id);
      // TODO: Show table info popup in Phase 2.5
    },
    [selectTable]
  );

  // Zone selection handler
  const handleSelectZone = useCallback(
    (zoneId: string | null) => {
      selectZone(zoneId);
    },
    [selectZone]
  );

  // Render grid item
  const renderGridItem = useCallback(
    ({ item }: { item: TableItemData }) => (
      <TableGridItem
        table={item}
        onPress={handleTablePress}
        onLongPress={handleTableLongPress}
      />
    ),
    [handleTablePress, handleTableLongPress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: TableItemData) => item.id, []);

  // Get item layout for performance
  const getItemLayout = useCallback(
    (_: ArrayLike<TableItemData> | null | undefined, index: number) => ({
      length: GRID_ITEM_HEIGHT + Spacing.md,
      offset: (GRID_ITEM_HEIGHT + Spacing.md) * Math.floor(index / NUM_COLUMNS),
      index,
    }),
    []
  );


  // Show loading skeleton on initial load
  if (isLoading && tablesData.length === 0) {
    return <TablesGridSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState message={error.message || 'Failed to load tables'} onRetry={refetchAll} />
    );
  }

  return (
    <ThemedView style={styles.container} testID="tables-screen">
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <ThemedText style={styles.headerTitle}>Tables</ThemedText>
        <View style={styles.headerRight}>
          <Badge variant="default" size="sm" testID="table-count-badge">
            {`${tablesWithStatus.length} tables`}
          </Badge>
          <NotificationBell testID="notification-bell" />
        </View>
      </View>

      {/* Zone Tabs */}
      {zonesData.length > 0 && (
        <ZoneTabs
          zones={zonesData}
          selectedZoneId={selectedZoneId}
          onSelectZone={handleSelectZone}
        />
      )}

      {/* Tables Grid */}
      <FlatList
        data={tablesWithStatus}
        keyExtractor={keyExtractor}
        renderItem={renderGridItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.gridRow}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        testID="tables-grid"
      />

      {/* Status Legend - collapsible color key */}
      <StatusLegend position="bottom-right" />

      {/* Loading overlay for refresh */}
      {tables.isFetching && !isRefreshing && tablesData.length > 0 && (
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
    paddingBottom: Spacing.md,
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
  zoneTabsWrapper: {
    paddingVertical: Spacing.sm,
  },
  zoneTabsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  zoneTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  zoneTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  zoneTabTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  gridRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridItemContainer: {
    flex: 1,
    height: GRID_ITEM_HEIGHT,
  },
  pulseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridItemBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gridItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  capacityText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  guestCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  guestCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  attentionIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: StatusColors.needsAttention,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  orderIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: StatusColors.occupied,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skeletonContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  gridSkeletonContainer: {
    marginTop: Spacing.lg,
  },
  gridSkeletonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
});

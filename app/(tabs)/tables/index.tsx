/**
 * Floor Plan Screen - Tables Tab
 *
 * Displays an interactive floor plan with tables organized by zones.
 * Features:
 * - Zone tabs/segmented control for filtering
 * - Interactive table canvas with positioning from API
 * - Pinch-to-zoom and pan gestures
 * - Color-coded table status (available, occupied, reserved, etc.)
 * - Pull-to-refresh for data updates
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { TableItemData, TableStatus } from '@/components/tables';
import { getStatusColor, TableItem } from '@/components/tables';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTablesAndZones, useTablesByZone } from '@/src/hooks/useTableQueries';
import { useTableStore } from '@/src/stores/tableStore';
import type { Table, Translation, Zone } from '@/src/types/models';

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_PADDING = Spacing.lg;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const FLOOR_PLAN_SIZE = 600; // Base size for the floor plan canvas

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
 * Parse coordinate string to number, defaulting to 0
 */
function parseCoordinate(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
// Floor Plan Canvas Component
// ============================================================================

interface FloorPlanCanvasProps {
  tables: TableItemData[];
  onTablePress: (table: Table) => void;
  onTableLongPress: (table: Table) => void;
}

function FloorPlanCanvas({ tables, onTablePress, onTableLongPress }: FloorPlanCanvasProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Gesture state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Calculate canvas bounds based on table positions
  const canvasBounds = useMemo(() => {
    if (tables.length === 0) {
      return { width: FLOOR_PLAN_SIZE, height: FLOOR_PLAN_SIZE };
    }

    let maxX = 0;
    let maxY = 0;

    for (const table of tables) {
      const x = parseCoordinate(table.x);
      const y = parseCoordinate(table.y);
      const width = parseCoordinate(table.width) || 60;
      const height = parseCoordinate(table.height) || 60;

      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    return {
      width: Math.max(maxX + CANVAS_PADDING * 2, FLOOR_PLAN_SIZE),
      height: Math.max(maxY + CANVAS_PADDING * 2, FLOOR_PLAN_SIZE),
    };
  }, [tables]);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    });

  // Pan gesture for moving
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for the canvas
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View
        testID="floor-plan-canvas"
        style={[
          styles.floorPlanCanvas,
          animatedStyle,
          {
            width: canvasBounds.width,
            height: canvasBounds.height,
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
      >
        {/* Grid background pattern */}
        <View style={styles.gridPattern} />

        {/* Tables */}
        {tables.map((table) => (
          <TableItem
            key={table.id}
            table={table}
            onPress={onTablePress}
            onLongPress={onTableLongPress}
          />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================================================
// Status Legend Component
// ============================================================================

function StatusLegend() {
  const [isExpanded, setIsExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const statuses: { status: TableStatus; label: string }[] = [
    { status: 'available', label: 'Available' },
    { status: 'occupied', label: 'Occupied' },
    { status: 'reserved', label: 'Reserved' },
    { status: 'needsAttention', label: 'Needs Attention' },
  ];

  return (
    <View
      testID="status-legend"
      style={[styles.legendContainer, { backgroundColor: colors.background }]}
    >
      <TouchableOpacity
        testID="legend-toggle"
        style={styles.legendToggle}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.legendToggleText}>
          {isExpanded ? 'Hide Legend' : 'Legend'}
        </ThemedText>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.legendContent}>
          {statuses.map(({ status, label }) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: getStatusColor(status) }]} />
              <ThemedText style={styles.legendLabel}>{label}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function FloorPlanSkeleton() {
  return (
    <ThemedView style={styles.skeletonContainer} testID="floor-plan-skeleton">
      {/* Zone tabs skeleton */}
      <View style={styles.zoneTabsWrapper}>
        <SkeletonGroup count={4} direction="horizontal" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={80} height={36} />
        </SkeletonGroup>
      </View>

      {/* Floor plan skeleton */}
      <View style={styles.canvasContainer}>
        <Skeleton variant="rectangular" width={SCREEN_WIDTH - Spacing.lg * 2} height={400} />
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
    <ThemedView style={styles.errorContainer} testID="floor-plan-error">
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
    <ThemedView style={styles.emptyContainer} testID="floor-plan-empty">
      <ThemedText style={styles.emptyText}>No tables found</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Tables will appear here once added to the system
      </ThemedText>
    </ThemedView>
  );
}

// ============================================================================
// Main Floor Plan Screen
// ============================================================================

export default function FloorPlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Table store for selection
  const { selectedZoneId, selectZone, selectTable } = useTableStore();

  // Fetch tables and zones data
  const { tables, zones, isLoading, error, refetchAll } = useTablesAndZones({
    zoneParams: { isActive: true },
  });

  // Get tables data
  const tablesData = tables.data?.data ?? [];
  const zonesData = zones.data?.data ?? [];

  // Filter tables by selected zone
  const filteredTables = useTablesByZone(tablesData, selectedZoneId ?? undefined);

  // Map tables with status
  const tablesWithStatus: TableItemData[] = useMemo(
    () =>
      filteredTables.map((table) => ({
        ...table,
        status: getTableStatus(table),
      })),
    [filteredTables]
  );

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchAll();
    setIsRefreshing(false);
  }, [refetchAll]);

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

  // Show loading skeleton on initial load
  if (isLoading && tablesData.length === 0) {
    return <FloorPlanSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState message={error.message || 'Failed to load floor plan'} onRetry={refetchAll} />
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <ThemedView style={styles.container} testID="floor-plan-screen">
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Floor Plan</ThemedText>
          <Badge variant="default" size="sm" testID="table-count-badge">
            {`${tablesWithStatus.length} tables`}
          </Badge>
        </View>

        {/* Zone Tabs */}
        {zonesData.length > 0 && (
          <ZoneTabs
            zones={zonesData}
            selectedZoneId={selectedZoneId}
            onSelectZone={handleSelectZone}
          />
        )}

        {/* Floor Plan Canvas */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="floor-plan-scroll"
        >
          {tablesWithStatus.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.canvasContainer}>
              <FloorPlanCanvas
                tables={tablesWithStatus}
                onTablePress={handleTablePress}
                onTableLongPress={handleTableLongPress}
              />
            </View>
          )}
        </ScrollView>

        {/* Status Legend */}
        <StatusLegend />

        {/* Loading overlay for refresh */}
        {tables.isFetching && !isRefreshing && tablesData.length > 0 && (
          <View style={styles.loadingOverlay} testID="loading-overlay">
            <Spinner size="sm" />
          </View>
        )}
      </ThemedView>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    overflow: 'hidden',
  },
  floorPlanCanvas: {
    borderRadius: BorderRadius.lg,
    position: 'relative',
  },
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  legendContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  legendToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  legendLabel: {
    fontSize: 12,
  },
  skeletonContainer: {
    flex: 1,
    padding: Spacing.lg,
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

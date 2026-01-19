/**
 * Calls Screen (Task 5.5)
 *
 * Displays a list of all pending and recent waiter calls.
 * Features:
 * - Filter: Pending, Acknowledged, Completed
 * - Sort by time (newest first)
 * - Real-time updates via SSE
 * - Pull-to-refresh
 * - Quick actions: Acknowledge, Complete, Go to Table
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CallCard } from '@/components/calls';
import { NotificationBell } from '@/components/common';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  filterCallsByStatus,
  sortCallsByDate,
  useAcknowledgeCall,
  useCancelCall,
  useCompleteCall,
  useWaiterCalls,
} from '@/src/hooks';
import { WaiterCallStatus } from '@/src/types/enums';
import type { WaiterCall } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

type StatusFilter =
  | 'all'
  | WaiterCallStatus.PENDING
  | WaiterCallStatus.ACKNOWLEDGED
  | WaiterCallStatus.COMPLETED;

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
  { label: 'Pending', value: WaiterCallStatus.PENDING },
  { label: 'Acknowledged', value: WaiterCallStatus.ACKNOWLEDGED },
  { label: 'Completed', value: WaiterCallStatus.COMPLETED },
];

// ============================================================================
// Sub-Components
// ============================================================================

function FilterTab({ label, isActive, onPress, count, testID }: FilterTabProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
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
    </Pressable>
  );
}

function CallsListSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Filter tabs skeleton */}
      <View style={styles.filterRow}>
        <SkeletonGroup count={4} direction="horizontal" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width={80} height={36} />
        </SkeletonGroup>
      </View>

      {/* Call cards skeleton */}
      <View style={styles.listContent}>
        <SkeletonGroup count={5} direction="vertical" spacing={Spacing.sm}>
          <Skeleton variant="rounded" width="100%" height={120} />
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
      return 'No waiter calls';
    }
    if (statusFilter === WaiterCallStatus.PENDING) {
      return 'No pending calls';
    }
    if (statusFilter === WaiterCallStatus.ACKNOWLEDGED) {
      return 'No acknowledged calls';
    }
    if (statusFilter === WaiterCallStatus.COMPLETED) {
      return 'No completed calls';
    }
    return 'No calls found';
  };

  const getSubtitle = () => {
    if (statusFilter === WaiterCallStatus.PENDING) {
      return 'All clear! No customers need assistance.';
    }
    return 'Calls will appear here when customers request assistance.';
  };

  return (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>
        {statusFilter === WaiterCallStatus.PENDING ? '✓' : '🔔'}
      </ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>{getMessage()}</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {getSubtitle()}
      </ThemedText>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>!</ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
        Failed to load calls
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Please check your connection and try again
      </ThemedText>
      <Pressable
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: BrandColors.primary }]}
        testID="retry-button"
      >
        <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
      </Pressable>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CallsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Data fetching
  const { data, isLoading, error, refetch, isFetching } = useWaiterCalls();

  // Mutations
  const acknowledgeMutation = useAcknowledgeCall();
  const completeMutation = useCompleteCall();
  const cancelMutation = useCancelCall();

  // Compute filtered and sorted calls
  const filteredCalls = useMemo(() => {
    let calls = data?.data ?? [];

    // Filter by status
    if (statusFilter !== 'all') {
      calls = filterCallsByStatus(calls, statusFilter);
    }

    // Sort by time (newest first)
    calls = sortCallsByDate(calls, false);

    return calls;
  }, [data?.data, statusFilter]);

  // Compute counts for each status
  const statusCounts = useMemo(() => {
    const calls = data?.data ?? [];
    return {
      all: calls.length,
      [WaiterCallStatus.PENDING]: filterCallsByStatus(calls, WaiterCallStatus.PENDING).length,
      [WaiterCallStatus.ACKNOWLEDGED]: filterCallsByStatus(calls, WaiterCallStatus.ACKNOWLEDGED)
        .length,
      [WaiterCallStatus.COMPLETED]: filterCallsByStatus(calls, WaiterCallStatus.COMPLETED).length,
    };
  }, [data?.data]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleAcknowledge = useCallback(
    (id: string) => {
      setAcknowledgingId(id);
      acknowledgeMutation.mutate(id, {
        onSettled: () => {
          setAcknowledgingId(null);
        },
      });
    },
    [acknowledgeMutation]
  );

  const handleComplete = useCallback(
    (id: string) => {
      setCompletingId(id);
      completeMutation.mutate(id, {
        onSettled: () => {
          setCompletingId(null);
        },
      });
    },
    [completeMutation]
  );

  const handleCancel = useCallback(
    (id: string) => {
      setCancellingId(id);
      cancelMutation.mutate(id, {
        onSettled: () => {
          setCancellingId(null);
        },
      });
    },
    [cancelMutation]
  );

  const handleGoToTable = useCallback(
    (tableId: string) => {
      // Navigate to tables screen with the selected table
      router.push(`/(tabs)/tables?tableId=${tableId}`);
    },
    [router]
  );

  const handleStatusFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
  }, []);

  // Render call item
  const renderCallItem = useCallback(
    ({ item }: { item: WaiterCall }) => (
      <CallCard
        call={item}
        onAcknowledge={handleAcknowledge}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onGoToTable={handleGoToTable}
        isAcknowledging={acknowledgingId === item.id}
        isCompleting={completingId === item.id}
        isCancelling={cancellingId === item.id}
        testID={`call-card-${item.id}`}
      />
    ),
    [
      handleAcknowledge,
      handleComplete,
      handleCancel,
      handleGoToTable,
      acknowledgingId,
      completingId,
      cancellingId,
    ]
  );

  const keyExtractor = useCallback((item: WaiterCall) => item.id, []);

  // Loading state
  if (isLoading && !data?.data?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.headerTitle}>Calls</ThemedText>
        </View>
        <CallsListSkeleton />
      </ThemedView>
    );
  }

  // Error state
  if (error && !data?.data?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.headerTitle}>Calls</ThemedText>
        </View>
        <ErrorState onRetry={handleRefresh} />
      </ThemedView>
    );
  }

  const pendingCount = statusCounts[WaiterCallStatus.PENDING];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.headerTitle}>Calls</ThemedText>
          {pendingCount > 0 && (
            <Badge variant="needsAttention" size="sm">
              {`${pendingCount} pending`}
            </Badge>
          )}
        </View>
        <View style={styles.headerRight}>
          <Badge variant="default" size="sm">
            {`${filteredCalls.length} calls`}
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

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderCallItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BrandColors.primary}
            />
          }
          testID="calls-list"
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
    borderBottomWidth: 1,
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
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
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

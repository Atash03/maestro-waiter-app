/**
 * Profile Screen
 *
 * Displays user profile information and today's activity summary.
 * Features:
 * - User info display (username, role)
 * - Current session info
 * - Today's activity summary (orders taken, total sales, calls handled)
 * - Settings link
 * - Logout button with open order checking
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getActiveOrders, useHapticRefresh, useOrders, useWaiterCalls } from '@/src/hooks';
import { useAccount, useAuthLoading, useAuthStore } from '@/src/stores/authStore';
import { OrderStatus } from '@/src/types/enums';
import type { Order, WaiterCall } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  testID?: string;
}

interface ActivityStats {
  ordersTaken: number;
  totalSales: number;
  callsHandled: number;
  activeOrders: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get today's date range for filtering
 */
function getTodayDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Check if a date is today
 */
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const { start, end } = getTodayDateRange();
  return date >= start && date <= end;
}

/**
 * Calculate activity stats from orders and calls
 */
function calculateActivityStats(
  orders: Order[] | undefined,
  calls: WaiterCall[] | undefined,
  waiterId: string | undefined
): ActivityStats {
  const todayOrders = orders?.filter((order) => isToday(order.createdAt)) ?? [];
  const todayCalls = calls?.filter((call) => isToday(call.createdAt)) ?? [];

  // Filter by waiter if we have a waiter ID
  const waiterOrders = waiterId
    ? todayOrders.filter((order) => order.waiterId === waiterId)
    : todayOrders;
  const waiterCalls = waiterId
    ? todayCalls.filter((call) => call.waiterId === waiterId)
    : todayCalls;

  // Calculate total sales from completed orders
  const totalSales = waiterOrders
    .filter((order) => order.orderStatus === OrderStatus.COMPLETED)
    .reduce((sum, order) => sum + Number.parseFloat(order.totalAmount || '0'), 0);

  // Count active orders
  const activeOrders = waiterOrders.filter(
    (order) =>
      order.orderStatus === OrderStatus.PENDING || order.orderStatus === OrderStatus.IN_PROGRESS
  ).length;

  // Count completed calls
  const callsHandled = waiterCalls.filter((call) => call.status === 'completed').length;

  return {
    ordersTaken: waiterOrders.length,
    totalSales,
    callsHandled,
    activeOrders,
  };
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TMT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get role display name
 */
function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    waiter: 'Waiter',
    chef: 'Chef',
    cashier: 'Cashier',
  };
  return roleMap[role.toLowerCase()] ?? role;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ title, value, subtitle, icon, testID }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Card style={styles.statCard} testID={testID} elevated bordered={false}>
      <View style={styles.statCardContent}>
        <ThemedText style={styles.statIcon}>{icon}</ThemedText>
        <View style={styles.statTextContainer}>
          <ThemedText style={[styles.statValue, { color: colors.text }]}>{value}</ThemedText>
          <ThemedText style={[styles.statTitle, { color: colors.textSecondary }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.statSubtitle, { color: colors.textMuted }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Avatar skeleton */}
      <View style={styles.avatarSection}>
        <Skeleton variant="circular" width={80} height={80} />
        <View style={styles.avatarSkeletonText}>
          <Skeleton variant="text" width={150} height={24} />
          <Skeleton variant="text" width={100} height={18} />
        </View>
      </View>

      {/* Stats skeleton */}
      <View style={styles.statsSection}>
        <SkeletonGroup count={2} direction="horizontal" spacing={Spacing.md}>
          <Skeleton variant="rounded" width="48%" height={100} />
        </SkeletonGroup>
        <View style={styles.statsRowSpacer} />
        <SkeletonGroup count={2} direction="horizontal" spacing={Spacing.md}>
          <Skeleton variant="rounded" width="48%" height={100} />
        </SkeletonGroup>
      </View>

      {/* Session info skeleton */}
      <Skeleton variant="rounded" width="100%" height={80} />

      {/* Buttons skeleton */}
      <View style={styles.buttonsSkeleton}>
        <Skeleton variant="rounded" width="100%" height={44} />
        <Skeleton variant="rounded" width="100%" height={44} />
      </View>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // Auth state
  const account = useAccount();
  const { isLoggingOut } = useAuthLoading();
  const logout = useAuthStore((state) => state.logout);

  // Data fetching
  const { data: ordersData, isLoading: isLoadingOrders, refetch: refetchOrders } = useOrders();
  const { data: callsData, isLoading: isLoadingCalls, refetch: refetchCalls } = useWaiterCalls();

  // Local state
  const [showOpenOrdersModal, setShowOpenOrdersModal] = useState(false);

  // Haptic refresh
  const { isRefreshing, handleRefresh } = useHapticRefresh({
    onRefresh: async () => {
      await Promise.all([refetchOrders(), refetchCalls()]);
    },
  });

  // Get waiter's open orders
  const waiterOpenOrders = useMemo(() => {
    if (!ordersData?.data || !account?.id) return [];
    const activeOrders = getActiveOrders(ordersData.data);
    return activeOrders.filter((order) => order.waiterId === account.id);
  }, [ordersData?.data, account?.id]);

  // Calculate activity stats
  const activityStats = useMemo(
    () => calculateActivityStats(ordersData?.data, callsData?.data, account?.id),
    [ordersData?.data, callsData?.data, account?.id]
  );

  // Handlers

  const handleSettingsPress = useCallback(() => {
    router.push('/(main)/settings');
  }, [router]);

  const performLogout = useCallback(async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }, [logout, router]);

  const handleLogout = useCallback(() => {
    // Check for open orders first
    if (waiterOpenOrders.length > 0) {
      setShowOpenOrdersModal(true);
      return;
    }

    // No open orders, show simple confirm dialog
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: performLogout,
      },
    ]);
  }, [waiterOpenOrders.length, performLogout]);

  const handleGoToOrder = useCallback(
    (orderId: string) => {
      setShowOpenOrdersModal(false);
      router.push(`/(main)/order/${orderId}`);
    },
    [router]
  );

  const handleContinueLogout = useCallback(() => {
    setShowOpenOrdersModal(false);
    Alert.alert(
      'Confirm Logout',
      'You have open orders that will remain unattended. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout Anyway',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  }, [performLogout]);

  const isLoading = isLoadingOrders || isLoadingCalls;

  // Loading state
  if (isLoading && !ordersData?.data?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        </View>
        <ProfileSkeleton />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.primary}
          />
        }
        testID="profile-scroll-view"
      >
        {/* User Info Section */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.userSection}>
          <Avatar name={account?.username ?? 'User'} size="xl" testID="profile-avatar" />
          <View style={styles.userInfo}>
            <ThemedText style={[styles.username, { color: colors.text }]}>
              {account?.username ?? 'Unknown User'}
            </ThemedText>
            <Badge variant="primary" size="md" testID="role-badge">
              {getRoleDisplayName(account?.role ?? 'waiter')}
            </Badge>
          </View>
        </Animated.View>

        {/* Activity Summary Section */}
        <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.sectionContainer}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Today's Activity
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                title="Orders Taken"
                value={activityStats.ordersTaken}
                subtitle={`${activityStats.activeOrders} active`}
                icon="📋"
                testID="stat-orders"
              />
              <StatCard
                title="Total Sales"
                value={formatCurrency(activityStats.totalSales)}
                icon="💰"
                testID="stat-sales"
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                title="Calls Handled"
                value={activityStats.callsHandled}
                icon="🔔"
                testID="stat-calls"
              />
              <StatCard
                title="Active Orders"
                value={activityStats.activeOrders}
                icon="🍽️"
                testID="stat-active"
              />
            </View>
          </View>
        </Animated.View>

        {/* Session Info Section */}
        <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.sectionContainer}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Session Info
          </ThemedText>
          <Card style={styles.sessionCard} bordered elevated={false}>
            <View style={styles.sessionRow}>
              <ThemedText style={[styles.sessionLabel, { color: colors.textSecondary }]}>
                Organization
              </ThemedText>
              <ThemedText style={[styles.sessionValue, { color: colors.text }]}>
                {account?.organizationId ? 'Connected' : 'Not Connected'}
              </ThemedText>
            </View>
            <View style={[styles.sessionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.sessionRow}>
              <ThemedText style={[styles.sessionLabel, { color: colors.textSecondary }]}>
                Account Created
              </ThemedText>
              <ThemedText style={[styles.sessionValue, { color: colors.text }]}>
                {account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Unknown'}
              </ThemedText>
            </View>
          </Card>
        </Animated.View>

        {/* Actions Section */}
        <Animated.View entering={FadeIn.duration(300).delay(300)} style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleSettingsPress}
            testID="settings-button"
          >
            <ThemedText style={styles.settingsIcon}>⚙️</ThemedText>
            <ThemedText style={[styles.settingsText, { color: colors.text }]}>Settings</ThemedText>
            <ThemedText style={[styles.settingsArrow, { color: colors.textSecondary }]}>
              ›
            </ThemedText>
          </TouchableOpacity>

          <Button
            variant="destructive"
            size="lg"
            fullWidth
            onPress={handleLogout}
            loading={isLoggingOut}
            testID="logout-button"
          >
            Logout
          </Button>
        </Animated.View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoggingOut && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.loadingOverlay, { backgroundColor: colors.overlay }]}
        >
          <Spinner size="lg" />
          <ThemedText style={styles.loadingText}>Logging out...</ThemedText>
        </Animated.View>
      )}

      {/* Open Orders Warning Modal */}
      <Modal
        visible={showOpenOrdersModal}
        onClose={() => setShowOpenOrdersModal(false)}
        title="Open Orders"
        testID="open-orders-modal"
      >
        <View style={styles.modalContent}>
          <ThemedText style={[styles.modalDescription, { color: colors.textSecondary }]}>
            You have {waiterOpenOrders.length} open order
            {waiterOpenOrders.length !== 1 ? 's' : ''} that need attention before logging out.
          </ThemedText>

          <View style={styles.openOrdersList}>
            {waiterOpenOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.openOrderItem, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleGoToOrder(order.id)}
                testID={`open-order-${order.id}`}
              >
                <View style={styles.openOrderInfo}>
                  <ThemedText style={[styles.openOrderCode, { color: colors.text }]}>
                    {order.orderCode}
                  </ThemedText>
                  <ThemedText style={[styles.openOrderTable, { color: colors.textSecondary }]}>
                    Table: {order.table?.title ?? 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.openOrderStatus}>
                  <Badge
                    variant={order.orderStatus === OrderStatus.PENDING ? 'warning' : 'info'}
                    size="sm"
                  >
                    {order.orderStatus}
                  </Badge>
                  <ThemedText style={[styles.openOrderArrow, { color: colors.textSecondary }]}>
                    ›
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button
              variant="outline"
              size="md"
              onPress={() => setShowOpenOrdersModal(false)}
              style={styles.modalButton}
              testID="cancel-logout-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onPress={handleContinueLogout}
              style={styles.modalButton}
              testID="continue-logout-button"
            >
              Logout Anyway
            </Button>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  userSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  userInfo: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  sessionCard: {
    padding: Spacing.lg,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  sessionLabel: {
    fontSize: 14,
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  actionsSection: {
    gap: Spacing.md,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  settingsArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  skeletonContainer: {
    padding: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatarSkeletonText: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statsSection: {
    marginBottom: Spacing['2xl'],
  },
  statsRowSpacer: {
    height: Spacing.md,
  },
  buttonsSkeleton: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  modalContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  openOrdersList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    maxHeight: 250,
  },
  openOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  openOrderInfo: {
    flex: 1,
  },
  openOrderCode: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  openOrderTable: {
    fontSize: 13,
  },
  openOrderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  openOrderArrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

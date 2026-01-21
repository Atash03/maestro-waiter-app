/**
 * CallCard Component (Task 5.6)
 *
 * Displays a waiter call card with:
 * - Table number with zone name
 * - Call reason (if provided)
 * - Time elapsed since call
 * - Status badge
 * - Action buttons:
 *   - Acknowledge (if pending)
 *   - Complete (if acknowledged)
 *   - Go to Table
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { formatCallElapsedTime, getCallUrgency } from '@/src/hooks';
import { WaiterCallStatus } from '@/src/types/enums';
import type { WaiterCall } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface CallCardProps {
  /** The waiter call data */
  call: WaiterCall;
  /** Callback when acknowledge button is pressed */
  onAcknowledge: (id: string) => void;
  /** Callback when complete button is pressed */
  onComplete: (id: string) => void;
  /** Callback when cancel button is pressed */
  onCancel: (id: string) => void;
  /** Callback when go to table button is pressed */
  onGoToTable: (tableId: string) => void;
  /** Whether the call is currently being acknowledged */
  isAcknowledging?: boolean;
  /** Whether the call is currently being completed */
  isCompleting?: boolean;
  /** Whether the call is currently being cancelled */
  isCancelling?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CallCard({
  call,
  onAcknowledge,
  onComplete,
  onCancel,
  onGoToTable,
  isAcknowledging = false,
  isCompleting = false,
  isCancelling = false,
  testID,
}: CallCardProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [elapsedTime, setElapsedTime] = useState(formatCallElapsedTime(call.createdAt));

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatCallElapsedTime(call.createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [call.createdAt]);

  const urgency = getCallUrgency(call.createdAt);
  const urgencyColor = useMemo(() => {
    switch (urgency) {
      case 'low':
        return StatusColors.occupied;
      case 'medium':
        return StatusColors.preparing;
      case 'high':
      case 'critical':
        return StatusColors.needsAttention;
      default:
        return StatusColors.pending;
    }
  }, [urgency]);

  const statusColor = useMemo(() => {
    switch (call.status) {
      case WaiterCallStatus.PENDING:
        return StatusColors.needsAttention;
      case WaiterCallStatus.ACKNOWLEDGED:
        return StatusColors.occupied;
      case WaiterCallStatus.COMPLETED:
        return StatusColors.available;
      default:
        return StatusColors.pending;
    }
  }, [call.status]);

  const statusLabel = useMemo(() => {
    switch (call.status) {
      case WaiterCallStatus.PENDING:
        return 'Pending';
      case WaiterCallStatus.ACKNOWLEDGED:
        return 'Acknowledged';
      case WaiterCallStatus.COMPLETED:
        return 'Completed';
      case WaiterCallStatus.CANCELLED:
        return 'Cancelled';
      default:
        return call.status;
    }
  }, [call.status]);

  const isPending = call.status === WaiterCallStatus.PENDING;
  const isAcknowledged = call.status === WaiterCallStatus.ACKNOWLEDGED;
  const isCompleted = call.status === WaiterCallStatus.COMPLETED;

  const handleAcknowledge = useCallback(() => {
    onAcknowledge(call.id);
  }, [call.id, onAcknowledge]);

  const handleComplete = useCallback(() => {
    onComplete(call.id);
  }, [call.id, onComplete]);

  const handleGoToTable = useCallback(() => {
    onGoToTable(call.tableId);
  }, [call.tableId, onGoToTable]);

  const handleCancel = useCallback(() => {
    onCancel(call.id);
  }, [call.id, onCancel]);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20)}
      style={[
        styles.callCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
      testID={testID}
    >
      {/* Left accent strip */}
      <View
        style={[styles.accentStrip, { backgroundColor: isPending ? urgencyColor : statusColor }]}
      />

      {/* Main content */}
      <View style={styles.cardContent}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.tableInfo}>
            <View
              style={[
                styles.tableBadge,
                { backgroundColor: isPending ? urgencyColor : statusColor },
              ]}
            >
              <ThemedText style={styles.tableNumber}>{call.table?.title ?? 'Unknown'}</ThemedText>
            </View>
            <ThemedText style={[styles.zoneName, { color: colors.textSecondary }]}>
              {call.table?.zone?.title?.en ?? ''}
            </ThemedText>
          </View>
          <View style={styles.statusInfo}>
            {!isCompleted && (
              <View style={styles.timerContainer}>
                <View style={[styles.timerDot, { backgroundColor: urgencyColor }]} />
                <ThemedText style={[styles.timerText, { color: urgencyColor }]}>
                  {elapsedTime}
                </ThemedText>
              </View>
            )}
            <Badge
              variant={isPending ? 'needsAttention' : isAcknowledged ? 'occupied' : 'available'}
              size="sm"
            >
              {statusLabel}
            </Badge>
          </View>
        </View>

        {/* Reason row */}
        {call.reason && (
          <ThemedText style={[styles.reasonText, { color: colors.text }]} numberOfLines={2}>
            {call.reason}
          </ThemedText>
        )}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {isPending && (
            <Pressable
              style={[styles.actionButton, styles.acknowledgeButton]}
              onPress={handleAcknowledge}
              disabled={isAcknowledging}
              testID={testID ? `${testID}-acknowledge` : undefined}
            >
              {isAcknowledging ? (
                <Spinner size="sm" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.acknowledgeText}>Acknowledge</ThemedText>
              )}
            </Pressable>
          )}
          {isAcknowledged && (
            <Pressable
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
              disabled={isCompleting}
              testID={testID ? `${testID}-complete` : undefined}
            >
              {isCompleting ? (
                <Spinner size="sm" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.completeText}>Complete</ThemedText>
              )}
            </Pressable>
          )}
          <Pressable
            style={[styles.actionButton, styles.goToTableButton, { borderColor: colors.border }]}
            onPress={handleGoToTable}
            testID={testID ? `${testID}-go-to-table` : undefined}
          >
            <ThemedText style={[styles.goToTableText, { color: colors.text }]}>
              Go to Table
            </ThemedText>
          </Pressable>
          {(isPending || isAcknowledged) && (
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isCancelling}
              testID={testID ? `${testID}-cancel` : undefined}
            >
              {isCancelling ? (
                <Spinner size="sm" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  callCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  accentStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tableBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  tableNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoneName: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  acknowledgeButton: {
    backgroundColor: StatusColors.available,
  },
  acknowledgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: BrandColors.primary,
  },
  completeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goToTableButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  goToTableText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: StatusColors.needsAttention,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

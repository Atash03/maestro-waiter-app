/**
 * TableItem Component
 *
 * Visual representation of a table in the floor plan with:
 * - Color-coded status indication (available, occupied, reserved, needsAttention)
 * - Pulsing animation for tables with pending waiter calls
 * - Table title/number display
 * - Guest count icon when occupied
 * - Animated status transitions
 * - Press animation on interaction
 */

import { useCallback, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing, StatusColors } from '@/constants/theme';
import type { Table } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needsAttention';

export interface TableItemData extends Table {
  status: TableStatus;
  guestCount?: number;
  hasActiveOrder?: boolean;
  hasPendingCall?: boolean;
}

export interface TableItemProps {
  /** Table data with status information */
  table: TableItemData;
  /** Callback when table is pressed */
  onPress?: (table: Table) => void;
  /** Callback when table is long pressed */
  onLongPress?: (table: Table) => void;
  /** Whether this table is currently selected */
  isSelected?: boolean;
  /** Whether this table is assigned to the current waiter (for My Section highlighting) */
  isAssigned?: boolean;
  /** Whether to show assigned indicator when in "All Tables" view */
  showAssignedIndicator?: boolean;
  /** Test ID prefix for testing */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<TableStatus, string> = {
  available: StatusColors.available,
  occupied: StatusColors.occupied,
  reserved: StatusColors.reserved,
  needsAttention: StatusColors.needsAttention,
};

const DEFAULT_TABLE_WIDTH = 60;
const DEFAULT_TABLE_HEIGHT = 60;
const PULSE_ANIMATION_DURATION = 1000;
const PRESS_SCALE = 0.95;
const SELECTED_SCALE = 1.05;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse coordinate string to number, defaulting to provided default value
 */
function parseCoordinate(value: number | string | undefined, defaultValue = 0): number {
  if (value == null) return defaultValue;
  if (typeof value === 'number') return Number.isNaN(value) ? defaultValue : value;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get the background color for a table based on its status
 */
export function getStatusColor(status: TableStatus): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.available;
}

/**
 * Get a lighter variant of the status color for the pulse effect
 */
function getPulseColor(status: TableStatus): string {
  // Use a lighter/more transparent version for the pulse
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.available;
  return `${color}40`; // 40 = 25% opacity in hex
}

// ============================================================================
// TableItem Component
// ============================================================================

export function TableItem({
  table,
  onPress,
  onLongPress,
  isSelected = false,
  isAssigned = false,
  showAssignedIndicator = false,
  testID,
}: TableItemProps) {
  const statusColor = getStatusColor(table.status);

  // Animation values
  const pressScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const statusColorAnim = useSharedValue(statusColor);

  // Parse dimensions from table data
  const width = parseCoordinate(table.width, DEFAULT_TABLE_WIDTH);
  const height = parseCoordinate(table.height, DEFAULT_TABLE_HEIGHT);
  const x = parseCoordinate(table.x);
  const y = parseCoordinate(table.y);

  // Determine if we should show guest count (occupied with guests)
  const showGuestCount = table.status === 'occupied' && (table.guestCount ?? 0) > 0;

  // Pulse animation for needsAttention status
  useEffect(() => {
    if (table.hasPendingCall || table.status === 'needsAttention') {
      // Start pulsing animation
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: PULSE_ANIMATION_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: PULSE_ANIMATION_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        false // Don't reverse
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: PULSE_ANIMATION_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: PULSE_ANIMATION_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      // Stop pulsing
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

  // Animate status color changes
  useEffect(() => {
    statusColorAnim.value = statusColor;
  }, [statusColor, statusColorAnim]);

  // Handle selection scale
  useEffect(() => {
    if (isSelected) {
      pressScale.value = withSpring(SELECTED_SCALE, { damping: 15, stiffness: 150 });
    } else {
      pressScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [isSelected, pressScale]);

  // Press handlers
  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(PRESS_SCALE, { damping: 15, stiffness: 300 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    const targetScale = isSelected ? SELECTED_SCALE : 1;
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
      style={[
        styles.container,
        containerAnimatedStyle,
        {
          left: x,
          top: y,
          width,
          height,
        },
      ]}
      testID={testID ?? `table-item-${table.id}`}
    >
      {/* Pulse effect layer (behind the table) */}
      {(table.hasPendingCall || table.status === 'needsAttention') && (
        <Animated.View
          style={[
            styles.pulseLayer,
            pulseAnimatedStyle,
            {
              backgroundColor: getPulseColor(table.status),
              borderRadius: BorderRadius.md,
            },
          ]}
          testID={`table-pulse-${table.id}`}
        />
      )}

      {/* Table body */}
      <TouchableOpacity
        style={[
          styles.tableBody,
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
        <ThemedText style={styles.tableTitle} numberOfLines={1}>
          {table.title}
        </ThemedText>

        {/* Guest count or capacity */}
        {showGuestCount ? (
          <View style={styles.guestCountContainer} testID={`table-guests-${table.id}`}>
            <ThemedText style={styles.guestCountIcon}>👥</ThemedText>
            <ThemedText style={styles.guestCountText}>{table.guestCount}</ThemedText>
          </View>
        ) : (
          table.capacity > 0 && (
            <ThemedText style={styles.capacityText} testID={`table-capacity-${table.id}`}>
              {table.capacity}
            </ThemedText>
          )
        )}

        {/* Attention indicator (red dot) */}
        {table.status === 'needsAttention' && (
          <View style={styles.attentionIndicator} testID={`table-attention-${table.id}`} />
        )}

        {/* Active order indicator */}
        {table.hasActiveOrder && table.status !== 'needsAttention' && (
          <View style={styles.orderIndicator} testID={`table-order-${table.id}`} />
        )}

        {/* Assigned indicator (shows when in "All Tables" view and table is assigned) */}
        {showAssignedIndicator && isAssigned && (
          <View style={styles.assignedIndicator} testID={`table-assigned-${table.id}`}>
            <ThemedText style={styles.assignedIndicatorText}>★</ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  pulseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tableBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  capacityText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  guestCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  guestCountIcon: {
    fontSize: 10,
  },
  guestCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  attentionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: StatusColors.needsAttention,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  orderIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: StatusColors.occupied,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  assignedIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedIndicatorText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '700',
  },
});

export default TableItem;

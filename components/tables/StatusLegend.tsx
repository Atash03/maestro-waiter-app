/**
 * Status Legend Component
 *
 * A collapsible legend that displays color-coded table status indicators.
 * Features:
 * - Color key for all table statuses (available, occupied, reserved, needs attention)
 * - Collapsible to save screen space
 * - Animated expand/collapse transitions
 * - Theme-aware colors (light/dark mode)
 * - Optional assigned table indicator
 */

import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TableStatus } from './TableItem';

// ============================================================================
// Types
// ============================================================================

export interface StatusLegendProps {
  /** Whether the legend starts expanded (default: false) */
  initialExpanded?: boolean;
  /** Whether to show the assigned table indicator (default: false) */
  showAssignedIndicator?: boolean;
  /** Position of the legend (default: 'bottom-right') */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Test ID for testing */
  testID?: string;
}

interface StatusItem {
  status: TableStatus;
  label: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_ITEMS: StatusItem[] = [
  { status: 'available', label: 'Available', color: StatusColors.available },
  { status: 'occupied', label: 'Occupied', color: StatusColors.occupied },
  { status: 'reserved', label: 'Reserved', color: StatusColors.reserved },
  { status: 'needsAttention', label: 'Needs Attention', color: StatusColors.needsAttention },
];

const ANIMATION_DURATION = 200;

// ============================================================================
// Component
// ============================================================================

export function StatusLegend({
  initialExpanded = false,
  showAssignedIndicator = false,
  position = 'bottom-right',
  testID = 'status-legend',
}: StatusLegendProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animation values
  const contentHeight = useSharedValue(initialExpanded ? 1 : 0);
  const rotateIcon = useSharedValue(initialExpanded ? 180 : 0);

  // Toggle handler
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    contentHeight.value = withTiming(newExpanded ? 1 : 0, { duration: ANIMATION_DURATION });
    rotateIcon.value = withTiming(newExpanded ? 180 : 0, { duration: ANIMATION_DURATION });
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    maxHeight: contentHeight.value * 200, // Max height for content
    overflow: 'hidden' as const,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateIcon.value}deg` }],
  }));

  // Position styles
  const positionStyles = getPositionStyles(position);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        positionStyles,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Toggle button */}
      <TouchableOpacity
        testID={`${testID}-toggle`}
        style={styles.toggleButton}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={isExpanded ? 'Hide table status legend' : 'Show table status legend'}
      >
        <ThemedText style={styles.toggleText}>{isExpanded ? 'Hide Legend' : 'Legend'}</ThemedText>
        <Animated.View style={chevronAnimatedStyle}>
          <ThemedText style={styles.chevron}>▼</ThemedText>
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable content */}
      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        <View style={styles.statusList}>
          {STATUS_ITEMS.map(({ status, label, color }) => (
            <View key={status} style={styles.statusItem} testID={`${testID}-item-${status}`}>
              <View style={[styles.colorIndicator, { backgroundColor: color }]} />
              <ThemedText style={styles.statusLabel}>{label}</ThemedText>
            </View>
          ))}

          {/* Assigned table indicator */}
          {showAssignedIndicator && (
            <View style={styles.statusItem} testID={`${testID}-item-assigned`}>
              <View style={styles.assignedIndicator}>
                <ThemedText style={styles.starIcon}>★</ThemedText>
              </View>
              <ThemedText style={styles.statusLabel}>Your Table</ThemedText>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get position styles based on position prop
 */
function getPositionStyles(position: StatusLegendProps['position']) {
  const base = {
    position: 'absolute' as const,
  };

  switch (position) {
    case 'bottom-left':
      return { ...base, bottom: Spacing.lg, left: Spacing.lg };
    case 'top-right':
      return { ...base, top: Spacing.lg, right: Spacing.lg };
    case 'top-left':
      return { ...base, top: Spacing.lg, left: Spacing.lg };
    default:
      return { ...base, bottom: Spacing.lg, right: Spacing.lg };
  }
}

/**
 * Get status items - exported for testing
 */
export function getStatusItems(): StatusItem[] {
  return STATUS_ITEMS;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 8,
    opacity: 0.6,
  },
  content: {
    borderTopWidth: 0,
  },
  statusList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  assignedIndicator: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 14,
    color: '#FFD700', // Gold color for the star
  },
});

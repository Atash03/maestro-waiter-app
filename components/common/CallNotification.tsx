/**
 * CallNotification Component
 *
 * A non-intrusive banner at the top of screen for waiter call notifications.
 * Features:
 * - Color-coded by request type
 * - Table number and request reason
 * - Running timer showing wait time
 * - Quick actions: Acknowledge, Dismiss
 * - Slide-in animation
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Spacing, StatusColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { NotificationCall } from '@/src/stores/notificationStore';
import { WaiterCallStatus } from '@/src/types/enums';

export interface CallNotificationProps {
  call: NotificationCall;
  onAcknowledge?: (callId: string) => void;
  onDismiss?: (callId: string) => void;
  onPress?: (callId: string) => void;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Format elapsed time since call creation
 */
function formatElapsedTime(createdAt: string): string {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }

  const diffHour = Math.floor(diffMin / 60);
  const remainingMin = diffMin % 60;
  return `${diffHour}h ${remainingMin}m`;
}

/**
 * Get color based on wait time urgency
 */
function getUrgencyColor(createdAt: string): string {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 2) {
    return StatusColors.occupied; // Amber - normal
  }
  if (diffMin < 5) {
    return StatusColors.preparing; // Orange - getting urgent
  }
  return StatusColors.needsAttention; // Red - urgent
}

export function CallNotification({
  call,
  onAcknowledge,
  onDismiss,
  onPress,
  testID,
}: CallNotificationProps) {
  const insets = useSafeAreaInsets();
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(call.createdAt));

  // Animation values
  const translateX = useSharedValue(-400);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(call.createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [call.createdAt]);

  // Slide-in animation on mount
  useEffect(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });
  }, [translateX, opacity]);

  const urgencyColor = useMemo(() => getUrgencyColor(call.createdAt), [call.createdAt]);

  const handleDismiss = useCallback(() => {
    translateX.value = withTiming(-400, { duration: 200 }, (finished) => {
      if (finished && onDismiss) {
        runOnJS(onDismiss)(call.id);
      }
    });
    opacity.value = withTiming(0, { duration: 200 });
  }, [call.id, onDismiss, translateX, opacity]);

  const handleAcknowledge = useCallback(() => {
    if (onAcknowledge) {
      onAcknowledge(call.id);
    }
  }, [call.id, onAcknowledge]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(call.id);
    }
  }, [call.id, onPress]);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const isPending = call.status === WaiterCallStatus.PENDING;

  return (
    <AnimatedPressable
      style={[
        styles.container,
        { backgroundColor, borderColor, marginTop: insets.top + Spacing.sm },
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
    >
      {/* Left accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: urgencyColor }]} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.tableInfo}>
            <View style={[styles.tableBadge, { backgroundColor: urgencyColor }]}>
              <Text style={styles.tableNumber}>{call.tableTitle}</Text>
            </View>
            <Text style={[styles.zoneName, { color: textSecondary }]}>{call.zoneName}</Text>
          </View>
          <View style={styles.timerContainer}>
            <View style={[styles.timerDot, { backgroundColor: urgencyColor }]} />
            <Text style={[styles.timerText, { color: urgencyColor }]}>{elapsedTime}</Text>
          </View>
        </View>

        {/* Reason row */}
        {call.reason && (
          <Text style={[styles.reasonText, { color: textColor }]} numberOfLines={1}>
            {call.reason}
          </Text>
        )}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {isPending && onAcknowledge && (
            <Pressable
              style={[styles.actionButton, styles.acknowledgeButton]}
              onPress={handleAcknowledge}
              hitSlop={8}
              testID={testID ? `${testID}-acknowledge` : undefined}
            >
              <Text style={styles.acknowledgeText}>Acknowledge</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionButton, styles.dismissButton, { borderColor }]}
            onPress={handleDismiss}
            hitSlop={8}
            testID={testID ? `${testID}-dismiss` : undefined}
          >
            <Text style={[styles.dismissText, { color: textSecondary }]}>Dismiss</Text>
          </Pressable>
        </View>
      </View>

      {/* Close button */}
      <Pressable
        style={styles.closeButton}
        onPress={handleDismiss}
        hitSlop={8}
        testID={testID ? `${testID}-close` : undefined}
      >
        <Text style={[styles.closeIcon, { color: textSecondary }]}>×</Text>
      </Pressable>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  accentStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  acknowledgeButton: {
    backgroundColor: StatusColors.available,
  },
  acknowledgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '400',
  },
});

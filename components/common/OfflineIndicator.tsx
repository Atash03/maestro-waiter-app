/**
 * Offline Indicator Component
 *
 * Shows sync status and pending mutations indicator.
 * Displays when there are queued items waiting to be synced.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineStatus, useSyncControl } from '@/src/hooks/useOfflineSupport';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Offline Indicator Component
 *
 * Shows when there are pending mutations in the offline queue.
 * Allows users to manually trigger sync or retry failed items.
 */
export function OfflineIndicator() {
  const insets = useSafeAreaInsets();
  const { hasPendingMutations, hasFailedMutations, pendingCount, failedCount, isSyncing } =
    useOfflineStatus();
  const { sync, retryFailed } = useSyncControl();

  // Animation for syncing indicator
  const rotation = useSharedValue(0);

  // Start rotation animation when syncing
  React.useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(0, { duration: 200 });
    }
  }, [isSyncing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Pulse animation for pending items
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (hasPendingMutations && !isSyncing) {
      scale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [hasPendingMutations, isSyncing, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (hasFailedMutations) {
      retryFailed();
    } else if (hasPendingMutations && !isSyncing) {
      sync();
    }
  }, [hasFailedMutations, hasPendingMutations, isSyncing, retryFailed, sync]);

  // Don't show if nothing to display
  if (!hasPendingMutations && !hasFailedMutations && !isSyncing) {
    return null;
  }

  const backgroundColor = hasFailedMutations
    ? '#EF4444' // Red for failures
    : isSyncing
      ? '#3B82F6' // Blue when syncing
      : '#F59E0B'; // Amber for pending

  const textColor = '#FFFFFF';

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.container,
        pulseStyle,
        {
          top: insets.top + 60, // Below the header
          backgroundColor,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        hasFailedMutations
          ? `${failedCount} failed items. Tap to retry.`
          : isSyncing
            ? 'Syncing data...'
            : `${pendingCount} items pending sync. Tap to sync.`
      }
    >
      <View style={styles.content}>
        {isSyncing ? (
          <Animated.View style={[styles.iconContainer, spinStyle]}>
            <Text style={[styles.icon, { color: textColor }]}>↻</Text>
          </Animated.View>
        ) : hasFailedMutations ? (
          <Text style={[styles.icon, { color: textColor }]}>⚠</Text>
        ) : (
          <Text style={[styles.icon, { color: textColor }]}>⏳</Text>
        )}
        <Text style={[styles.text, { color: textColor }]}>
          {hasFailedMutations
            ? `${failedCount} failed - Tap to retry`
            : isSyncing
              ? 'Syncing...'
              : `${pendingCount} pending`}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

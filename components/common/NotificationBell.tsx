/**
 * NotificationBell Component (Task 5.8)
 *
 * A notification bell icon for the header that shows pending waiter calls.
 * Features:
 * - Badge showing pending call count
 * - Tap to open calls screen
 * - Pulsing animation when new calls
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, StatusColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBadgeCount } from '@/src/stores/notificationStore';

export interface NotificationBellProps {
  /** Override the default navigation behavior */
  onPress?: () => void;
  /** Size of the bell icon */
  size?: number;
  /** Test ID for testing */
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NotificationBell({ onPress, size = 24, testID }: NotificationBellProps) {
  const router = useRouter();
  const pendingCount = useBadgeCount();

  // Theme colors
  const iconColor = useThemeColor({}, 'icon');

  // Animation values
  const scale = useSharedValue(1);
  const bellRotation = useSharedValue(0);
  const badgeScale = useSharedValue(pendingCount > 0 ? 1 : 0);

  // Press animation
  const pressScale = useSharedValue(1);

  // Pulsing animation when there are pending calls
  useEffect(() => {
    if (pendingCount > 0) {
      // Animate badge scale in
      badgeScale.value = withSpring(1, { damping: 12, stiffness: 200 });

      // Bell ringing animation
      bellRotation.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 100 }),
          withTiming(-15, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 2000 }) // Pause before repeating
        ),
        -1, // Infinite repeat
        false
      );

      // Pulsing scale animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 2000 }) // Pause before repeating
        ),
        -1,
        false
      );
    } else {
      // Reset animations
      cancelAnimation(bellRotation);
      cancelAnimation(scale);
      bellRotation.value = withSpring(0);
      scale.value = withSpring(1);
      badgeScale.value = withTiming(0, { duration: 200 });
    }

    return () => {
      cancelAnimation(bellRotation);
      cancelAnimation(scale);
    };
  }, [pendingCount, bellRotation, scale, badgeScale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/calls');
    }
  }, [onPress, router]);

  const handlePressIn = () => {
    pressScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * scale.value }],
  }));

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotation.value}deg` }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.container, containerAnimatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={8}
      testID={testID}
      accessibilityLabel={
        pendingCount > 0 ? `Notifications, ${pendingCount} pending calls` : 'Notifications'
      }
      accessibilityRole="button"
      accessibilityHint="Opens the calls screen"
    >
      <Animated.View style={bellAnimatedStyle}>
        <MaterialIcons
          name={pendingCount > 0 ? 'notifications-active' : 'notifications'}
          size={size}
          color={pendingCount > 0 ? StatusColors.needsAttention : iconColor}
        />
      </Animated.View>

      {/* Badge */}
      <Animated.View
        style={[styles.badge, { backgroundColor: StatusColors.needsAttention }, badgeAnimatedStyle]}
        testID={testID ? `${testID}-badge` : undefined}
      >
        <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

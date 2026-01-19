/**
 * OfflineBanner - Visual indicator for offline network status
 *
 * Features:
 * - Shows when device is offline
 * - Animated entrance/exit
 * - Non-intrusive banner at top of screen
 * - Auto-hides when connection is restored
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectIsOffline, useNetworkStore } from '@/src/stores/networkStore';

const BANNER_HEIGHT = 32;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const isOffline = useNetworkStore(selectIsOffline);
  const translateY = useSharedValue(-BANNER_HEIGHT - insets.top);

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -BANNER_HEIGHT - insets.top, {
      duration: 300,
    });
  }, [isOffline, insets.top, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top }, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D97706',
    zIndex: 1000,
  },
  content: {
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

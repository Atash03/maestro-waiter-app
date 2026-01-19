import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

const AnimatedView = Animated.View;

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  style,
  testID,
}: SkeletonProps) {
  const shimmerPosition = useSharedValue(0);
  const colorScheme = useColorScheme();

  // Theme colors
  const baseColor = useThemeColor({}, 'backgroundSecondary');

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [shimmerPosition]);

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'circular': {
        const circleSize = typeof height === 'number' ? height : 40;
        return {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
        };
      }
      case 'rectangular':
        return {
          width: typeof width === 'number' ? width : undefined,
          height: height ?? 100,
          borderRadius: 0,
        };
      case 'rounded':
        return {
          width: typeof width === 'number' ? width : undefined,
          height: height ?? 40,
          borderRadius: BorderRadius.md,
        };
      default:
        return {
          width: typeof width === 'number' ? width : undefined,
          height: height ?? 16,
          borderRadius: BorderRadius.sm,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const shimmerColor =
    colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';

  const animatedStyle = useAnimatedStyle(() => {
    const _translateX = shimmerPosition.value * 200 - 100;
    return {
      opacity: 0.6 + shimmerPosition.value * 0.4,
    };
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: baseColor },
        typeof width === 'string' && { width: width as `${number}%` },
        variantStyles,
        style,
      ]}
      testID={testID}
    >
      <AnimatedView style={[styles.shimmer, { backgroundColor: shimmerColor }, animatedStyle]} />
    </View>
  );
}

export interface SkeletonGroupProps {
  count?: number;
  spacing?: number;
  direction?: 'vertical' | 'horizontal';
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SkeletonGroup({
  count = 1,
  spacing = Spacing.md,
  direction = 'vertical',
  children,
  style,
}: SkeletonGroupProps) {
  return (
    <View
      style={[
        direction === 'horizontal' ? styles.horizontal : styles.vertical,
        { gap: spacing },
        style,
      ]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>{children}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    flexDirection: 'row',
  },
});

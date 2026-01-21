/**
 * Progress Component
 *
 * Provides visual feedback for operations in progress.
 * Supports both linear (bar) and circular progress indicators.
 * Features:
 * - Determinate (with value) and indeterminate modes
 * - Smooth animations using Reanimated
 * - Theme-aware colors
 * - Customizable sizes and colors
 */

import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '../themed-text';

// ============================================================================
// Types
// ============================================================================

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

export interface ProgressBarProps {
  /** Progress value between 0 and 100. If undefined, shows indeterminate animation */
  value?: number;
  /** Size of the progress bar */
  size?: ProgressSize;
  /** Color variant */
  variant?: ProgressVariant;
  /** Custom color override */
  color?: string;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Custom label (overrides percentage) */
  label?: string;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

export interface CircularProgressProps {
  /** Progress value between 0 and 100. If undefined, shows indeterminate animation */
  value?: number;
  /** Size of the circular progress */
  size?: ProgressSize;
  /** Color variant */
  variant?: ProgressVariant;
  /** Custom color override */
  color?: string;
  /** Whether to show the percentage label in center */
  showLabel?: boolean;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BAR_HEIGHTS: Record<ProgressSize, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

const CIRCULAR_SIZES: Record<ProgressSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

const CIRCULAR_BORDER_WIDTHS: Record<ProgressSize, number> = {
  sm: 3,
  md: 4,
  lg: 5,
};

const AnimatedView = Animated.createAnimatedComponent(View);

// ============================================================================
// Helper Functions
// ============================================================================

function getProgressColor(variant: ProgressVariant, colorScheme: 'light' | 'dark'): string {
  const colors = Colors[colorScheme];
  switch (variant) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return BrandColors.primary;
  }
}

// ============================================================================
// Progress Bar Component
// ============================================================================

export function ProgressBar({
  value,
  size = 'md',
  variant = 'default',
  color,
  showLabel = false,
  label,
  style,
  testID,
}: ProgressBarProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme];

  const isIndeterminate = value === undefined;
  const clampedValue = Math.max(0, Math.min(100, value ?? 0));

  // Animation values
  const progressWidth = useSharedValue(0);
  const indeterminatePosition = useSharedValue(0);

  // Get colors
  const progressColor = color ?? getProgressColor(variant, colorScheme);
  const trackColor = colors.backgroundSecondary;
  const height = BAR_HEIGHTS[size];

  // Animate progress value changes
  useEffect(() => {
    if (!isIndeterminate) {
      progressWidth.value = withTiming(clampedValue, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedValue, isIndeterminate, progressWidth]);

  // Indeterminate animation
  useEffect(() => {
    if (isIndeterminate) {
      indeterminatePosition.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [isIndeterminate, indeterminatePosition]);

  // Determinate animated style
  const determinateStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Indeterminate animated style
  const indeterminateStyle = useAnimatedStyle(() => ({
    width: '30%',
    left: `${indeterminatePosition.value * 70}%`,
  }));

  const displayLabel =
    label ?? (showLabel && !isIndeterminate ? `${Math.round(clampedValue)}%` : '');

  return (
    <View style={[styles.barContainer, style]} testID={testID}>
      <View
        style={[
          styles.barTrack,
          {
            height,
            backgroundColor: trackColor,
            borderRadius: height / 2,
          },
        ]}
      >
        <AnimatedView
          style={[
            styles.barFill,
            {
              height,
              backgroundColor: progressColor,
              borderRadius: height / 2,
            },
            isIndeterminate ? indeterminateStyle : determinateStyle,
          ]}
        />
      </View>
      {displayLabel ? (
        <ThemedText style={[styles.barLabel, { color: colors.textSecondary }]}>
          {displayLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ============================================================================
// Circular Progress Component (View-based implementation)
// ============================================================================

export function CircularProgress({
  value,
  size = 'md',
  variant = 'default',
  color,
  showLabel = false,
  style,
  testID,
}: CircularProgressProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme];

  const isIndeterminate = value === undefined;
  const clampedValue = Math.max(0, Math.min(100, value ?? 0));

  // Get dimensions
  const circleSize = CIRCULAR_SIZES[size];
  const borderWidth = CIRCULAR_BORDER_WIDTHS[size];

  // Animation values
  const rotation = useSharedValue(0);
  const progressRotation = useSharedValue(0);

  // Get colors
  const progressColor = color ?? getProgressColor(variant, colorScheme);
  const trackColor = colors.backgroundSecondary;

  // Indeterminate rotation animation
  useEffect(() => {
    if (isIndeterminate) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isIndeterminate, rotation]);

  // Determinate progress animation
  useEffect(() => {
    if (!isIndeterminate) {
      // Map 0-100 to 0-360 degrees
      const targetRotation = (clampedValue / 100) * 360;
      progressRotation.value = withTiming(targetRotation, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedValue, isIndeterminate, progressRotation]);

  // Animated rotation for indeterminate
  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // We'll use a simplified circular progress with a rotating arc effect
  // For indeterminate: rotating partial circle
  // For determinate: we show the percentage visually with a semi-circle approach

  const displayLabel = showLabel && !isIndeterminate ? `${Math.round(clampedValue)}%` : '';
  const fontSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;

  return (
    <View
      style={[styles.circularContainer, { width: circleSize, height: circleSize }, style]}
      testID={testID}
    >
      {/* Track circle */}
      <View
        style={[
          styles.circularTrack,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Progress indicator */}
      {isIndeterminate ? (
        // Indeterminate: rotating arc
        <AnimatedView
          style={[
            styles.circularProgressContainer,
            { width: circleSize, height: circleSize },
            animatedRotation,
          ]}
        >
          <View
            style={[
              styles.circularArc,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                borderWidth,
                borderColor: 'transparent',
                borderTopColor: progressColor,
                borderRightColor: progressColor,
              },
            ]}
          />
        </AnimatedView>
      ) : (
        // Determinate: show progress with multiple segments
        <DeterminateCircularProgress
          size={circleSize}
          borderWidth={borderWidth}
          progress={clampedValue}
          color={progressColor}
        />
      )}

      {/* Center label */}
      {displayLabel ? (
        <View style={styles.circularLabelContainer}>
          <ThemedText style={[styles.circularLabel, { color: colors.text, fontSize }]}>
            {displayLabel}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// Determinate Circular Progress Helper Component
// ============================================================================

interface DeterminateCircularProgressProps {
  size: number;
  borderWidth: number;
  progress: number;
  color: string;
}

function DeterminateCircularProgress({
  size,
  borderWidth,
  progress,
  color,
}: DeterminateCircularProgressProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, animatedProgress]);

  // Create the visual effect using border colors on quadrants
  // This is a simplified approach - for full circular progress, react-native-svg would be better
  const animatedStyle = useAnimatedStyle(() => {
    const p = animatedProgress.value;
    // Determine which borders should be colored based on progress
    // 0-25%: top only
    // 25-50%: top + right
    // 50-75%: top + right + bottom
    // 75-100%: all

    return {
      borderTopColor: p > 0 ? color : 'transparent',
      borderRightColor: p > 25 ? color : 'transparent',
      borderBottomColor: p > 50 ? color : 'transparent',
      borderLeftColor: p > 75 ? color : 'transparent',
    };
  });

  return (
    <AnimatedView
      style={[
        styles.circularDeterminate,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================================================
// Loading Overlay Component
// ============================================================================

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Loading message to display */
  message?: string;
  /** Progress value (0-100) for determinate progress, undefined for indeterminate */
  progress?: number;
  /** Use circular progress instead of bar */
  circular?: boolean;
  /** Additional styles for the overlay */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

export function LoadingOverlay({
  visible,
  message,
  progress,
  circular = false,
  style,
  testID,
}: LoadingOverlayProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme];

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }, style]} testID={testID}>
      <View style={[styles.overlayContent, { backgroundColor: colors.background }]}>
        {circular ? (
          <CircularProgress value={progress} size="lg" showLabel={progress !== undefined} />
        ) : (
          <ProgressBar value={progress} size="lg" showLabel={progress !== undefined} />
        )}
        {message && (
          <ThemedText style={[styles.overlayMessage, { color: colors.text }]}>{message}</ThemedText>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  barContainer: {
    width: '100%',
    gap: Spacing.xs,
  },
  barTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  barLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  circularContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularTrack: {
    position: 'absolute',
  },
  circularProgressContainer: {
    position: 'absolute',
  },
  circularArc: {
    position: 'absolute',
  },
  circularDeterminate: {
    position: 'absolute',
  },
  circularLabelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularLabel: {
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

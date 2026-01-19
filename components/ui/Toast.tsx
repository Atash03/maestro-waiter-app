import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const AnimatedView = Animated.View;

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  style,
  testID,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  // Theme colors
  const successBg = useThemeColor({}, 'successBackground');
  const successText = useThemeColor({}, 'success');
  const errorBg = useThemeColor({}, 'errorBackground');
  const errorText = useThemeColor({}, 'error');
  const warningBg = useThemeColor({}, 'warningBackground');
  const warningText = useThemeColor({}, 'warning');
  const infoBg = useThemeColor({}, 'infoBackground');
  const infoText = useThemeColor({}, 'info');
  const _textColor = useThemeColor({}, 'text');

  const getTypeStyles = (): { bg: string; text: string; icon: string } => {
    switch (type) {
      case 'success':
        return { bg: successBg, text: successText, icon: '✓' };
      case 'error':
        return { bg: errorBg, text: errorText, icon: '✕' };
      case 'warning':
        return { bg: warningBg, text: warningText, icon: '!' };
      default:
        return { bg: infoBg, text: infoText, icon: 'ℹ' };
    }
  };

  const typeStyles = getTypeStyles();

  useEffect(() => {
    // Slide in
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss
    if (duration > 0) {
      translateY.value = withSequence(
        withTiming(0, { duration: 300 }),
        withDelay(
          duration,
          withTiming(-100, { duration: 300 }, (finished) => {
            if (finished && onClose) {
              runOnJS(onClose)();
            }
          })
        )
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(duration, withTiming(0, { duration: 300 }))
      );
    }
  }, [duration, onClose, translateY, opacity]);

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished && onClose) {
        runOnJS(onClose)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      style={[styles.container, { backgroundColor: typeStyles.bg }, animatedStyle, style]}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: typeStyles.text }]}>
          <Text style={styles.icon}>{typeStyles.icon}</Text>
        </View>
        <Text style={[styles.message, { color: typeStyles.text }]} numberOfLines={2}>
          {message}
        </Text>
        <Pressable onPress={handleDismiss} style={styles.closeButton} hitSlop={8}>
          <Text style={[styles.closeIcon, { color: typeStyles.text }]}>✕</Text>
        </Pressable>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
});

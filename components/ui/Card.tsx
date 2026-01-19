import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: PressableProps['onPress'];
  pressable?: boolean;
  elevated?: boolean;
  bordered?: boolean;
  testID?: string;
}

const paddingValues = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.lg,
  lg: Spacing.xl,
};

export function Card({
  children,
  style,
  padding = 'md',
  onPress,
  pressable = false,
  elevated = true,
  bordered = false,
  testID,
}: CardProps) {
  const scale = useSharedValue(1);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const shadowStyle = elevated
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    : {};

  const borderStyle = bordered
    ? {
        borderWidth: 1,
        borderColor,
      }
    : {};

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable || onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (pressable || onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const cardStyle = [
    styles.card,
    { backgroundColor, padding: paddingValues[padding] },
    shadowStyle,
    borderStyle,
    style,
  ];

  if (pressable || onPress) {
    return (
      <AnimatedPressable
        style={[cardStyle, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        accessibilityRole="button"
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
});

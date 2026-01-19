import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BorderRadius, BrandColors, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { haptics } from '@/src/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  /** Enable haptic feedback on press (default: true) */
  hapticFeedback?: boolean;
}

const sizeStyles: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: 32, paddingHorizontal: Spacing.md, fontSize: 14 },
  md: { height: 44, paddingHorizontal: Spacing.lg, fontSize: 16 },
  lg: { height: 52, paddingHorizontal: Spacing.xl, fontSize: 18 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
  hapticFeedback = true,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');

  const isDisabled = disabled || loading;

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const baseText: TextStyle = {
      fontSize: sizeStyles[size].fontSize,
      fontWeight: '600',
    };

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled ? BrandColors.primaryLight : BrandColors.primary,
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDisabled ? '#E5E7EB' : '#F3F4F6',
          },
          text: {
            ...baseText,
            color: isDisabled ? '#9CA3AF' : textColor,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: isDisabled ? '#E5E7EB' : borderColor,
          },
          text: {
            ...baseText,
            color: isDisabled ? '#9CA3AF' : textColor,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            ...baseText,
            color: isDisabled ? '#9CA3AF' : BrandColors.primary,
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: isDisabled ? '#FCA5A5' : errorColor,
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
          },
        };
      default:
        return {
          container: {},
          text: baseText,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    // Trigger haptic feedback on press
    if (hapticFeedback && !isDisabled) {
      // Use stronger haptic for primary/destructive variants
      if (variant === 'primary' || variant === 'destructive') {
        haptics.buttonPressSignificant();
      } else {
        haptics.buttonPress();
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    onPressOut?.(e);
  };

  const combinedContainerStyles: ViewStyle[] = [
    styles.base,
    {
      height: sizeStyles[size].height,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
    },
    variantStyles.container,
  ];

  if (fullWidth) {
    combinedContainerStyles.push(styles.fullWidth);
  }

  if (style) {
    combinedContainerStyles.push(style);
  }

  const combinedTextStyles: TextStyle[] = [styles.text, variantStyles.text];

  if (leftIcon) {
    combinedTextStyles.push(styles.textWithLeftIcon);
  }

  if (rightIcon) {
    combinedTextStyles.push(styles.textWithRightIcon);
  }

  if (textStyle) {
    combinedTextStyles.push(textStyle);
  }

  return (
    <AnimatedPressable
      style={[combinedContainerStyles, animatedStyle]}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color as string}
          size="small"
          testID="button-loading"
        />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={combinedTextStyles}>{children}</Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
  textWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  textWithRightIcon: {
    marginRight: Spacing.sm,
  },
});

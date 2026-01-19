import { type ReactNode, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BorderRadius, BrandColors, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const AnimatedView = Animated.View;

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  disabled?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  disabled = false,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [_isFocused, setIsFocused] = useState(false);
  const borderProgress = useSharedValue(0);

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textMuted = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error ? errorColor : borderProgress.value > 0 ? BrandColors.primary : borderColor,
  }));

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    borderProgress.value = withTiming(1, { duration: 150 });
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    borderProgress.value = withTiming(0, { duration: 150 });
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      <AnimatedView
        style={[
          styles.inputContainer,
          { backgroundColor, borderColor },
          animatedBorderStyle,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: disabled ? textMuted : textColor },
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={textMuted}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </AnimatedView>
      {error && <Text style={[styles.error, { color: errorColor }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: textSecondary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  iconLeft: {
    paddingLeft: Spacing.md,
  },
  iconRight: {
    paddingRight: Spacing.md,
  },
  error: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});

import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { BorderRadius, BrandColors, Spacing, StatusColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'needsAttention';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const sizeStyles: Record<
  BadgeSize,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { paddingVertical: 2, paddingHorizontal: Spacing.sm, fontSize: 10 },
  md: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, fontSize: 12 },
  lg: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.lg, fontSize: 14 },
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  testID,
}: BadgeProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const errorColor = useThemeColor({}, 'error');
  const errorBg = useThemeColor({}, 'errorBackground');
  const successColor = useThemeColor({}, 'success');
  const successBg = useThemeColor({}, 'successBackground');
  const warningColor = useThemeColor({}, 'warning');
  const warningBg = useThemeColor({}, 'warningBackground');
  const infoColor = useThemeColor({}, 'info');
  const infoBg = useThemeColor({}, 'infoBackground');

  const getVariantStyles = (): { bg: string; text: string } => {
    switch (variant) {
      case 'primary':
        return { bg: BrandColors.primary, text: '#FFFFFF' };
      case 'success':
        return { bg: successBg, text: successColor };
      case 'warning':
        return { bg: warningBg, text: warningColor };
      case 'error':
        return { bg: errorBg, text: errorColor };
      case 'info':
        return { bg: infoBg, text: infoColor };
      case 'available':
        return { bg: '#DCFCE7', text: StatusColors.available };
      case 'occupied':
        return { bg: '#FEF3C7', text: StatusColors.occupied };
      case 'reserved':
        return { bg: '#DBEAFE', text: StatusColors.reserved };
      case 'pending':
        return { bg: '#F3F4F6', text: StatusColors.pending };
      case 'preparing':
        return { bg: '#FFEDD5', text: StatusColors.preparing };
      case 'ready':
        return { bg: '#D1FAE5', text: StatusColors.ready };
      case 'needsAttention':
        return { bg: '#FEE2E2', text: StatusColors.needsAttention };
      default:
        return { bg: backgroundColor, text: textColor };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeConfig = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.bg,
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
    >
      <Text
        style={[
          styles.text,
          { color: variantStyles.text, fontSize: sizeConfig.fontSize },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

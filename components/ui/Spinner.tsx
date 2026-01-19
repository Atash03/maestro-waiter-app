import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

const sizeValues: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

const containerSizes: Record<SpinnerSize, number> = {
  sm: 20,
  md: 32,
  lg: 48,
};

export function Spinner({ size = 'md', color, style, testID }: SpinnerProps) {
  const _tintColor = useThemeColor({}, 'tint');
  const spinnerColor = color ?? BrandColors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSizes[size],
          height: containerSizes[size],
        },
        style,
      ]}
      testID={testID}
    >
      <ActivityIndicator size={sizeValues[size]} color={spinnerColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

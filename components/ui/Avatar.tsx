import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  testID?: string;
}

const sizeValues: Record<AvatarSize, { size: number; fontSize: number }> = {
  xs: { size: 24, fontSize: 10 },
  sm: { size: 32, fontSize: 12 },
  md: { size: 40, fontSize: 16 },
  lg: { size: 56, fontSize: 20 },
  xl: { size: 80, fontSize: 28 },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ source, name, size = 'md', style, testID }: AvatarProps) {
  const _backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const _textColor = useThemeColor({}, 'text');

  const sizeConfig = sizeValues[size];

  const containerStyle = [
    styles.container,
    {
      width: sizeConfig.size,
      height: sizeConfig.size,
      borderRadius: sizeConfig.size / 2,
      backgroundColor: source ? 'transparent' : BrandColors.primary,
    },
    style,
  ];

  if (source) {
    return (
      <View style={containerStyle} testID={testID}>
        <Image
          source={source}
          style={[
            styles.image,
            {
              width: sizeConfig.size,
              height: sizeConfig.size,
              borderRadius: sizeConfig.size / 2,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    );
  }

  const initials = name ? getInitials(name) : '?';

  return (
    <View style={containerStyle} testID={testID}>
      <Text style={[styles.initials, { fontSize: sizeConfig.fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

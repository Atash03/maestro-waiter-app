import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { BrandColors, Spacing } from '@/constants/theme';

export interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BackButton({
  onPress,
  color = BrandColors.primary,
  size = 28,
  style,
  testID,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      testID={testID}
    >
      <MaterialIcons name="chevron-left" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xs,
  },
});

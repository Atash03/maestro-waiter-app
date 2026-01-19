import { type ReactNode, useEffect } from 'react';
import { Pressable, Modal as RNModal, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.View;

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  style,
  testID,
}: ModalProps) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'overlay');

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0.9, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity, backdropOpacity]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        <AnimatedPressable
          style={[styles.backdrop, { backgroundColor: overlayColor }, backdropAnimatedStyle]}
          onPress={handleBackdropPress}
        />
        <AnimatedView style={[styles.content, { backgroundColor }, contentAnimatedStyle, style]}>
          {title && (
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} testID="modal-close">
                <Text style={[styles.closeButton, { color: textColor }]}>✕</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.body}>{children}</View>
          {footer && <View style={[styles.footer, { borderTopColor: borderColor }]}>{footer}</View>}
        </AnimatedView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    opacity: 0.6,
  },
  body: {
    padding: Spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
});

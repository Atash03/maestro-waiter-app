/**
 * Send to Kitchen Modal Component
 *
 * Confirmation modal for sending order items to the kitchen.
 * Features:
 * - Confirmation before sending
 * - Loading state during API call
 * - Success animation
 * - Error display with retry option
 */

import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================================================
// Types
// ============================================================================

export type SendToKitchenModalState = 'confirm' | 'sending' | 'success' | 'error';

export interface SendToKitchenModalProps {
  visible: boolean;
  state: SendToKitchenModalState;
  itemCount: number;
  totalQuantity: number;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismissSuccess: () => void;
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SUCCESS_AUTO_DISMISS_DELAY = 2000;

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Success checkmark icon with animation
 */
function SuccessIcon() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate checkmark appearance
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200 }),
      withDelay(100, withSpring(1, { damping: 15 }))
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.successIconContainer, animatedStyle]} testID="success-icon">
      <ThemedText style={styles.successIcon}>✓</ThemedText>
    </Animated.View>
  );
}

/**
 * Error icon
 */
function ErrorIcon() {
  return (
    <View style={styles.errorIconContainer} testID="error-icon">
      <ThemedText style={styles.errorIcon}>!</ThemedText>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SendToKitchenModal({
  visible,
  state,
  itemCount: _itemCount, // Reserved for future use (e.g., "3 items (5 total)")
  totalQuantity,
  errorMessage,
  onConfirm,
  onCancel,
  onRetry,
  onDismissSuccess,
  testID = 'send-to-kitchen-modal',
}: SendToKitchenModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Auto-dismiss success state
  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => {
        onDismissSuccess();
      }, SUCCESS_AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state, onDismissSuccess]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (state === 'confirm' || state === 'error') {
      onCancel();
    }
  }, [state, onCancel]);

  // Get item text (singular/plural)
  const itemText = totalQuantity === 1 ? 'item' : 'items';

  // Render content based on state
  const renderContent = () => {
    switch (state) {
      case 'confirm':
        return (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            testID={`${testID}-confirm`}
          >
            <View style={styles.iconContainer}>
              <ThemedText style={styles.kitchenIcon}>🍳</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: colors.text }]}>Send to Kitchen?</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {`Send ${totalQuantity} ${itemText} to the kitchen for preparation.`}
            </ThemedText>
            <View style={styles.buttonRow}>
              <Button
                testID={`${testID}-cancel-button`}
                variant="outline"
                size="lg"
                onPress={onCancel}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button
                testID={`${testID}-confirm-button`}
                variant="primary"
                size="lg"
                onPress={onConfirm}
                style={styles.button}
              >
                Send Order
              </Button>
            </View>
          </Animated.View>
        );

      case 'sending':
        return (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.centeredContent}
            testID={`${testID}-sending`}
          >
            <ActivityIndicator
              size="large"
              color={BrandColors.primary}
              testID={`${testID}-loading-indicator`}
            />
            <ThemedText style={[styles.title, styles.titleSpaced, { color: colors.text }]}>
              Sending Order...
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {`Sending ${totalQuantity} ${itemText} to the kitchen`}
            </ThemedText>
          </Animated.View>
        );

      case 'success':
        return (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.centeredContent}
            testID={`${testID}-success`}
          >
            <SuccessIcon />
            <ThemedText style={[styles.title, styles.titleSpaced, { color: colors.text }]}>
              Order Sent!
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {`${totalQuantity} ${itemText} sent to the kitchen`}
            </ThemedText>
          </Animated.View>
        );

      case 'error':
        return (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            testID={`${testID}-error`}
          >
            <ErrorIcon />
            <ThemedText style={[styles.title, styles.titleSpaced, { color: colors.text }]}>
              Failed to Send
            </ThemedText>
            <ThemedText style={[styles.errorText, { color: colors.error }]}>
              {errorMessage || 'An unexpected error occurred'}
            </ThemedText>
            <View style={styles.buttonRow}>
              <Button
                testID={`${testID}-dismiss-button`}
                variant="outline"
                size="lg"
                onPress={onCancel}
                style={styles.button}
              >
                Dismiss
              </Button>
              <Button
                testID={`${testID}-retry-button`}
                variant="primary"
                size="lg"
                onPress={onRetry}
                style={styles.button}
              >
                Retry
              </Button>
            </View>
          </Animated.View>
        );
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID={testID}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
        testID={`${testID}-overlay`}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleBackdropPress}
          testID={`${testID}-backdrop`}
        />
        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(15)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
            },
          ]}
          testID={`${testID}-container`}
        >
          {renderContent()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  kitchenIcon: {
    fontSize: 48,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: StatusColors.available,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successIcon: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: StatusColors.needsAttention,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  errorIcon: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleSpaced: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});

// Export types for external use
export type { SendToKitchenModalProps };

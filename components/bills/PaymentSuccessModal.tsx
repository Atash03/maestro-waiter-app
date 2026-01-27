/**
 * PaymentSuccessModal Component
 *
 * A modal that displays after a successful payment showing:
 * - Payment confirmation with checkmark animation
 * - Payment details (amount, method)
 * - Updated bill status (remaining balance or fully paid)
 * - Receipt option button
 */

import { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { PaymentMethod } from '@/src/types/enums';

// ============================================================================
// Types
// ============================================================================

export interface PaymentSuccessModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Payment amount that was processed */
  paymentAmount: number;
  /** Payment method used */
  paymentMethod: PaymentMethod;
  /** Total bill amount */
  totalAmount: number;
  /** New remaining balance after payment */
  remainingBalance: number;
  /** Whether the bill is now fully paid */
  isFullyPaid: boolean;
  /** Callback for receipt action */
  onViewReceipt?: () => void;
  /** Callback to add another payment */
  onAddAnotherPayment?: () => void;
  /** Test ID for the component */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return `${price.toFixed(2)} TMT`;
}

/**
 * Get payment method label
 */
function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return 'Cash';
    case PaymentMethod.BANK_CARD:
      return 'Bank Card';
    case PaymentMethod.GAPJYK_PAY:
      return 'Gapjyk Pay';
    case PaymentMethod.CUSTOMER_ACCOUNT:
      return 'Customer Account';
    default:
      return method;
  }
}

/**
 * Get payment method icon
 */
function getPaymentMethodIcon(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return '💵';
    case PaymentMethod.BANK_CARD:
      return '💳';
    case PaymentMethod.GAPJYK_PAY:
      return '📱';
    case PaymentMethod.CUSTOMER_ACCOUNT:
      return '👤';
    default:
      return '💰';
  }
}

// ============================================================================
// Success Checkmark Animation Component
// ============================================================================

function SuccessCheckmark({ isFullyPaid }: { isFullyPaid: boolean }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Start animation when component mounts
  scale.value = withSequence(
    withSpring(1.2, { damping: 8, stiffness: 150 }),
    withSpring(1, { damping: 12, stiffness: 200 })
  );

  if (isFullyPaid) {
    rotation.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 200 }),
        withTiming(0, { duration: 100 })
      ),
      2,
      false
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        { backgroundColor: isFullyPaid ? StatusColors.ready : BrandColors.primary },
        animatedStyle,
      ]}
    >
      <ThemedText style={styles.checkmarkIcon}>{isFullyPaid ? '🎉' : '✓'}</ThemedText>
    </Animated.View>
  );
}

// ============================================================================
// PaymentSuccessModal Component
// ============================================================================

export function PaymentSuccessModal({
  visible,
  onClose,
  paymentAmount,
  paymentMethod,
  totalAmount,
  remainingBalance,
  isFullyPaid,
  onViewReceipt,
  onAddAnotherPayment,
  testID,
}: PaymentSuccessModalProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleViewReceipt = useCallback(() => {
    if (onViewReceipt) {
      onViewReceipt();
    } else {
      toast.info('Coming Soon', {
        description: 'Receipt printing will be available in a future update',
      });
    }
  }, [onViewReceipt]);

  const handleAddAnotherPayment = useCallback(() => {
    onClose();
    if (onAddAnotherPayment) {
      onAddAnotherPayment();
    }
  }, [onClose, onAddAnotherPayment]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <SuccessCheckmark isFullyPaid={isFullyPaid} />
            </View>

            {/* Title */}
            <Animated.View entering={FadeIn.delay(150).duration(200)}>
              <ThemedText style={styles.title}>
                {isFullyPaid ? 'Payment Complete!' : 'Payment Successful'}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>
                {isFullyPaid
                  ? 'The bill has been fully paid'
                  : 'Your payment has been recorded successfully'}
              </ThemedText>
            </Animated.View>

            {/* Payment Details Card */}
            <Animated.View entering={FadeIn.delay(250).duration(200)} style={styles.detailsCard}>
              <Card padding="md" style={{ backgroundColor: colors.backgroundSecondary }}>
                {/* Payment Amount */}
                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <ThemedText style={styles.paymentMethodIcon}>
                      {getPaymentMethodIcon(paymentMethod)}
                    </ThemedText>
                    <View>
                      <ThemedText style={styles.paymentLabel}>Payment Amount</ThemedText>
                      <ThemedText style={[styles.paymentMethodText, { color: colors.textMuted }]}>
                        {getPaymentMethodLabel(paymentMethod)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.paymentAmount, { color: StatusColors.ready }]}>
                    {formatPrice(paymentAmount)}
                  </ThemedText>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Bill Summary */}
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Total Bill
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatPrice(totalAmount)}</ThemedText>
                </View>

                {isFullyPaid ? (
                  <View style={styles.summaryRow}>
                    <ThemedText style={[styles.summaryLabel, { color: StatusColors.ready }]}>
                      Status
                    </ThemedText>
                    <View style={[styles.paidBadge, { backgroundColor: StatusColors.ready }]}>
                      <ThemedText style={styles.paidBadgeText}>PAID IN FULL</ThemedText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: StatusColors.needsAttention }]}
                    >
                      Remaining Balance
                    </ThemedText>
                    <ThemedText
                      style={[styles.summaryValue, { color: StatusColors.needsAttention }]}
                    >
                      {formatPrice(remainingBalance)}
                    </ThemedText>
                  </View>
                )}
              </Card>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View entering={FadeIn.delay(350).duration(200)} style={styles.actions}>
              {!isFullyPaid && (
                <Button
                  variant="outline"
                  onPress={handleAddAnotherPayment}
                  style={styles.actionButton}
                  testID="add-another-payment-btn"
                >
                  Add Another Payment
                </Button>
              )}

              <Button
                variant={isFullyPaid ? 'outline' : 'secondary'}
                onPress={handleViewReceipt}
                style={styles.actionButton}
                testID="view-receipt-btn"
              >
                View Receipt
              </Button>

              <Button
                variant="primary"
                onPress={onClose}
                style={styles.actionButton}
                testID="done-btn"
              >
                Done
              </Button>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  detailsCard: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paymentMethodIcon: {
    fontSize: 28,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodText: {
    fontSize: 12,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paidBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});

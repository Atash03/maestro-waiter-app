/**
 * PaymentForm Component
 *
 * A modal form for processing payments on a bill.
 * Features:
 * - Payment method selector (Cash, BankCard, GapjykPay, CustomerAccount)
 * - Amount input with default to remaining balance
 * - Split payment support (multiple payments allowed)
 * - Transaction ID input for card payments
 * - Notes field for additional information
 * - Real-time validation and feedback
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PaymentMethod } from '@/src/types/enums';

// ============================================================================
// Types
// ============================================================================

export interface PaymentFormProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when payment is submitted */
  onSubmit: (payment: PaymentFormData) => Promise<void>;
  /** Bill ID to attach the payment to */
  billId: string;
  /** Total amount of the bill */
  totalAmount: number;
  /** Amount already paid */
  paidAmount: number;
  /** Whether the submit action is loading */
  isSubmitting?: boolean;
  /** Test ID for the component */
  testID?: string;
}

export interface PaymentFormData {
  billId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

// ============================================================================
// Payment Method Option Component
// ============================================================================

interface PaymentMethodOptionProps {
  method: PaymentMethod;
  label: string;
  icon: string;
  isSelected: boolean;
  onSelect: (method: PaymentMethod) => void;
  testID?: string;
}

function PaymentMethodOption({
  method,
  label,
  icon,
  isSelected,
  onSelect,
  testID,
}: PaymentMethodOptionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = useCallback(() => {
    onSelect(method);
  }, [method, onSelect]);

  return (
    <Pressable onPress={handlePress} testID={testID}>
      <Card
        padding="md"
        style={{
          ...styles.methodOption,
          ...(isSelected ? styles.methodOptionSelected : {}),
          ...(isSelected ? { borderColor: BrandColors.primary } : { borderColor: colors.border }),
        }}
      >
        <ThemedText style={styles.methodIcon}>{icon}</ThemedText>
        <ThemedText
          style={[styles.methodLabel, isSelected && { color: BrandColors.primary }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: BrandColors.primary }]}>
            <ThemedText style={styles.selectedIndicatorText}>✓</ThemedText>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Get payment method details
 */
function getPaymentMethodDetails(method: PaymentMethod): { label: string; icon: string } {
  switch (method) {
    case PaymentMethod.CASH:
      return { label: 'Cash', icon: '💵' };
    case PaymentMethod.BANK_CARD:
      return { label: 'Bank Card', icon: '💳' };
    case PaymentMethod.GAPJYK_PAY:
      return { label: 'Gapjyk Pay', icon: '📱' };
    case PaymentMethod.CUSTOMER_ACCOUNT:
      return { label: 'Customer Account', icon: '👤' };
    default:
      return { label: method, icon: '💰' };
  }
}

/**
 * Validate payment form
 */
function validatePaymentForm(
  amount: number,
  method: PaymentMethod,
  remainingBalance: number,
  transactionId: string
): string | null {
  if (amount <= 0) {
    return 'Please enter a valid amount';
  }
  if (amount > remainingBalance) {
    return 'Amount exceeds remaining balance';
  }
  if (method === PaymentMethod.BANK_CARD && !transactionId.trim()) {
    return 'Transaction ID is required for card payments';
  }
  return null;
}

// ============================================================================
// PaymentForm Component
// ============================================================================

const PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.BANK_CARD,
  PaymentMethod.GAPJYK_PAY,
  PaymentMethod.CUSTOMER_ACCOUNT,
];

export function PaymentForm({
  visible,
  onClose,
  onSubmit,
  billId,
  totalAmount,
  paidAmount,
  isSubmitting = false,
  testID,
}: PaymentFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Form state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountText, setAmountText] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const remainingBalance = useMemo(
    () => Math.max(0, totalAmount - paidAmount),
    [totalAmount, paidAmount]
  );

  const amountValue = useMemo(() => {
    const parsed = Number.parseFloat(amountText);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [amountText]);

  const requiresTransactionId = selectedMethod === PaymentMethod.BANK_CARD;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedMethod(PaymentMethod.CASH);
      setAmountText(remainingBalance.toFixed(2));
      setTransactionId('');
      setNotes('');
      setError(null);
    }
  }, [visible, remainingBalance]);

  // Handlers
  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
    // Clear transaction ID if not needed
    if (method !== PaymentMethod.BANK_CARD) {
      setTransactionId('');
    }
  }, []);

  const handleAmountChange = useCallback((text: string) => {
    // Allow only valid numeric input
    const sanitized = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    setAmountText(sanitized);
    setError(null);
  }, []);

  const handleSetFullAmount = useCallback(() => {
    setAmountText(remainingBalance.toFixed(2));
    setError(null);
  }, [remainingBalance]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    // Validate
    const validationError = validatePaymentForm(
      amountValue,
      selectedMethod,
      remainingBalance,
      transactionId
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    // Build payment data
    const paymentData: PaymentFormData = {
      billId,
      amount: amountValue,
      method: selectedMethod,
      ...(transactionId.trim() && { transactionId: transactionId.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    try {
      await onSubmit(paymentData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: errorMessage,
      });
    }
  }, [amountValue, selectedMethod, remainingBalance, transactionId, notes, billId, onSubmit]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <ThemedText style={styles.modalTitle}>Add Payment</ThemedText>
                <Pressable
                  onPress={handleClose}
                  hitSlop={8}
                  disabled={isSubmitting}
                  testID="close-payment-modal-btn"
                >
                  <ThemedText style={[styles.closeButton, { color: colors.textMuted }]}>
                    ✕
                  </ThemedText>
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Balance Summary */}
                <Animated.View entering={FadeIn.duration(200)}>
                  <Card padding="md" style={{ backgroundColor: colors.backgroundSecondary }}>
                    <View style={styles.balanceRow}>
                      <ThemedText style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                        Total Bill
                      </ThemedText>
                      <ThemedText style={styles.balanceValue}>
                        {formatPrice(totalAmount)}
                      </ThemedText>
                    </View>
                    {paidAmount > 0 && (
                      <View style={styles.balanceRow}>
                        <ThemedText style={[styles.balanceLabel, { color: StatusColors.ready }]}>
                          Already Paid
                        </ThemedText>
                        <ThemedText style={[styles.balanceValue, { color: StatusColors.ready }]}>
                          {formatPrice(paidAmount)}
                        </ThemedText>
                      </View>
                    )}
                    <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.balanceRow}>
                      <ThemedText style={styles.remainingLabel}>Remaining Balance</ThemedText>
                      <ThemedText style={styles.remainingValue}>
                        {formatPrice(remainingBalance)}
                      </ThemedText>
                    </View>
                  </Card>
                </Animated.View>

                {/* Payment Method Selector */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
                  <View style={styles.methodGrid}>
                    {PAYMENT_METHODS.map((method) => {
                      const details = getPaymentMethodDetails(method);
                      return (
                        <PaymentMethodOption
                          key={method}
                          method={method}
                          label={details.label}
                          icon={details.icon}
                          isSelected={selectedMethod === method}
                          onSelect={handleMethodSelect}
                          testID={`payment-method-${method}`}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Amount Input */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={styles.sectionTitle}>Amount</ThemedText>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={handleSetFullAmount}
                      testID="set-full-amount-btn"
                    >
                      Full Amount
                    </Button>
                  </View>
                  <View
                    style={[
                      styles.amountInputContainer,
                      {
                        borderColor: error ? colors.error : colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <ThemedText style={styles.currencySymbol}>$</ThemedText>
                    <TextInput
                      style={[styles.amountInput, { color: colors.text }]}
                      value={amountText}
                      onChangeText={handleAmountChange}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                      testID="payment-amount-input"
                    />
                  </View>
                </View>

                {/* Transaction ID (for card payments) */}
                {requiresTransactionId && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Transaction ID</ThemedText>
                    <View
                      style={[
                        styles.textInputContainer,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundSecondary,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={transactionId}
                        onChangeText={setTransactionId}
                        placeholder="Enter transaction reference"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                        editable={!isSubmitting}
                        testID="transaction-id-input"
                      />
                    </View>
                    <ThemedText style={[styles.hint, { color: colors.textMuted }]}>
                      Required for card payments
                    </ThemedText>
                  </Animated.View>
                )}

                {/* Notes Input */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Notes (Optional)</ThemedText>
                  <View
                    style={[
                      styles.notesInputContainer,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.notesInput, { color: colors.text }]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add payment notes..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                      maxLength={200}
                      editable={!isSubmitting}
                      testID="payment-notes-input"
                    />
                  </View>
                </View>

                {/* Error Message */}
                {error && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      {error}
                    </ThemedText>
                  </Animated.View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <Button
                  variant="outline"
                  onPress={handleClose}
                  disabled={isSubmitting}
                  style={styles.footerButton}
                  testID="cancel-payment-btn"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                  disabled={isSubmitting || amountValue <= 0}
                  loading={isSubmitting}
                  style={styles.footerButton}
                  testID="submit-payment-btn"
                >
                  {isSubmitting ? 'Processing...' : `Pay ${formatPrice(amountValue)}`}
                </Button>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 20,
  },
  modalBody: {
    maxHeight: 450,
  },
  modalBodyContent: {
    padding: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  footerButton: {
    minWidth: 100,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  balanceDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  remainingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  methodOption: {
    width: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  methodOptionSelected: {
    borderWidth: 2,
  },
  methodIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
  },
  notesInputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 72,
  },
  notesInput: {
    fontSize: 14,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

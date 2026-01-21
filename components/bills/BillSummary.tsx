/**
 * BillSummary Component
 *
 * Displays a complete breakdown of a bill including:
 * - Subtotal
 * - Discounts applied (itemized)
 * - Service fee
 * - Total
 * - Paid amount
 * - Remaining balance
 * - Print/share receipt button (future)
 */

import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { BillStatus, PaymentMethod } from '@/src/types/enums';
import type { Bill, BillDiscount, Payment, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface BillSummaryProps {
  /** The bill to display summary for */
  bill: Bill;
  /** Whether to show itemized discount breakdown */
  showDiscountDetails?: boolean;
  /** Whether to show payment history */
  showPayments?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Callback when print receipt is pressed */
  onPrintReceipt?: () => void;
  /** Callback when share receipt is pressed */
  onShareReceipt?: () => void;
  /** Whether the component is in a compact mode */
  compact?: boolean;
  /** Test ID for the component */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get translated text from Translation object
 */
function getTranslatedText(
  translation: Translation | undefined,
  fallback = '',
  preferredLang: 'en' | 'ru' | 'tm' = 'en'
): string {
  if (!translation) return fallback;
  return (
    translation[preferredLang] || translation.en || translation.ru || translation.tm || fallback
  );
}

/**
 * Format price for display
 */
function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return '$0.00';
  const num = typeof price === 'string' ? Number.parseFloat(price) : price;
  if (Number.isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

/**
 * Format date time for display
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate remaining balance
 */
function calculateRemainingBalance(bill: Bill): number {
  const total = Number.parseFloat(bill.totalAmount) || 0;
  const paid = Number.parseFloat(bill.paidAmount) || 0;
  return Math.max(0, total - paid);
}

/**
 * Get human-readable label for payment method
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

// ============================================================================
// Subcomponents
// ============================================================================

interface SummaryRowProps {
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
  bold?: boolean;
  large?: boolean;
  testID?: string;
}

function SummaryRow({
  label,
  value,
  labelColor,
  valueColor,
  bold = false,
  large = false,
  testID,
}: SummaryRowProps) {
  return (
    <View style={styles.summaryRow} testID={testID}>
      <ThemedText
        style={[
          styles.summaryLabel,
          labelColor && { color: labelColor },
          bold && styles.boldText,
          large && styles.largeText,
        ]}
      >
        {label}
      </ThemedText>
      <ThemedText
        style={[
          styles.summaryValue,
          valueColor && { color: valueColor },
          bold && styles.boldText,
          large && styles.largeText,
        ]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

interface DiscountItemProps {
  discount: BillDiscount;
  index: number;
}

function DiscountItem({ discount, index }: DiscountItemProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const discountName = discount.discount
    ? getTranslatedText(discount.discount.title, 'Discount')
    : 'Discount';

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50).duration(200)}
      style={styles.discountItem}
    >
      <View style={styles.discountItemInfo}>
        <View style={[styles.discountBullet, { backgroundColor: StatusColors.ready }]} />
        <ThemedText
          style={[styles.discountName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {discountName}
        </ThemedText>
      </View>
      <ThemedText style={[styles.discountAmount, { color: StatusColors.ready }]}>
        -{formatPrice(discount.amount)}
      </ThemedText>
    </Animated.View>
  );
}

interface PaymentItemProps {
  payment: Payment;
  index: number;
}

function PaymentItem({ payment, index }: PaymentItemProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50).duration(200)}
      style={styles.paymentItem}
    >
      <View style={styles.paymentItemInfo}>
        <ThemedText style={styles.paymentMethod}>
          {getPaymentMethodLabel(payment.paymentMethod)}
        </ThemedText>
        <ThemedText style={[styles.paymentDate, { color: colors.textMuted }]}>
          {formatDateTime(payment.createdAt)}
        </ThemedText>
        {payment.transactionId && (
          <ThemedText style={[styles.paymentTransaction, { color: colors.textMuted }]}>
            Txn: {payment.transactionId}
          </ThemedText>
        )}
      </View>
      <ThemedText style={[styles.paymentAmount, { color: StatusColors.ready }]}>
        {formatPrice(payment.amount)}
      </ThemedText>
    </Animated.View>
  );
}

// ============================================================================
// BillSummary Component
// ============================================================================

export function BillSummary({
  bill,
  showDiscountDetails = true,
  showPayments = true,
  showActions = true,
  onPrintReceipt,
  onShareReceipt,
  compact = false,
  testID,
}: BillSummaryProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Computed values
  const subtotal = useMemo(() => Number.parseFloat(bill.subtotal) || 0, [bill.subtotal]);
  const discountAmount = useMemo(
    () => Number.parseFloat(bill.discountAmount) || 0,
    [bill.discountAmount]
  );
  const serviceFeeAmount = useMemo(
    () => Number.parseFloat(bill.serviceFeeAmount ?? '0') || 0,
    [bill.serviceFeeAmount]
  );
  const totalAmount = useMemo(() => Number.parseFloat(bill.totalAmount) || 0, [bill.totalAmount]);
  const paidAmount = useMemo(() => Number.parseFloat(bill.paidAmount) || 0, [bill.paidAmount]);
  const remainingBalance = useMemo(() => calculateRemainingBalance(bill), [bill]);

  const hasDiscounts = discountAmount > 0;
  const hasServiceFee = serviceFeeAmount > 0;
  const hasPayments = bill.payments && bill.payments.length > 0;
  const isPaid = bill.status === BillStatus.PAID || remainingBalance <= 0;

  // Handlers
  const handlePrintReceipt = useCallback(() => {
    if (onPrintReceipt) {
      onPrintReceipt();
    } else {
      toast.info('Coming Soon', {
        description: 'Receipt printing will be available in a future update',
      });
    }
  }, [onPrintReceipt]);

  const handleShareReceipt = useCallback(() => {
    if (onShareReceipt) {
      onShareReceipt();
    } else {
      toast.info('Coming Soon', {
        description: 'Receipt sharing will be available in a future update',
      });
    }
  }, [onShareReceipt]);

  return (
    <Animated.View entering={FadeIn.duration(300)} testID={testID}>
      <Card padding={compact ? 'sm' : 'md'} elevated style={styles.card}>
        {/* Summary Section */}
        <View style={styles.summarySection}>
          {/* Subtotal */}
          <SummaryRow
            label="Subtotal"
            value={formatPrice(subtotal)}
            labelColor={colors.textSecondary}
            testID={`${testID}-subtotal`}
          />

          {/* Discounts */}
          {hasDiscounts && (
            <>
              <SummaryRow
                label="Discounts"
                value={`-${formatPrice(discountAmount)}`}
                labelColor={StatusColors.ready}
                valueColor={StatusColors.ready}
                testID={`${testID}-discount-total`}
              />

              {/* Itemized discounts */}
              {showDiscountDetails && bill.discounts && bill.discounts.length > 0 && (
                <View style={styles.discountsList}>
                  {bill.discounts.map((discount, index) => (
                    <DiscountItem key={discount.discountId} discount={discount} index={index} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Service Fee */}
          {hasServiceFee && (
            <SummaryRow
              label={
                bill.order?.serviceFeeTitle
                  ? `Service Fee (${getTranslatedText(bill.order.serviceFeeTitle, 'Service')})`
                  : 'Service Fee'
              }
              value={formatPrice(serviceFeeAmount)}
              labelColor={colors.textSecondary}
              testID={`${testID}-service-fee`}
            />
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Total */}
          <SummaryRow
            label="Total"
            value={formatPrice(totalAmount)}
            bold
            large
            valueColor={BrandColors.primary}
            testID={`${testID}-total`}
          />

          {/* Paid Amount */}
          {paidAmount > 0 && (
            <SummaryRow
              label="Paid"
              value={formatPrice(paidAmount)}
              labelColor={StatusColors.ready}
              valueColor={StatusColors.ready}
              testID={`${testID}-paid`}
            />
          )}

          {/* Remaining Balance */}
          {!isPaid && remainingBalance > 0 && (
            <SummaryRow
              label="Remaining"
              value={formatPrice(remainingBalance)}
              labelColor={StatusColors.needsAttention}
              valueColor={StatusColors.needsAttention}
              bold
              testID={`${testID}-remaining`}
            />
          )}

          {/* Fully Paid Badge */}
          {isPaid && (
            <View style={styles.paidBadgeContainer}>
              <View style={[styles.paidBadge, { backgroundColor: StatusColors.ready }]}>
                <ThemedText style={styles.paidBadgeText}>Fully Paid</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Payments Section */}
        {showPayments && hasPayments && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.paymentsSection}>
              <ThemedText style={styles.sectionTitle}>Payment History</ThemedText>
              {bill.payments?.map((payment, index) => (
                <PaymentItem key={payment.id} payment={payment} index={index} />
              ))}
            </View>
          </>
        )}

        {/* Action Buttons */}
        {showActions && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.actionsSection}>
              <Pressable
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={handlePrintReceipt}
                testID={`${testID}-print-btn`}
              >
                <ThemedText style={styles.actionButtonIcon}>🖨️</ThemedText>
                <ThemedText style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  Print
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={handleShareReceipt}
                testID={`${testID}-share-btn`}
              >
                <ThemedText style={styles.actionButtonIcon}>📤</ThemedText>
                <ThemedText style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  Share
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}
      </Card>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  summarySection: {
    gap: Spacing.xs,
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
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
  },
  largeText: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    marginVertical: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  discountsList: {
    marginLeft: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  discountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  discountItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  discountBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  discountName: {
    fontSize: 13,
    flex: 1,
  },
  discountAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  paidBadgeContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  paidBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentsSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  paymentItemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentTransaction: {
    fontSize: 11,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

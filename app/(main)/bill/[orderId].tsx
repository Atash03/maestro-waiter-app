/**
 * Bill Screen
 *
 * Displays bill information for an order including:
 * - Order items to be billed
 * - Subtotal, discounts, service fee, total
 * - Payment section
 * - Bill calculation preview before creation
 * - Item selection for split billing (future)
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { DiscountSelector } from '@/components/bills/DiscountSelector';
import { PaymentForm, type PaymentFormData } from '@/components/bills/PaymentForm';
import { PaymentSuccessModal } from '@/components/bills/PaymentSuccessModal';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useHapticRefresh } from '@/src/hooks';
import {
  useBillByOrder,
  useBillCacheActions,
  useBillCalculation,
} from '@/src/hooks/useBillQueries';
import { useOrder } from '@/src/hooks/useOrderQueries';
import { createBill, updateBillDiscounts } from '@/src/services/api/bills';
import { createPayment } from '@/src/services/api/payments';
import type { CalculateBillResponse } from '@/src/types/api';
import { BillStatus, OrderItemStatus, PaymentMethod } from '@/src/types/enums';
import type { Bill, BillItem, OrderItem, Payment, Translation } from '@/src/types/models';

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
function formatPrice(price: string | undefined): string {
  if (!price) return '$0.00';
  const num = Number.parseFloat(price);
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
 * Get badge variant for bill status
 */
function getBillStatusBadgeVariant(status: BillStatus | undefined): BadgeVariant {
  switch (status) {
    case BillStatus.DRAFT:
      return 'pending';
    case BillStatus.FINALIZED:
      return 'warning';
    case BillStatus.PAID:
      return 'success';
    case BillStatus.CANCELLED:
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get human-readable label for bill status
 */
function getBillStatusLabel(status: BillStatus | undefined): string {
  switch (status) {
    case BillStatus.DRAFT:
      return 'Draft';
    case BillStatus.FINALIZED:
      return 'Finalized';
    case BillStatus.PAID:
      return 'Paid';
    case BillStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
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

/**
 * Calculate remaining balance
 */
function calculateRemainingBalance(bill: Bill): number {
  const total = Number.parseFloat(bill.totalAmount) || 0;
  const paid = Number.parseFloat(bill.paidAmount) || 0;
  return Math.max(0, total - paid);
}

/**
 * Check if order items can be billed
 */
function canBillItems(items: OrderItem[] | undefined): boolean {
  if (!items || items.length === 0) return false;
  // At least one item must be in a billable state (not pending, not cancelled/declined)
  return items.some(
    (item) =>
      item.status !== OrderItemStatus.PENDING &&
      item.status !== OrderItemStatus.CANCELED &&
      item.status !== OrderItemStatus.DECLINED
  );
}

/**
 * Get billable items from order
 */
function getBillableItems(items: OrderItem[] | undefined): OrderItem[] {
  if (!items) return [];
  return items.filter(
    (item) => item.status !== OrderItemStatus.CANCELED && item.status !== OrderItemStatus.DECLINED
  );
}

// ============================================================================
// Bill Item Row Component
// ============================================================================

interface BillItemRowProps {
  item: OrderItem;
  testID?: string;
}

function BillItemRow({ item, testID }: BillItemRowProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const quantity = Number.parseInt(item.quantity, 10) || 0;
  const extrasText = item.extras
    ?.map((extra) => {
      const name = getTranslatedText(extra.title, 'Extra');
      return extra.quantity > 1 ? `${extra.quantity}x ${name}` : name;
    })
    .join(', ');

  return (
    <Animated.View entering={SlideInRight.duration(300)} testID={testID}>
      <View style={styles.billItemRow}>
        <View style={styles.billItemInfo}>
          <ThemedText style={styles.billItemName} numberOfLines={1}>
            {getTranslatedText(item.itemTitle, 'Unknown Item')}
          </ThemedText>
          {extrasText && (
            <ThemedText
              style={[styles.billItemExtras, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {extrasText}
            </ThemedText>
          )}
        </View>
        <View style={styles.billItemQuantity}>
          <ThemedText style={[styles.billItemQuantityText, { color: colors.textSecondary }]}>
            x{quantity}
          </ThemedText>
        </View>
        <View style={styles.billItemPrice}>
          <ThemedText style={styles.billItemPriceText}>{formatPrice(item.subtotal)}</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// Payment Row Component
// ============================================================================

interface PaymentRowProps {
  payment: Payment;
  testID?: string;
}

function PaymentRow({ payment, testID }: PaymentRowProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.paymentRow} testID={testID}>
      <View style={styles.paymentInfo}>
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
      <ThemedText style={styles.paymentAmount}>{formatPrice(payment.amount)}</ThemedText>
    </View>
  );
}

// ============================================================================
// Bill Calculation Preview Modal
// ============================================================================

interface BillCalculationPreviewProps {
  visible: boolean;
  calculation: CalculateBillResponse | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

function BillCalculationPreviewModal({
  visible,
  calculation,
  isLoading,
  onConfirm,
  onCancel,
  isCreating,
}: BillCalculationPreviewProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          <ThemedText style={styles.modalTitle}>Create Bill</ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: colors.textMuted }]}>
            Review the bill summary before creating
          </ThemedText>

          {isLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <ThemedText style={[styles.modalLoadingText, { color: colors.textMuted }]}>
                Calculating totals...
              </ThemedText>
            </View>
          ) : calculation ? (
            <View style={styles.calculationSummary}>
              <View style={styles.calculationRow}>
                <ThemedText style={[styles.calculationLabel, { color: colors.textSecondary }]}>
                  Subtotal
                </ThemedText>
                <ThemedText style={styles.calculationValue}>
                  {formatPrice(calculation.subtotal)}
                </ThemedText>
              </View>

              {Number.parseFloat(calculation.discountAmount) > 0 && (
                <View style={styles.calculationRow}>
                  <ThemedText style={[styles.calculationLabel, { color: StatusColors.ready }]}>
                    Discounts
                  </ThemedText>
                  <ThemedText style={[styles.calculationValue, { color: StatusColors.ready }]}>
                    -{formatPrice(calculation.discountAmount)}
                  </ThemedText>
                </View>
              )}

              {Number.parseFloat(calculation.serviceFeeAmount) > 0 && (
                <View style={styles.calculationRow}>
                  <ThemedText style={[styles.calculationLabel, { color: colors.textSecondary }]}>
                    Service Fee
                  </ThemedText>
                  <ThemedText style={styles.calculationValue}>
                    {formatPrice(calculation.serviceFeeAmount)}
                  </ThemedText>
                </View>
              )}

              <View style={[styles.calculationDivider, { backgroundColor: colors.border }]} />

              <View style={styles.calculationRow}>
                <ThemedText style={styles.calculationTotalLabel}>Total</ThemedText>
                <ThemedText style={styles.calculationTotalValue}>
                  {formatPrice(calculation.totalAmount)}
                </ThemedText>
              </View>
            </View>
          ) : (
            <View style={styles.modalLoadingContainer}>
              <ThemedText style={[styles.modalErrorText, { color: StatusColors.needsAttention }]}>
                Failed to calculate bill totals
              </ThemedText>
            </View>
          )}

          <View style={styles.modalActions}>
            <Button
              variant="outline"
              onPress={onCancel}
              disabled={isCreating}
              style={styles.modalButton}
              testID="cancel-create-bill-btn"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={onConfirm}
              disabled={isLoading || !calculation || isCreating}
              style={styles.modalButton}
              testID="confirm-create-bill-btn"
            >
              {isCreating ? 'Creating...' : 'Create Bill'}
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function BillSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <Card padding="md" style={styles.skeletonCard}>
        <SkeletonGroup count={2} spacing={Spacing.sm}>
          <Skeleton width="60%" height={24} variant="text" />
        </SkeletonGroup>
        <SkeletonGroup count={3} spacing={Spacing.xs} style={{ marginTop: Spacing.md }}>
          <Skeleton width="80%" height={16} variant="text" />
        </SkeletonGroup>
      </Card>

      <SkeletonGroup count={4} spacing={Spacing.sm} style={{ marginTop: Spacing.md }}>
        <Card padding="md">
          <Skeleton width="70%" height={20} variant="text" />
          <Skeleton width="30%" height={16} variant="text" style={{ marginTop: Spacing.sm }} />
        </Card>
      </SkeletonGroup>

      <Card padding="md" style={{ marginTop: Spacing.md }}>
        <SkeletonGroup count={4} spacing={Spacing.sm}>
          <Skeleton width="100%" height={20} variant="text" />
        </SkeletonGroup>
      </Card>
    </View>
  );
}

// ============================================================================
// Bill Screen
// ============================================================================

export default function BillScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Data fetching
  const {
    data: order,
    isLoading: isLoadingOrder,
    error: orderError,
    refetch: refetchOrder,
  } = useOrder({ id: orderId ?? '' });

  const {
    data: billsResponse,
    isLoading: isLoadingBill,
    error: billError,
    refetch: refetchBill,
    isRefetching,
  } = useBillByOrder({ orderId: orderId ?? '' });

  const { invalidateBillByOrder } = useBillCacheActions();

  // Get the bill from the response (if exists)
  const bill = useMemo(() => {
    if (!billsResponse?.data || billsResponse.data.length === 0) return null;
    return billsResponse.data[0];
  }, [billsResponse]);

  // State
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [isApplyingDiscounts, setIsApplyingDiscounts] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    amount: number;
    method: PaymentMethod;
    newRemainingBalance: number;
    isFullyPaid: boolean;
  } | null>(null);

  // Bill calculation for preview (enabled only when modal is open)
  const {
    data: billCalculation,
    isLoading: isCalculating,
    refetch: refetchCalculation,
  } = useBillCalculation({
    request: { orderId: orderId ?? '' },
    enabled: showPreviewModal && Boolean(orderId) && !bill,
  });

  // Refetch calculation when modal opens
  useEffect(() => {
    if (showPreviewModal && orderId && !bill) {
      refetchCalculation();
    }
  }, [showPreviewModal, orderId, bill, refetchCalculation]);

  // Loading state
  const isLoading = isLoadingOrder || isLoadingBill;
  const error = orderError || billError;

  // Pull to refresh with haptic feedback
  const { isRefreshing, handleRefresh } = useHapticRefresh({
    onRefresh: async () => {
      await Promise.all([refetchOrder(), refetchBill()]);
    },
  });

  // Open bill creation preview modal
  const handleOpenCreateBillPreview = useCallback(() => {
    if (!order || !orderId) return;

    const billableItems = getBillableItems(order.orderItems);
    if (billableItems.length === 0) {
      toast.error('Cannot Create Bill', {
        description: 'No billable items in this order',
      });
      return;
    }

    setShowPreviewModal(true);
  }, [order, orderId]);

  // Close preview modal
  const handleClosePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  // Open discount selector modal
  const handleOpenDiscountModal = useCallback(() => {
    if (!bill) return;
    setShowDiscountModal(true);
  }, [bill]);

  // Close discount selector modal
  const handleCloseDiscountModal = useCallback(() => {
    setShowDiscountModal(false);
  }, []);

  // Open payment modal
  const handleOpenPaymentModal = useCallback(() => {
    if (!bill) return;
    setShowPaymentModal(true);
  }, [bill]);

  // Close payment modal
  const handleClosePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  // Handle payment submission
  const handleSubmitPayment = useCallback(
    async (paymentData: PaymentFormData) => {
      if (!bill) return;

      setIsProcessingPayment(true);

      try {
        await createPayment({
          billId: paymentData.billId,
          amount: paymentData.amount,
          method: paymentData.method,
          transactionId: paymentData.transactionId,
          notes: paymentData.notes,
        });

        // Calculate new remaining balance after payment
        const currentPaid = Number.parseFloat(bill.paidAmount) || 0;
        const totalBill = Number.parseFloat(bill.totalAmount) || 0;
        const newPaidAmount = currentPaid + paymentData.amount;
        const newRemainingBalance = Math.max(0, totalBill - newPaidAmount);
        const isFullyPaid = newRemainingBalance <= 0;

        // Store payment info for success modal
        setLastPaymentInfo({
          amount: paymentData.amount,
          method: paymentData.method,
          newRemainingBalance,
          isFullyPaid,
        });

        setShowPaymentModal(false);
        invalidateBillByOrder(orderId ?? '');
        await refetchBill();

        // Show success modal
        setShowSuccessModal(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
        toast.error('Payment Failed', {
          description: errorMessage,
        });
        throw err; // Re-throw to let the form handle the error state
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [bill, orderId, invalidateBillByOrder, refetchBill]
  );

  // Close success modal
  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setLastPaymentInfo(null);
  }, []);

  // Add another payment from success modal
  const handleAddAnotherPaymentFromSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setLastPaymentInfo(null);
    // Delay opening payment modal slightly to allow success modal to close
    setTimeout(() => {
      setShowPaymentModal(true);
    }, 100);
  }, []);

  // Apply discounts to bill
  const handleApplyDiscounts = useCallback(
    async (discountIds: string[], customAmount?: number) => {
      if (!bill) return;

      setIsApplyingDiscounts(true);

      try {
        await updateBillDiscounts(bill.id, {
          discountIds,
          customDiscountAmount: customAmount,
        });

        toast.success('Discounts Applied', {
          description: 'Bill has been updated with selected discounts',
        });

        setShowDiscountModal(false);
        invalidateBillByOrder(orderId ?? '');
        await refetchBill();
      } catch (err) {
        toast.error('Error', {
          description: err instanceof Error ? err.message : 'Failed to apply discounts',
        });
      } finally {
        setIsApplyingDiscounts(false);
      }
    },
    [bill, orderId, invalidateBillByOrder, refetchBill]
  );

  // Confirm and create bill
  const handleConfirmCreateBill = useCallback(async () => {
    if (!order || !orderId) return;

    const billableItems = getBillableItems(order.orderItems);
    if (billableItems.length === 0) {
      toast.error('Cannot Create Bill', {
        description: 'No billable items in this order',
      });
      return;
    }

    setIsCreatingBill(true);

    try {
      const items: BillItem[] = billableItems.map((item) => ({
        orderItemId: item.id,
        quantity: Number.parseInt(item.quantity, 10) || 1,
        price: item.subtotal,
      }));

      await createBill({
        orderId,
        items,
        customerId: order.customerId ?? undefined,
      });

      toast.success('Bill Created', {
        description: 'Bill has been created successfully',
      });

      setShowPreviewModal(false);
      invalidateBillByOrder(orderId);
      await refetchBill();
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create bill',
      });
    } finally {
      setIsCreatingBill(false);
    }
  }, [order, orderId, invalidateBillByOrder, refetchBill]);

  // Computed values
  const billableItems = useMemo(() => getBillableItems(order?.orderItems), [order?.orderItems]);
  const canCreateBill = useMemo(
    () => !bill && canBillItems(order?.orderItems),
    [bill, order?.orderItems]
  );
  const remainingBalance = useMemo(() => (bill ? calculateRemainingBalance(bill) : 0), [bill]);
  const isPaid = bill?.status === BillStatus.PAID;
  const hasPayments = bill?.payments && bill.payments.length > 0;

  // Get currently applied discount IDs from bill
  const currentDiscountIds = useMemo(
    () => bill?.discounts?.map((d) => d.discountId) ?? [],
    [bill?.discounts]
  );

  // Get current bill subtotal for discount calculation
  const billSubtotal = useMemo(() => Number.parseFloat(bill?.subtotal ?? '0'), [bill?.subtotal]);

  // Get bill total and paid amounts for payment form
  const billTotalAmount = useMemo(
    () => Number.parseFloat(bill?.totalAmount ?? '0'),
    [bill?.totalAmount]
  );
  const billPaidAmount = useMemo(
    () => Number.parseFloat(bill?.paidAmount ?? '0'),
    [bill?.paidAmount]
  );

  // Error state
  if (error && !isLoading) {
    return (
      <View
        style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}
      >
        <ThemedText style={styles.errorText}>Failed to load bill</ThemedText>
        <ThemedText style={[styles.errorSubtext, { color: colors.textMuted }]}>
          {error.message}
        </ThemedText>
        <Button variant="primary" onPress={() => handleRefresh()} style={{ marginTop: Spacing.md }}>
          Retry
        </Button>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>{'<'} Back</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>Bill</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <BillSkeleton />
      </View>
    );
  }

  // No order found
  if (!order) {
    return (
      <View
        style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}
      >
        <ThemedText style={styles.errorText}>Order not found</ThemedText>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="bill-back-btn">
          <ThemedText style={styles.backButtonText}>{'<'} Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Bill - {order.orderCode}</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        testID="bill-scroll"
      >
        {/* Bill Status Card (if bill exists) */}
        {bill && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Card padding="md" elevated style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Badge variant={getBillStatusBadgeVariant(bill.status)} size="md">
                  {getBillStatusLabel(bill.status)}
                </Badge>
                {isPaid && (
                  <View style={[styles.paidBadge, { backgroundColor: StatusColors.ready }]}>
                    <ThemedText style={styles.paidBadgeText}>Fully Paid</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={[styles.billDate, { color: colors.textMuted }]}>
                Created: {formatDateTime(bill.createdAt)}
              </ThemedText>
            </Card>
          </Animated.View>
        )}

        {/* Order Items Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Items</ThemedText>
          <Card padding="md">
            {billableItems.length > 0 ? (
              billableItems.map((item, index) => (
                <BillItemRow key={item.id} item={item} testID={`bill-item-${index}`} />
              ))
            ) : (
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                No items to bill
              </ThemedText>
            )}
          </Card>
        </View>

        {/* Bill Summary Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Summary</ThemedText>
          <Card padding="md" elevated>
            {/* Subtotal */}
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Subtotal
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatPrice(bill?.subtotal ?? order.totalAmount)}
              </ThemedText>
            </View>

            {/* Discounts */}
            {bill && Number.parseFloat(bill.discountAmount) > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: StatusColors.ready }]}>
                  Discounts
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: StatusColors.ready }]}>
                  -{formatPrice(bill.discountAmount)}
                </ThemedText>
              </View>
            )}

            {/* Service Fee */}
            {(bill?.serviceFeeAmount || order.serviceFeeAmount) && (
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Service Fee {order.serviceFeePercent ? `(${order.serviceFeePercent}%)` : ''}
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {formatPrice(bill?.serviceFeeAmount ?? order.serviceFeeAmount)}
                </ThemedText>
              </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Total */}
            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>
                {formatPrice(bill?.totalAmount ?? order.totalAmount)}
              </ThemedText>
            </View>

            {/* Paid Amount (if bill exists) */}
            {bill && hasPayments && (
              <>
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: StatusColors.ready }]}>
                    Paid
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: StatusColors.ready }]}>
                    {formatPrice(bill.paidAmount)}
                  </ThemedText>
                </View>

                {/* Remaining Balance */}
                {remainingBalance > 0 && (
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: StatusColors.needsAttention }]}
                    >
                      Remaining
                    </ThemedText>
                    <ThemedText
                      style={[styles.summaryValue, { color: StatusColors.needsAttention }]}
                    >
                      {formatPrice(remainingBalance.toFixed(2))}
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        {/* Payments Section (if bill exists and has payments) */}
        {bill && hasPayments && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Payments</ThemedText>
            <Card padding="md">
              {bill.payments?.map((payment, index) => (
                <PaymentRow key={payment.id} payment={payment} testID={`payment-${index}`} />
              ))}
            </Card>
          </View>
        )}

        {/* Applied Discounts Section (if bill exists and has discounts) */}
        {bill?.discounts && bill.discounts.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Applied Discounts</ThemedText>
            <Card padding="md">
              {bill.discounts.map((discount, index) => (
                <View
                  key={discount.discountId}
                  style={styles.discountRow}
                  testID={`discount-${index}`}
                >
                  <ThemedText style={styles.discountName}>
                    {discount.discount
                      ? getTranslatedText(discount.discount.title, 'Discount')
                      : 'Discount'}
                  </ThemedText>
                  <ThemedText style={[styles.discountAmount, { color: StatusColors.ready }]}>
                    -{formatPrice(discount.amount)}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Create Bill Button (if no bill exists) */}
          {canCreateBill && (
            <Button
              variant="primary"
              onPress={handleOpenCreateBillPreview}
              disabled={isCreatingBill}
              style={styles.actionButton}
              testID="create-bill-btn"
            >
              Create Bill
            </Button>
          )}

          {/* Bill exists - show payment actions */}
          {bill && !isPaid && (
            <>
              <Button
                variant="outline"
                onPress={handleOpenDiscountModal}
                disabled={isApplyingDiscounts}
                style={styles.actionButton}
                testID="add-discount-btn"
              >
                {bill.discounts && bill.discounts.length > 0 ? 'Edit Discounts' : 'Add Discount'}
              </Button>
              <Button
                variant="primary"
                onPress={handleOpenPaymentModal}
                disabled={isProcessingPayment}
                style={styles.actionButton}
                testID="add-payment-btn"
              >
                Add Payment
              </Button>
            </>
          )}

          {/* Print/Share Receipt (if paid) */}
          {isPaid && (
            <Button
              variant="outline"
              onPress={() => {
                toast.info('Coming Soon', {
                  description: 'Receipt printing will be implemented in a future update',
                });
              }}
              style={styles.actionButton}
              testID="print-receipt-btn"
            >
              Print Receipt
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isRefetching && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
        </View>
      )}

      {/* Bill Calculation Preview Modal */}
      <BillCalculationPreviewModal
        visible={showPreviewModal}
        calculation={billCalculation ?? null}
        isLoading={isCalculating}
        onConfirm={handleConfirmCreateBill}
        onCancel={handleClosePreviewModal}
        isCreating={isCreatingBill}
      />

      {/* Discount Selector Modal */}
      <DiscountSelector
        visible={showDiscountModal}
        onClose={handleCloseDiscountModal}
        onApply={handleApplyDiscounts}
        billAmount={billSubtotal}
        selectedDiscountIds={currentDiscountIds}
        isApplying={isApplyingDiscounts}
        testID="discount-selector-modal"
      />

      {/* Payment Form Modal */}
      {bill && (
        <PaymentForm
          visible={showPaymentModal}
          onClose={handleClosePaymentModal}
          onSubmit={handleSubmitPayment}
          billId={bill.id}
          totalAmount={billTotalAmount}
          paidAmount={billPaidAmount}
          isSubmitting={isProcessingPayment}
          testID="payment-form-modal"
        />
      )}

      {/* Payment Success Modal */}
      {lastPaymentInfo && (
        <PaymentSuccessModal
          visible={showSuccessModal}
          onClose={handleCloseSuccessModal}
          paymentAmount={lastPaymentInfo.amount}
          paymentMethod={lastPaymentInfo.method}
          totalAmount={billTotalAmount}
          remainingBalance={lastPaymentInfo.newRemainingBalance}
          isFullyPaid={lastPaymentInfo.isFullyPaid}
          onAddAnotherPayment={
            !lastPaymentInfo.isFullyPaid ? handleAddAnotherPaymentFromSuccess : undefined
          }
          testID="payment-success-modal"
        />
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: BrandColors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  skeletonContainer: {
    padding: Spacing.md,
  },
  skeletonCard: {
    marginBottom: Spacing.md,
  },
  statusCard: {
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  paidBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  billDate: {
    fontSize: 12,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  billItemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  billItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  billItemExtras: {
    fontSize: 12,
    marginTop: 2,
  },
  billItemQuantity: {
    width: 40,
    alignItems: 'center',
  },
  billItemQuantityText: {
    fontSize: 14,
  },
  billItemPrice: {
    width: 80,
    alignItems: 'flex-end',
  },
  billItemPriceText: {
    fontSize: 14,
    fontWeight: '600',
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
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  paymentInfo: {
    flex: 1,
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
    color: StatusColors.ready,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  discountName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  discountAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalLoadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalLoadingText: {
    fontSize: 14,
  },
  modalErrorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  calculationSummary: {
    marginBottom: Spacing.lg,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  calculationLabel: {
    fontSize: 14,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  calculationDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  calculationTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  calculationTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

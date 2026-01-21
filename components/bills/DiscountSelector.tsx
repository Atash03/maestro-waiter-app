/**
 * DiscountSelector Component
 *
 * A modal component for selecting and applying discounts to a bill.
 * Features:
 * - Lists available discounts from the API
 * - Multi-select for applicable discounts
 * - Custom discount amount input
 * - Real-time total recalculation preview
 * - Shows discount type (percentage/fixed)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useActiveDiscounts, useDiscountCalculation } from '@/src/hooks/useDiscountQueries';
import { DiscountValueType } from '@/src/types/enums';
import type { Discount, Translation } from '@/src/types/models';

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
 * Format discount value for display
 */
function formatDiscountValue(discount: Discount): string {
  const value = Number.parseFloat(discount.discountValue);
  if (discount.discountValueType === DiscountValueType.PERCENTAGE) {
    return `${value}%`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format price for display
 */
function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? Number.parseFloat(price) : price;
  if (Number.isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

// ============================================================================
// Discount Item Component
// ============================================================================

interface DiscountItemProps {
  discount: Discount;
  isSelected: boolean;
  onToggle: (id: string) => void;
  testID?: string;
}

function DiscountItem({ discount, isSelected, onToggle, testID }: DiscountItemProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = useCallback(() => {
    onToggle(discount.id);
  }, [discount.id, onToggle]);

  return (
    <Animated.View entering={SlideInRight.duration(200)}>
      <Pressable onPress={handlePress} testID={testID}>
        <Card
          padding="md"
          style={{
            ...styles.discountItem,
            ...(isSelected ? styles.discountItemSelected : {}),
            ...(isSelected ? { borderColor: BrandColors.primary } : {}),
          }}
        >
          <View style={styles.discountItemContent}>
            <View style={styles.discountItemInfo}>
              <ThemedText style={styles.discountItemTitle} numberOfLines={1}>
                {getTranslatedText(discount.title, 'Discount')}
              </ThemedText>
              {discount.description && (
                <ThemedText
                  style={[styles.discountItemDescription, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {getTranslatedText(discount.description)}
                </ThemedText>
              )}
            </View>

            <View style={styles.discountItemValue}>
              <ThemedText
                style={[
                  styles.discountValueText,
                  { color: isSelected ? BrandColors.primary : StatusColors.ready },
                ]}
              >
                {formatDiscountValue(discount)}
              </ThemedText>
              <ThemedText style={[styles.discountTypeText, { color: colors.textMuted }]}>
                {discount.discountValueType === DiscountValueType.PERCENTAGE ? 'off' : 'fixed'}
              </ThemedText>
            </View>

            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
                isSelected && {
                  backgroundColor: BrandColors.primary,
                  borderColor: BrandColors.primary,
                },
                !isSelected && { borderColor: colors.border },
              ]}
            >
              {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DiscountListSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonGroup count={4} spacing={Spacing.sm}>
        <Card padding="md">
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonContent}>
              <Skeleton width="60%" height={18} variant="text" />
              <Skeleton width="80%" height={14} variant="text" style={{ marginTop: Spacing.xs }} />
            </View>
            <Skeleton width={60} height={24} variant="rounded" />
          </View>
        </Card>
      </SkeletonGroup>
    </View>
  );
}

// ============================================================================
// Discount Selector Props
// ============================================================================

export interface DiscountSelectorProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when discounts are applied */
  onApply: (discountIds: string[], customAmount?: number) => void;
  /** Bill amount for calculation */
  billAmount: number;
  /** Currently applied discount IDs */
  selectedDiscountIds?: string[];
  /** Currently applied custom discount amount */
  customDiscountAmount?: number;
  /** Whether the apply action is loading */
  isApplying?: boolean;
  /** Test ID for the component */
  testID?: string;
}

// ============================================================================
// Discount Selector Component
// ============================================================================

export function DiscountSelector({
  visible,
  onClose,
  onApply,
  billAmount,
  selectedDiscountIds = [],
  customDiscountAmount = 0,
  isApplying = false,
  testID,
}: DiscountSelectorProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Local state for selections
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedDiscountIds);
  const [localCustomAmount, setLocalCustomAmount] = useState<string>(
    customDiscountAmount > 0 ? customDiscountAmount.toString() : ''
  );

  // Reset local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedDiscountIds);
      setLocalCustomAmount(customDiscountAmount > 0 ? customDiscountAmount.toString() : '');
    }
  }, [visible, selectedDiscountIds, customDiscountAmount]);

  // Fetch active discounts
  const {
    data: discountsResponse,
    isLoading: isLoadingDiscounts,
    error: discountsError,
    refetch: refetchDiscounts,
  } = useActiveDiscounts();

  // Calculate discount preview
  const customAmountNum = Number.parseFloat(localCustomAmount) || 0;
  const { data: calculationResult, isLoading: isCalculating } = useDiscountCalculation({
    request: {
      billAmount,
      discountIds: localSelectedIds,
      customerId: undefined,
    },
    enabled: visible && (localSelectedIds.length > 0 || customAmountNum > 0),
  });

  // Handlers
  const handleToggleDiscount = useCallback((id: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleCustomAmountChange = useCallback((text: string) => {
    // Allow only valid numeric input
    const sanitized = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    setLocalCustomAmount(sanitized);
  }, []);

  const handleApply = useCallback(() => {
    const customAmount = Number.parseFloat(localCustomAmount) || 0;
    if (localSelectedIds.length === 0 && customAmount <= 0) {
      toast.error('No Discounts Selected', {
        description: 'Please select at least one discount or enter a custom amount',
      });
      return;
    }
    onApply(localSelectedIds, customAmount > 0 ? customAmount : undefined);
  }, [localSelectedIds, localCustomAmount, onApply]);

  const handleClearAll = useCallback(() => {
    setLocalSelectedIds([]);
    setLocalCustomAmount('');
  }, []);

  // Computed values
  const discounts = useMemo(() => discountsResponse?.data ?? [], [discountsResponse?.data]);

  const totalDiscount = useMemo(() => {
    const calculatedDiscount = calculationResult?.totalDiscount
      ? Number.parseFloat(calculationResult.totalDiscount)
      : 0;
    const customAmount = Number.parseFloat(localCustomAmount) || 0;
    return calculatedDiscount + customAmount;
  }, [calculationResult?.totalDiscount, localCustomAmount]);

  const hasChanges = useMemo(() => {
    const customAmount = Number.parseFloat(localCustomAmount) || 0;
    const originalCustom = customDiscountAmount || 0;

    if (localSelectedIds.length !== selectedDiscountIds.length) return true;
    if (!localSelectedIds.every((id) => selectedDiscountIds.includes(id))) return true;
    if (customAmount !== originalCustom) return true;

    return false;
  }, [localSelectedIds, selectedDiscountIds, localCustomAmount, customDiscountAmount]);

  // Render discount item
  const renderDiscountItem = useCallback(
    ({ item, index }: { item: Discount; index: number }) => (
      <DiscountItem
        discount={item}
        isSelected={localSelectedIds.includes(item.id)}
        onToggle={handleToggleDiscount}
        testID={`discount-item-${index}`}
      />
    ),
    [localSelectedIds, handleToggleDiscount]
  );

  const keyExtractor = useCallback((item: Discount) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>Select Discounts</ThemedText>
            <Pressable onPress={onClose} hitSlop={8} testID="close-discount-modal-btn">
              <ThemedText style={[styles.closeButton, { color: colors.textMuted }]}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.modalBody}>
            {/* Error State */}
            {discountsError && !isLoadingDiscounts && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  Failed to load discounts
                </ThemedText>
                <Button
                  variant="outline"
                  onPress={() => refetchDiscounts()}
                  style={styles.retryButton}
                  testID="retry-load-discounts-btn"
                >
                  Retry
                </Button>
              </Animated.View>
            )}

            {/* Loading State */}
            {isLoadingDiscounts && <DiscountListSkeleton />}

            {/* Discount List */}
            {!isLoadingDiscounts && !discountsError && discounts.length > 0 && (
              <FlatList
                data={discounts}
                renderItem={renderDiscountItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                testID="discount-list"
              />
            )}

            {/* Empty State */}
            {!isLoadingDiscounts && !discountsError && discounts.length === 0 && (
              <View style={styles.emptyContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                  No discounts available
                </ThemedText>
              </View>
            )}

            {/* Custom Discount Input */}
            <View style={styles.customDiscountSection}>
              <ThemedText style={styles.customDiscountLabel}>Custom Discount Amount</ThemedText>
              <View
                style={[
                  styles.customDiscountInputContainer,
                  { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                <TextInput
                  style={[styles.customDiscountInput, { color: colors.text }]}
                  value={localCustomAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  testID="custom-discount-input"
                />
              </View>
            </View>

            {/* Discount Preview */}
            {(localSelectedIds.length > 0 || Number.parseFloat(localCustomAmount) > 0) && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Card
                  padding="md"
                  elevated
                  style={{ ...styles.previewCard, backgroundColor: colors.successBackground }}
                >
                  <View style={styles.previewRow}>
                    <ThemedText style={styles.previewLabel}>Original Amount</ThemedText>
                    <ThemedText style={styles.previewValue}>{formatPrice(billAmount)}</ThemedText>
                  </View>
                  <View style={styles.previewRow}>
                    <ThemedText style={[styles.previewLabel, { color: StatusColors.ready }]}>
                      Total Discount
                    </ThemedText>
                    <View style={styles.previewValueContainer}>
                      {isCalculating && (
                        <ActivityIndicator
                          size="small"
                          color={StatusColors.ready}
                          style={styles.calcSpinner}
                        />
                      )}
                      <ThemedText style={[styles.previewValue, { color: StatusColors.ready }]}>
                        -{formatPrice(totalDiscount)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.previewRow}>
                    <ThemedText style={styles.previewTotalLabel}>Final Amount</ThemedText>
                    <ThemedText style={[styles.previewTotalValue, { color: BrandColors.primary }]}>
                      {formatPrice(Math.max(0, billAmount - totalDiscount))}
                    </ThemedText>
                  </View>
                </Card>
              </Animated.View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            {(localSelectedIds.length > 0 || localCustomAmount) && (
              <Button
                variant="outline"
                onPress={handleClearAll}
                disabled={isApplying}
                style={styles.clearButton}
                testID="clear-discounts-btn"
              >
                Clear All
              </Button>
            )}
            <View style={styles.footerActions}>
              <Button
                variant="outline"
                onPress={onClose}
                disabled={isApplying}
                style={styles.footerButton}
                testID="cancel-discount-btn"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleApply}
                disabled={isApplying || !hasChanges}
                style={styles.footerButton}
                testID="apply-discount-btn"
              >
                {isApplying ? 'Applying...' : 'Apply Discounts'}
              </Button>
            </View>
          </View>
        </Animated.View>
      </View>
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
    padding: Spacing.lg,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footerButton: {
    minWidth: 100,
  },
  clearButton: {
    minWidth: 80,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  itemSeparator: {
    height: Spacing.sm,
  },
  discountItem: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  discountItemSelected: {
    borderWidth: 2,
  },
  discountItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountItemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  discountItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  discountItemDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  discountItemValue: {
    alignItems: 'flex-end',
    marginRight: Spacing.md,
  },
  discountValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  discountTypeText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderWidth: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skeletonContainer: {
    paddingVertical: Spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  errorContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    minWidth: 80,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  customDiscountSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  customDiscountLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  customDiscountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: Spacing.xs,
  },
  customDiscountInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  previewCard: {
    marginTop: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calcSpinner: {
    marginRight: Spacing.xs,
  },
  previewDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
